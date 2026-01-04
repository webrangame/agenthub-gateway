package api

import (
	"encoding/json"
	"fmt"
	"guardian-gateway/pkg/fastgraph/runtime"
	"guardian-gateway/pkg/logic"
	"guardian-gateway/pkg/session"
	"guardian-gateway/pkg/store"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/text/cases"
	"golang.org/x/text/language"
)

// HealthHandler godoc
// @Summary      Health Check
// @Description  Get service health status
// @Tags         system
// @Produce      json
// @Success      200  {object}  map[string]string
// @Router       /health [get]
func (s *Server) HealthHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "guardian-gateway"})
}

// GetFeedHandler godoc
// @Summary      Get Feed
// @Description  Get the current insight stream feed
// @Tags         feed
// @Produce      json
// @Success      200  {array}   FeedItem
// @Router       /api/feed [get]
func (s *Server) GetFeedHandler(c *gin.Context) {
	// Identify User
	// Identify User (Hybrid: Auth User > Device > IP)
	ownerID := c.GetHeader("X-User-ID")
	if ownerID == "" {
		ownerID = c.GetHeader("X-Device-ID")
	}
	if ownerID == "" {
		ownerID = c.ClientIP()
	}

	if s.Store == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB not initialized"})
		return
	}

	feed, err := s.Store.GetFeed(c.Request.Context(), ownerID, 50)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch feed"})
		return
	}
	c.JSON(http.StatusOK, feed)
}

// ClearFeedHandler godoc
// @Summary      Clear Feed
// @Description  Clear the insight stream feed
// @Tags         feed
// @Produce      json
// @Success      200  {object}  map[string]string
// @Router       /api/feed [delete]
func (s *Server) ClearFeedHandler(c *gin.Context) {
	// Identify User
	ownerID := c.GetHeader("X-User-ID")
	if ownerID == "" {
		ownerID = c.GetHeader("X-Device-ID")
	}
	if ownerID == "" {
		ownerID = c.ClientIP()
	}

	fmt.Printf("DEBUG ClearFeed: Attempting to delete for ownerID='%s'\n", ownerID)
	fmt.Printf("DEBUG ClearFeed: X-User-ID='%s', X-Device-ID='%s', ClientIP='%s'\n",
		c.GetHeader("X-User-ID"), c.GetHeader("X-Device-ID"), c.ClientIP())

	if s.Store == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB not initialized"})
		return
	}

	if err := s.Store.DeleteFeed(c.Request.Context(), ownerID); err != nil {
		fmt.Printf("Error clearing feed for %s: %v\n", ownerID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clear feed"})
		return
	}

	fmt.Printf("INFO: Feed cleared for %s\n", ownerID)
	c.JSON(http.StatusOK, gin.H{"status": "cleared", "message": "Feed cleared"})
}

// UploadAgentHandler godoc
// @Summary      Upload Agent
// @Description  Upload an agent file (.m or .zip)
// @Tags         agent
// @Accept       multipart/form-data
// @Produce      json
// @Param        file  formData  file  true  "Agent File"
// @Success      200   {object}  map[string]interface{}
// @Failure      400   {object}  map[string]string
// @Failure      500   {object}  map[string]string
// @Router       /api/agent/upload [post]
func (s *Server) UploadAgentHandler(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	filename := "uploaded_" + file.Filename
	savePath := filepath.Join(".", filename)
	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// Inspect Agent
	meta, err := s.Engine.Inspect(savePath)
	if err != nil {
		// Fallback if inspection fails (old binary or bad agent)
		fmt.Println("Warning: Inspection failed:", err)
		meta = &runtime.AgentMetadata{Name: "Unknown Agent"}
	}

	// Start Scheduled Execution if present
	if meta.Schedule != nil && meta.Schedule.Mode == "proactive" {
		go s.StartScheduledExecution(savePath, meta.Schedule)
	}

	c.JSON(http.StatusOK, gin.H{
		"status":       "success",
		"message":      "Agent uploaded and execution started",
		"filename":     filename,
		"capabilities": meta.Capabilities,
		"schedule":     meta.Schedule,
	})
}

// ChatStreamHandler godoc
// @Summary      Chat with Agent (Streaming)
// @Description  Send a message to an agent and stream the response via SSE
// @Tags         chat
// @Accept       json
// @Produce      text/event-stream
// @Param        request body      object  true  "Chat Request"
// @Success      200     {string}  string  "SSE Stream"
// @Failure      400     {object}  map[string]string
// @Router       /api/chat/stream [post]
func (s *Server) ChatStreamHandler(c *gin.Context) {
	var req struct {
		Input        string `json:"input"`
		AgentPath    string `json:"agent_path"`
		ClientTime   string `json:"client_time"`   // ISO string or human readable
		UserLocation string `json:"user_location"` // "City, Country"
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// 1. Get Session Key (Use Hybrid Identity)
	sessionKey := c.GetHeader("X-User-ID")
	if sessionKey == "" {
		sessionKey = c.GetHeader("X-Device-ID")
	}
	if sessionKey == "" {
		sessionKey = c.ClientIP()
	}
	sess := session.GlobalManager.GetOrCreate(sessionKey)

	// 2. Append User Message
	sess.AppendMessage("user", req.Input)

	// 3. Gateway Brain Logic (Gemini)
	// Construct history context
	history := sess.GetHistory()
	vars := sess.GetVariables()
	varsJSON, _ := json.MarshalIndent(vars, "", "  ")

	// Check State
	isPostReport := sess.State == session.StatePostReport

	// Prepare Context Strings
	timeContext := req.ClientTime
	if timeContext == "" {
		timeContext = time.Now().Format("15:04 (Server Time)")
	}
	locContext := req.UserLocation
	if locContext == "" {
		locContext = "Unknown"
	}

	// System Prompt with JSON Schema AND Context
	systemMsg := fmt.Sprintf(`You are the "Trip Guardian & Tour Planner".
Your goal is to be a helpful, fun, and protective travel companion.

CONTEXT:
- Current User Time: %s
- User Location: %s
- Known Variables: %s
- Report Generated: %v

CORE PHILOSOPHY (The "Safe-Guide" Approach):
1. **BE A GUIDE**: Suggest itineraries, food, and venues when asked.
2. **BE A GUARDIAN**: Every recommendation MUST include a contextual safety tip (e.g., "Great food, but watch for pickpockets in that crowd.").

SAFETY RAILS:
1. OFF-LIMITS: Medical/Legal advice, Violence/Hate speech.
2. PERSONA: Enthusiastic but **CONCISE**. Save tokens. Avoid flowery language.

TIER 1 (MANDATORY for Deep Reports):
- Destination, StartDate, Duration.
*NOTE: You may still chat and give Advice even if these are missing. Gently nudge the user to provide them eventually.*

INSTRUCTIONS:
1. Analyze conversation using Time/Location context.
2. EXTRACT new details into 'updates' object.
3. **TOKEN EFFICIENCY**: If the user just states their location (e.g., "I'm in Paris"), update 'Destination' but respond with a BRIEF acknowledgment only (e.g., "Noted, Paris."). Do NOT generate a guide unless explicitly asked.

Output a JSON object:
{
  "updates": { "Destination": "Paris", "StartDate": "Tomorrow" },
  "action": "ASK_QUESTION" | "RUN_AGENT",
  "content": "The text to speak to the user or the summary for the agent"
}

LOGIC:
- If user asks for recommendations -> { "action": "ASK_QUESTION", "content": "Plan + Safety Tip" }
- If basic details provided & user wants a full safety audit -> { "action": "RUN_AGENT", "content": "I'm performing a comprehensive safety scan for your trip. Check the Insight Stream tab for details." }
- If Report Generated = TRUE -> Conversational mode.
  - Unless user explicitly asks to run again -> "RUN_AGENT"

RESPONSE MUST BE VALID JSON ONLY.`, timeContext, locContext, string(varsJSON), isPostReport)

	// Get or Generate Per-User LiteLLM Key
	userID := c.GetHeader("X-User-ID")
	var litellmApiKey string

	if userID != "" && s.Store != nil {
		// Try to get existing key from database
		key, err := s.Store.GetUserLiteLLMKey(c.Request.Context(), userID)
		if err != nil {
			fmt.Printf("⚠️ Error fetching user key: %v\n", err)
		}

		if key == "" {
			// Generate new key for this user
			fmt.Printf("🔑 Generating new LiteLLM key for user: %s\n", userID)
			proxyURL := os.Getenv("LITELLM_PROXY_URL")
			masterKey := os.Getenv("LITELLM_MASTER_KEY")

			if proxyURL != "" && masterKey != "" {
				newKey, keyName, err := store.GenerateLiteLLMKey(proxyURL, masterKey, userID, 10.00)
				if err != nil {
					fmt.Printf("❌ Failed to generate key: %v\n", err)
				} else {
					// Store the new key
					if err := s.Store.StoreUserLiteLLMKey(c.Request.Context(), userID, newKey, keyName, 10.00); err != nil {
						fmt.Printf("❌ Failed to store key: %v\n", err)
					} else {
						litellmApiKey = newKey
						fmt.Printf("✅ Generated and stored key: %s\n", keyName)
					}
				}
			}
		} else {
			litellmApiKey = key
			fmt.Printf("✅ Using existing key for user: %s\n", userID)
		}
	}

	// Fallback: Check if client sent their own key (for development/testing)
	if litellmApiKey == "" {
		litellmApiKey = c.GetHeader("X-LiteLLM-API-Key")
		if litellmApiKey != "" {
			fmt.Println("ℹ️ Using client-provided LiteLLM key")
		}
	}

	fmt.Printf("GATEWAY: Thinking... (History: %d msgs)\n", len(history))
	if litellmApiKey != "" {
		fmt.Printf("GATEWAY: Using LiteLLM API Key\n")
	}
	decisionResponse, err := s.GenerateContentFunc(convertHistory(history), systemMsg, litellmApiKey)
	fmt.Printf("GATEWAY RAW RESPONSE: %s\n", decisionResponse)

	// Default fallback variables
	var action string
	var content string // Used for fallback messages
	var updates map[string]string

	if err == nil {
		// Clean response (remove markdown blocks if any)
		decisionResponse = strings.TrimSpace(decisionResponse)
		if strings.HasPrefix(decisionResponse, "```json") {
			decisionResponse = strings.TrimPrefix(decisionResponse, "```json")
			decisionResponse = strings.TrimSuffix(decisionResponse, "```")
		}
		decisionResponse = strings.TrimSpace(decisionResponse)

		// Parse JSON
		var decisionObj struct {
			Updates map[string]string `json:"updates"`
			Action  string            `json:"action"`
			Content string            `json:"content"`
		}

		if jsonErr := json.Unmarshal([]byte(decisionResponse), &decisionObj); jsonErr == nil {
			updates = decisionObj.Updates

			// If the LLM just returns raw Action enum, map it to the string the code expects below
			if decisionObj.Action == "RUN_AGENT" {
				action = "ACTION: RUN_AGENT SUMMARY: " + decisionObj.Content
			} else {
				action = "ACTION: ASK_QUESTION " + decisionObj.Content
			}

			// Apply updates to session
			if len(updates) > 0 {
				normalizedUpdates := make(map[string]string)
				for k, v := range updates {
					key := cases.Title(language.English).String(strings.ToLower(strings.TrimSpace(k)))
					normalizedUpdates[key] = strings.TrimSpace(v)
				}
				sess.UpdateVariables(normalizedUpdates)
				fmt.Printf("GATEWAY UPDATED STATE: %v\n", normalizedUpdates)
			}
		} else {
			fmt.Printf("GATEWAY PARSE ERROR: %v (Response: %s)\n", jsonErr, decisionResponse)
			// Fallback: If JSON fails, treat entire text as explanation
			content = decisionResponse
			action = "ACTION: ASK_QUESTION " + content
		}
	} else {
		// Log actual error for admin
		fmt.Printf("GATEWAY ERROR: %v\n", err)
		// Friendly message for user
		content = "I'm currently experiencing high traffic or a temporary system issue. Please try again in a moment."
		action = "ACTION: ASK_QUESTION " + content
	}
	fmt.Println("GATEWAY DECISION:", action)

	// Set SSE headers
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Flush()

	// 4. Act on Decision
	if strings.Contains(action, "ACTION: RUN_AGENT") {
		// Set state to POST_REPORT to prevent auto-retriggering
		sess.SetState(session.StatePostReport)

		// Construct robust agent input from Session Variables + System Time
		vars := sess.GetVariables()
		inputBuilder := strings.Builder{}
		inputBuilder.WriteString(fmt.Sprintf("Current System Date: %s.\n", time.Now().Format("2006-01-02")))
		inputBuilder.WriteString("Trip Details:\n")
		for k, v := range vars {
			inputBuilder.WriteString(fmt.Sprintf("- %s: %s\n", k, v))
		}
		// Append the actual user input just in case context is needed, but variables are primary.
		inputBuilder.WriteString(fmt.Sprintf("\nUser Note: %s", req.Input))

		agentInput := inputBuilder.String()
		fmt.Printf("GATEWAY: Running Agent with Synthesized Input:\n%s\n", agentInput)

		// --- RUN AGENT PATH ---
		sess.AppendMessage("model", "Starting Trip Guardian analysis...")

		// Determine Agent Path (Legacy Logic)
		agentPath := req.AgentPath
		if agentPath == "" {
			defaultAgent := "agents/trip-guardian/trip_guardian_v3.m"
			if matches, _ := filepath.Glob(defaultAgent); len(matches) > 0 {
				agentPath = defaultAgent
			} else if matches, _ := filepath.Glob("uploaded_*.m"); len(matches) > 0 {
				agentPath = matches[0]
			}
		}

		if agentPath == "" {
			c.SSEvent("error", "No agent found. Upload one first.")
			return
		}

		// Notify User
		c.SSEvent("chunk", `{"node": "Guardian Assistant:", "text": "Great! I have everything I need. I'm performing a comprehensive safety scan for your trip. Check the Insight Stream tab for details."}`)
		c.Writer.Flush()

		// Prepare Accumulator
		var fullOutput strings.Builder
		var mu sync.Mutex
		nodeAccumulators := make(map[string]string)
		nodeImages := make(map[string]string) // Cache for Unsplash images
		currentAccumulatingNode := ""
		var finalDest string // Capture destination for final flush

		// Run Agent
		err := s.Engine.Run(agentPath, agentInput, LoadMemoryConfig(), func(eventJSON string) {
			fmt.Println("RAW FASTGRAPH EVENT:", eventJSON)
			mu.Lock()
			defer mu.Unlock()

			// Feed Update
			// Robust Destination Lookup
			dest := vars["Destination"]
			if dest == "" {
				dest = vars["destination"] // Try lowercase fallback
			}
			finalDest = dest // Capture for final flush
			fmt.Printf("DEBUG: Feed Update - Destination: '%s'\n", dest)

			// ACCUMULATION LOGIC:
			// Parse event to extract content and node
			var evt struct {
				Node    string `json:"node"`
				Message string `json:"message"`
				Text    string `json:"text"`
				Type    string `json:"type"`
			}
			// Best effort parse
			_ = json.Unmarshal([]byte(eventJSON), &evt)

			content := evt.Message
			if content == "" {
				content = evt.Text
			}

			// Update Current Node Context if explicit
			if evt.Node != "" {
				currentAccumulatingNode = evt.Node
			}

			// If we have a current node context and content, accumulate and send FULL content
			if currentAccumulatingNode != "" && content != "" {
				nodeAccumulators[currentAccumulatingNode] += content

				// Construct Synthetic Event with FULL accumulated content
				// This ensures the DB Upsert replaces the card with the COMPLETE text so far
				fullEventObj := map[string]string{
					"type":    evt.Type, // Use original type (chunk)
					"node":    currentAccumulatingNode,
					"message": nodeAccumulators[currentAccumulatingNode],
				}
				// Default type to chunk if missing
				if fullEventObj["type"] == "" {
					fullEventObj["type"] = "chunk"
				}

				if fullEventBytes, err := json.Marshal(fullEventObj); err == nil {
					s.ProcessAndSaveFeed(c.Request.Context(), sessionKey, string(fullEventBytes), dest, nodeImages)
				}
			} else {
				// Fallback for system events (like done/error) or chunks before any node is seen
				s.ProcessAndSaveFeed(c.Request.Context(), sessionKey, eventJSON, dest, nodeImages)
			}

			// Stream to Client (Send ORIGINAL chunk)
			c.SSEvent("message", eventJSON)
			c.Writer.Flush()

			// Accumulate for Done
			fullOutput.WriteString(logic.ExtractTextFromEvent(eventJSON))
		})

		// --- FINAL CONSISTENCY FLUSH ---
		// Ensure all accumulated nodes are saved in their final state
		fmt.Println("DEBUG: Performing Final Consistency Flush of all cards...")
		mu.Lock() // Safe access to nodeAccumulators
		for node, content := range nodeAccumulators {
			if node != "" && content != "" {
				// Re-construct the full event structure
				fullEventObj := map[string]string{
					"type":    "chunk",
					"node":    node,
					"message": content,
				}
				if fullEventBytes, err := json.Marshal(fullEventObj); err == nil {
					// Use the existing ProcessAndSaveFeed logic which handles MapToCard, DB upsert, etc.
					s.ProcessAndSaveFeed(c.Request.Context(), sessionKey, string(fullEventBytes), finalDest, nodeImages)
				}
			}
		}
		mu.Unlock()
		// -------------------------------

		if err != nil {
			c.SSEvent("error", err.Error())
		}

		sess.AppendMessage("model", "Report generated.")

		// Emit Done
		doneData := map[string]string{"output": fullOutput.String()}
		if doneBytes, err := json.Marshal(doneData); err == nil {
			c.SSEvent("done", string(doneBytes))
		}

	} else {
		// --- ASK QUESTION PATH ---
		question := strings.TrimPrefix(action, "ACTION: ASK_QUESTION ")
		question = strings.TrimSpace(question)

		sess.AppendMessage("model", question)

		// Stream the question as a "Guardian Assistant" node message
		msgObj := map[string]string{
			"node": "Guardian Assistant:",
			"text": question,
		}
		chunkBytes, _ := json.Marshal(msgObj)
		c.SSEvent("chunk", string(chunkBytes))
		c.Writer.Flush()

		// Done immediately
		c.SSEvent("done", `{"output": "Question asked"}`)
	}
}

// convertHistory Helper to convert session history to map format for LLM
func convertHistory(hist []session.Message) []map[string]interface{} {
	var result []map[string]interface{}
	for _, msg := range hist {
		result = append(result, map[string]interface{}{
			"role":    msg.Role,
			"content": msg.Content,
		})
	}
	return result
}
