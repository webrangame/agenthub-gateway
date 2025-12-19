package main

import (
	"encoding/json"
	"fmt"
	"guardian-gateway/pkg/fastgraph/runtime"
	"guardian-gateway/pkg/llm"
	"guardian-gateway/pkg/session"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"golang.org/x/text/cases"
	"golang.org/x/text/language"

	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	_ "guardian-gateway/docs" // Import generated docs
)

// FeedItem represents a card in the Insight Stream
type FeedItem struct {
	ID         string                 `json:"id"`
	CardType   string                 `json:"card_type"`   // weather | safe_alert | cultural_tip | map_coord | article
	Priority   string                 `json:"priority"`    // high | medium | low
	Timestamp  string                 `json:"timestamp"`   // ISO 8601 timestamp
	SourceNode string                 `json:"source_node"` // ID of the agent node producing this item
	Data       map[string]interface{} `json:"data"`
}

var engine *runtime.Engine

// Atomic counter for unique IDs
var eventCounter int64

// Global Feed - Start empty, only show real agent output
var currentFeed = []*FeedItem{}

// nodeBuckets holds the latest FeedItem for each source node
var nodeBuckets = map[string]*FeedItem{}
var bucketMutex sync.Mutex

// @title           AiGuardian Gateway API
// @version         1.0
// @description     This is the gateway service for the AiGuardian application.
// @host            localhost:8080
// @BasePath        /

func main() {
	// Load .env file if it exists
	// Load .env file and OVERWRITE system env if present
	if err := godotenv.Overload(); err != nil {
		fmt.Println("INFO: No .env file found, relying on system env.")
	} else {
		fmt.Println("INFO: Loaded and overloaded config from .env")
	}

	// Init Engine
	engine = runtime.New()

	// Init Session Manager
	session.Init()

	r := gin.Default()

	// CORS Middleware
	// CORS Middleware
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowCredentials = true
	config.AddAllowHeaders("Authorization")
	r.Use(cors.New(config))

	// Health Check
	r.GET("/health", HealthHandler)

	// GET /api/feed
	r.GET("/api/feed", GetFeedHandler)

	// DELETE /api/feed
	r.DELETE("/api/feed", ClearFeedHandler)

	// POST /api/agent/upload
	r.POST("/api/agent/upload", UploadAgentHandler)

	// POST /api/chat/stream
	r.POST("/api/chat/stream", ChatStreamHandler)

	// Swagger Redirects
	r.GET("/docs", func(c *gin.Context) {
		c.Redirect(http.StatusMovedPermanently, "/swagger/index.html")
	})
	r.GET("/swagger", func(c *gin.Context) {
		c.Redirect(http.StatusMovedPermanently, "/swagger/index.html")
	})
	// Swagger Handler
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// Start Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	certPath := os.Getenv("SSL_CERT_PATH")
	keyPath := os.Getenv("SSL_KEY_PATH")

	if certPath != "" && keyPath != "" {
		fmt.Printf("Server starting on port %s (HTTPS)...\n", port)
		if err := r.RunTLS(":"+port, certPath, keyPath); err != nil {
			fmt.Printf("Fatal: Server failed to start (HTTPS): %v\n", err)
		}
	} else {
		fmt.Printf("Server starting on port %s (HTTP)...\n", port)
		if err := r.Run(":" + port); err != nil {
			fmt.Printf("Fatal: Server failed to start: %v\n", err)
		}
	}
}

func startScheduledExecution(agentPath string, schedule *runtime.ScheduleInfo) {
	interval, err := time.ParseDuration(schedule.Interval)
	if err != nil {
		fmt.Println("Error parsing interval:", err)
		return
	}

	fmt.Printf("SCHEDULE: Starting %s every %s\n", agentPath, schedule.Interval)
	ticker := time.NewTicker(interval)
	for range ticker.C {
		fmt.Println("SCHEDULE: Triggering proactive run...")
		fmt.Println("SCHEDULE: Triggering proactive run...")
		if err := engine.Run(agentPath, "Proactive Check", func(eventJSON string) {
			processAndAppendFeed(eventJSON, "")
		}); err != nil {
			fmt.Printf("Error running scheduled check for %s: %v\n", agentPath, err)
		}
	}
}

// Sticky Node State to associate orphaned chunks
var lastActiveNode string

func processAndAppendFeed(eventJSON string, destination string) {
	bucketMutex.Lock()
	defer bucketMutex.Unlock()

	fmt.Println("ENGINE EVENT:", eventJSON)

	// Parse the JSON event to extract a clean message
	var evt struct {
		Type    string `json:"type"`
		Message string `json:"message"`
		Node    string `json:"node"`
		Text    string `json:"text"` // Added 'text' field
	}

	message := eventJSON // fallback
	incomingNode := ""

	if err := json.Unmarshal([]byte(eventJSON), &evt); err == nil {
		// Prioritize 'text' field if present, then 'message'
		if evt.Text != "" {
			message = evt.Text
		} else if evt.Message != "" {
			message = evt.Message
		}

		if evt.Node != "" {
			incomingNode = evt.Node
			// STICKY LOGIC: If we are currently locked on "GenerateReport" (streaming large text),
			// don't let other intermittent nodes (like ReviewSummarizer) steal the sticky focus.
			// This ensures subsequent unnamed chunks (tokens) are still attributed to GenerateReport.
			if lastActiveNode != "GenerateReport" || evt.Node == "GenerateReport" {
				lastActiveNode = evt.Node
			}
		} else if evt.Type == "chunk" && lastActiveNode != "" {
			// If it's a chunk but has no node, assume it belongs to the previous stream
			incomingNode = lastActiveNode
		}
	}

	// Skip useless messages (Pass incomingNode to allow exceptions)
	if shouldSkipMessage(message, evt.Type, eventJSON, incomingNode) {
		return
	}

	// Default UI mapping
	cardType, priority, data := mapToCard(message, destination)

	// Try to extract node information from the message content (nested JSON)
	var nodeInfo struct {
		Node string `json:"node"`
		Text string `json:"text"`
	}
	var cleanText string

	// If Top-Level Node is empty, try to find it in the message
	if incomingNode == "" {
		if err := json.Unmarshal([]byte(message), &nodeInfo); err == nil && nodeInfo.Node != "" {
			incomingNode = nodeInfo.Node
			cleanText = nodeInfo.Text
			cardType, priority, data = mapToCard(cleanText, destination)
			data["source_node"] = incomingNode
		} else {
			cleanText = cleanMessage(message)
			data["summary"] = cleanText
		}
	} else {
		// If we already have a Node ID, just clean the text
		cleanText = cleanMessage(message)
		// Re-run mapToCard to get category/color for this specific Node Title (if matched)
		// But we need to leverage the known Node ID

		// If mapToCard didn't find a title by prefix, use the Node ID as title
		if t, ok := data["title"].(string); !ok || t == "" {
			data["title"] = incomingNode
		}

		// Map again with the Node Name as the Title to get the correct styling
		// We temporarily inject the Node Name as a title to mapToCard by faking a prefix?
		// Better: explicitly refine the card type based on incomingNode
		refineCardType(incomingNode, message, &cardType, &priority, data, destination)

		data["summary"] = cleanText
		data["source_node"] = incomingNode
	}

	// FILTER: If incomingNode is empty, check if mapToCard found a title
	if incomingNode == "" {
		if title, ok := data["title"].(string); ok && title != "" {
			incomingNode = title
			data["source_node"] = incomingNode
		}
	}

	// FILTER: Skip if no node ID/Name is specified
	if incomingNode == "" {
		return
	}

	// FILTER: Hide internal utility nodes from the public feed to prevent clutter
	if incomingNode == "ExtractDetails" || incomingNode == "ExtractCity" || incomingNode == "KnowledgeCheck" || incomingNode == "FetchReviews" {
		return
	}

	// ---------- MAP‑BASED BUCKET LOGIC ----------

	if existing, ok := nodeBuckets[incomingNode]; ok {
		// Calculate time since last update
		lastTime, err := time.Parse(time.RFC3339, existing.Timestamp)
		resetThreshold := 60 * time.Second // 1 minute of silence triggers a reset

		if err == nil && time.Since(lastTime) > resetThreshold {
			// RESET: It's been a while, so this is likely a NEW run. Start fresh.
			fmt.Printf("🔄 Resetting card for node %s (silence > %v)\n", incomingNode, resetThreshold)
			existing.Data["summary"] = cleanText
		} else {
			// APPEND: Continue adding to the current card
			lastSummary, _ := existing.Data["summary"].(string)
			existing.Data["summary"] = lastSummary + cleanText
		}

		existing.Timestamp = time.Now().Format(time.RFC3339)
		// DON'T return early - the existing pointer is already in currentFeed
		return
	}

	// No bucket – create a new FeedItem and store it
	uniqueID := atomic.AddInt64(&eventCounter, 1)
	if incomingNode != "" {
		data["title"] = incomingNode
	}
	newItem := FeedItem{
		ID:         fmt.Sprintf("evt-%d-%d", time.Now().UnixNano(), uniqueID),
		CardType:   cardType,
		Priority:   priority,
		Timestamp:  time.Now().Format(time.RFC3339),
		SourceNode: incomingNode,
		Data:       data,
	}

	// Store pointer in bucket map AND add pointer to feed
	itemPointer := &newItem
	if incomingNode != "" {
		nodeBuckets[incomingNode] = itemPointer
	}
	// Prepend to feed slice (most recent first) - using POINTER so updates propagate
	currentFeed = append([]*FeedItem{itemPointer}, currentFeed...)
}

func shouldSkipMessage(message, eventType, rawJSON, nodeName string) bool {
	// Skip truly empty messages, but allow whitespace (newlines/spaces) for formatting
	if message == "" {
		return true
	}

	// Skip ALL raw JSON logs (internal debug info)
	if eventType == "log" {
		// EXCEPTION: Allow logs from CheckWeather (it emits output as log)
		if nodeName == "CheckWeather" {
			return false
		}
		return true
	}
	// ... existing trivialPhrases ...

	// Skip trivial/system messages that don't add value
	trivialPhrases := []string{
		`{"type"`,              // Raw JSON
		"INIT",                 // System initialization
		"DEBUG",                // Debug logs
		"TRACE",                // Trace logs
		"null",                 // Null messages
		"undefined",            // Undefined messages
		"Error executing node", // Agent runtime errors
		"openai api error",     // LLM API errors
		"Bad Gateway",          // 502 errors
		"invalid character",    // JSON parsing errors
		"API key expired",      // Google Maps API errors
		"\"error\":",           // JSON error objects
		"\"code\": 400",        // Error codes
	}
	for _, phrase := range trivialPhrases {
		if strings.Contains(message, phrase) {
			return true
		}
	}

	// Skip horizontal lines and formatting characters
	formatChars := []string{
		"---",
		"___",
		"***",
		"<hr>",
		"</hr>",
		"─", // U+2500 Box Drawing Light Horizontal
		"━", // U+2501 Box Drawing Heavy Horizontal
		"═", // U+2550 Box Drawing Double Horizontal
	}
	for _, char := range formatChars {
		if strings.TrimSpace(message) == char {
			return true
		}
	}

	// Skip very short messages (likely not useful)
	// BUT: if this is a chunk with an identified node, allow short lines so we don't
	// lose headings/markers (the bucket logic will concatenate them).
	if eventType != "chunk" || nodeName == "" {
		if len(strings.TrimSpace(message)) < 15 {
			return true
		}
	}

	return false
}

func mapToCard(message string, destination string) (string, string, map[string]interface{}) {
	var cardType = "article"
	var priority = "medium"
	var data = map[string]interface{}{
		"summary": message,
	}

	// PREFIX DETECTION LOGIC
	// We check for "NodeName: Content" pattern
	prefixMap := map[string]string{
		"NewsAlert:":        "NewsAlert",
		"CheckWeather:":     "CheckWeather",
		"KnowledgeCheck:":   "KnowledgeCheck",
		"ReviewSummarizer:": "ReviewSummarizer",
		"GeniusLoci:":       "GeniusLoci",
		"GenerateReport:":   "GenerateReport",
	}

	for prefix, nodeTitle := range prefixMap {
		if strings.HasPrefix(strings.TrimSpace(message), prefix) || strings.Contains(message, prefix) {
			data["title"] = nodeTitle
			// Clean the message by removing the prefix
			cleanMsg := strings.Replace(message, prefix, "", 1)
			data["summary"] = strings.TrimSpace(cleanMsg)
			message = cleanMsg // Update for further processing
			break
		}
	}

	// CARD TYPE MAPPING (based on the now-known title or content)
	title, _ := data["title"].(string)

	if title == "NewsAlert" || contains(message, "SAFETY:") || contains(message, "Warning") {
		cardType = "safe_alert"
		priority = "high"
		data["message"] = data["summary"]
		data["level"] = "warning"
		data["category"] = "Safety"
		data["colorTheme"] = "red"
	} else if title == "CheckWeather" || contains(message, "Weather") {
		cardType = "weather"
		data["source"] = "Weather Agent"
		data["category"] = "Weather"
		data["colorTheme"] = "blue"
		data["imageUrl"] = "https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&w=800&q=80"
		data["description"] = data["summary"]
		data["temp"] = "22°C"
		data["location"] = "Destination"
		data["condition"] = "Cloudy"
		data["condition"] = "Cloudy"
		query := "weather sky"
		if destination != "" {
			query = destination + " weather sky"
		}
		fmt.Printf("DEBUG: Unsplash Weather Query: '%s' (Dest: '%s')\n", query, destination)
		if img, name, link := fetchUnsplashImage(query); img != "" {
			data["imageUrl"] = img
			data["imageUser"] = name
			data["imageUserLink"] = link
		} else {
			data["imageUrl"] = "https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&w=800&q=80"
		}
	} else if title == "GeniusLoci" || title == "KnowledgeCheck" || title == "ReviewSummarizer" {
		cardType = "cultural_tip"
		data["source"] = "Genius Loci"
		data["category"] = "Culture"
		data["colorTheme"] = "purple"
		query := "Sri Lanka travel culture"
		if destination != "" {
			query = destination + " culture travel"
		}
		fmt.Printf("DEBUG: Unsplash Culture Query: '%s' (Dest: '%s')\n", query, destination)
		if img, name, link := fetchUnsplashImage(query); img != "" {
			data["imageUrl"] = img
			data["imageUser"] = name
			data["imageUserLink"] = link
		} else {
			data["imageUrl"] = "https://images.unsplash.com/photo-1528642474498-1af0c17fd8c3?auto=format&fit=crop&w=800&q=80"
		}
	} else if title == "GenerateReport" {
		cardType = "article"
		data["source"] = "Final Synthesis"
		data["category"] = "Report"
		data["colorTheme"] = "green"
		query := "travel itinerary planner"
		if destination != "" {
			query = destination + " travel landscape"
		}
		fmt.Printf("DEBUG: Unsplash Report Query: '%s' (Dest: '%s')\n", query, destination)
		if img, name, link := fetchUnsplashImage(query); img != "" {
			data["imageUrl"] = img
			data["imageUser"] = name
			data["imageUserLink"] = link
		} else {
			data["imageUrl"] = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80"
		}
	}

	return cardType, priority, data
}

func refineCardType(title string, message string, cardType *string, priority *string, data map[string]interface{}, destination string) {
	if title == "NewsAlert" || contains(message, "SAFETY:") || contains(message, "Warning") {
		*cardType = "safe_alert"
		*priority = "high"
		data["message"] = data["summary"]
		data["level"] = "warning"
		data["category"] = "Safety"
		data["colorTheme"] = "red"
	} else if title == "CheckWeather" || contains(message, "Weather") {
		*cardType = "weather"
		data["source"] = "Weather Agent"
		data["category"] = "Weather"
		data["colorTheme"] = "blue"
		data["imageUrl"] = "https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&w=800&q=80"
		data["description"] = data["summary"]
		data["temp"] = "22°C"
		data["location"] = "Destination"
		data["condition"] = "Cloudy"
		data["condition"] = "Cloudy"
		query := "sky clouds weather"
		if destination != "" {
			query = destination + " weather"
		}
		if img, name, link := fetchUnsplashImage(query); img != "" {
			data["imageUrl"] = img
			data["imageUser"] = name
			data["imageUserLink"] = link
		} else {
			data["imageUrl"] = "https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&w=800&q=80"
		}
	} else if title == "GeniusLoci" || title == "KnowledgeCheck" || title == "ReviewSummarizer" {
		*cardType = "cultural_tip"
		data["source"] = "Genius Loci"
		data["category"] = "Culture"
		data["colorTheme"] = "purple"
		data["colorTheme"] = "purple"
		query := "Sri Lanka culture tradition"
		if destination != "" {
			query = destination + " culture tradition"
		}
		if img, name, link := fetchUnsplashImage(query); img != "" {
			data["imageUrl"] = img
			data["imageUser"] = name
			data["imageUserLink"] = link
		} else {
			data["imageUrl"] = "https://images.unsplash.com/photo-1528642474498-1af0c17fd8c3?auto=format&fit=crop&w=800&q=80"
		}
	} else if title == "GenerateReport" {
		*cardType = "article"
		data["source"] = "Final Synthesis"
		data["category"] = "Report"
		data["colorTheme"] = "green"
		data["colorTheme"] = "green"
		query := "travel landscape destination"
		if destination != "" {
			query = destination + " travel"
		}
		if img, name, link := fetchUnsplashImage(query); img != "" {
			data["imageUrl"] = img
			data["imageUser"] = name
			data["imageUserLink"] = link
		} else {
			data["imageUrl"] = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80"
		}
	}
}

// fetchUnsplashImage queries the Unsplash API for a random photo matching the query.
// It returns the photo URL, photographer name, and profile link (or empty strings).
func fetchUnsplashImage(query string) (string, string, string) {
	apiKey := os.Getenv("UNSPLASH_ACCESS_KEY")
	if apiKey == "" {
		return "", "", ""
	}

	// Construct URL
	// Endpoint: https://api.unsplash.com/photos/random
	// Params: query, orientation=landscape, count=1
	url := fmt.Sprintf("https://api.unsplash.com/photos/random?query=%s&orientation=landscape&client_id=%s",
		strings.ReplaceAll(query, " ", "%20"), apiKey)

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		fmt.Printf("⚠️ Unsplash API Error: %v\n", err)
		return "", "", ""
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		fmt.Printf("⚠️ Unsplash API Returned: %d\n", resp.StatusCode)
		return "", "", ""
	}

	var result struct {
		Urls struct {
			Regular string `json:"regular"`
			Small   string `json:"small"`
		} `json:"urls"`
		User struct {
			Name  string `json:"name"`
			Links struct {
				Html string `json:"html"`
			} `json:"links"`
		} `json:"user"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		fmt.Printf("⚠️ Unsplash Decode Error: %v\n", err)
		return "", "", ""
	}

	return result.Urls.Regular, result.User.Name, result.User.Links.Html
}

func cleanMessage(msg string) string {
	// Remove common prefixes
	prefixes := []string{
		"CheckWeather_output:", "GeniusLoci_output:", "NewsAlert_output:", "GenerateReport_output:", "output:", "result:",
		"SAFETY:", "CULTURE:", "REPORT:", "REVIEW:",
	}
	for _, p := range prefixes {
		msg = strings.ReplaceAll(msg, p, "")
	}
	return msg
}

func contains(s, substr string) bool {
	return strings.Contains(s, substr)
}

// HealthHandler godoc
// @Summary      Health Check
// @Description  Get service health status
// @Tags         system
// @Produce      json
// @Success      200  {object}  map[string]string
// @Router       /health [get]
func HealthHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "guardian-gateway"})
}

// GetFeedHandler godoc
// @Summary      Get Feed
// @Description  Get the current insight stream feed
// @Tags         feed
// @Produce      json
// @Success      200  {array}   FeedItem
// @Router       /api/feed [get]
func GetFeedHandler(c *gin.Context) {
	c.JSON(http.StatusOK, currentFeed)
}

// ClearFeedHandler godoc
// @Summary      Clear Feed
// @Description  Clear the insight stream feed
// @Tags         feed
// @Produce      json
// @Success      200  {object}  map[string]string
// @Router       /api/feed [delete]
func ClearFeedHandler(c *gin.Context) {
	bucketMutex.Lock()
	defer bucketMutex.Unlock()

	currentFeed = []*FeedItem{}
	nodeBuckets = make(map[string]*FeedItem)
	lastActiveNode = ""

	fmt.Println("Feed and buckets cleared")
	c.JSON(http.StatusOK, gin.H{"status": "cleared", "message": "Feed has been reset"})
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
func UploadAgentHandler(c *gin.Context) {
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
	meta, err := engine.Inspect(savePath)
	if err != nil {
		// Fallback if inspection fails (old binary or bad agent)
		fmt.Println("Warning: Inspection failed:", err)
		meta = &runtime.AgentMetadata{Name: "Unknown Agent"}
	}

	// Start Scheduled Execution if present
	if meta.Schedule != nil && meta.Schedule.Mode == "proactive" {
		go startScheduledExecution(savePath, meta.Schedule)
	}

	// Initial Run (Reactive) - REMOVED per user request to wait for first prompt
	// go func() {
	// 	if err := engine.Run(savePath, "Start Analysis", func(eventJSON string) {
	// 		processAndAppendFeed(eventJSON)
	// 	}); err != nil {
	// 		fmt.Printf("Error running initial analysis for %s: %v\n", savePath, err)
	// 	}
	// }()

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
// function variable for testing
var GenerateContentFunc = llm.GenerateContent

func ChatStreamHandler(c *gin.Context) {
	var req struct {
		Input     string `json:"input"`
		AgentPath string `json:"agent_path"`
	}
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// 1. Get Session
	clientID := c.ClientIP()
	sess := session.GlobalManager.GetOrCreate(clientID)

	// 2. Append User Message
	sess.AppendMessage("user", req.Input)

	// 3. Gateway Brain Logic (Gemini)
	// Construct history context
	history := sess.GetHistory()
	vars := sess.GetVariables()
	varsJSON, _ := json.MarshalIndent(vars, "", "  ")

	// Check State
	isPostReport := sess.State == session.StatePostReport

	systemMsg := fmt.Sprintf(`You are the "Guardian Assistant" for Trip Guardian.

CURRENT STATE:
- Known Variables: %s
- Report Generated: %v

GOAL: 
- If Report Generated = false: Collect MANDATORY data.
- If Report Generated = true: Chat naturally. Do NOT run agent again unless explicitly asked.

SAFETY RAILS (ALWAYS ACTIVE):
1. OFF-LIMITS: Medical advice, Legal advice, Violence/Hate speech.
   - Response: "I cannot help with that. I am only a travel assistant."
2. PERSONA: Stay in character as a helpful Travel Guardian.

TIER 1 (MANDATORY - BLOCKER):
- Destination (City/Location)
- Start Date (When?)
- Duration (How long?)
- Arrival/Departure Times (Time?)

TIER 2 (OPTIONAL - ASK ONCE):
- Specific Venues, Budget, Interests, Mode

INSTRUCTIONS:
1. Analyze conversation.
2. If new info is found, output: UPDATE_STATE: Key=Value
3. LOGIC:
   [IF Report Generated = FALSE]
   - If Tier 1 MISSING -> ACTION: ASK_QUESTION <Specific Question>
   - If Tier 1 COMPLETE but Tier 2 unknown -> ACTION: ASK_QUESTION <Polite inquiry>
   - If User says "skip" or Tier 2 present -> ACTION: RUN_AGENT SUMMARY: [Context]

   [IF Report Generated = TRUE]
   - MODE: Conversational. Do NOT run agent automatically.
   - If user changes preferences (e.g. "I hate museums"):
     1. UPDATE_STATE: Interests=No Museums
     2. ACTION: ASK_QUESTION "Got it. I've updated your preferences. Should I regenerate the itinerary?"
   - If user explicitly asks ("Yes", "Run again", "Update"):
     -> ACTION: RUN_AGENT SUMMARY: [Context]
   - Otherwise (General chat, follow-ups):
     -> ACTION: ASK_QUESTION <Natural Reply>

4. Format:
UPDATE_STATE: Key=Value
ACTION: ...`, string(varsJSON), isPostReport)

	fmt.Printf("GATEWAY: Thinking... (History: %d msgs)\n", len(history))
	decision, err := GenerateContentFunc(convertHistory(history), systemMsg)

	// Default fallback
	action := "ACTION: ASK_QUESTION Sorry, I am having trouble thinking right now."

	if err == nil {
		decision = strings.TrimSpace(decision)
		lines := strings.Split(decision, "\n")

		// Parse State Updates
		updates := make(map[string]string)
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if strings.HasPrefix(line, "UPDATE_STATE:") {
				parts := strings.SplitN(line, ":", 2)
				if len(parts) == 2 {
					kv := strings.SplitN(strings.TrimSpace(parts[1]), "=", 2)
					if len(kv) == 2 {
						// Normalize key to Title Case to match strict prompt expectations
						key := cases.Title(language.English).String(strings.ToLower(strings.TrimSpace(kv[0])))
						updates[key] = strings.TrimSpace(kv[1])
					}
				}
			} else if strings.Contains(line, "ACTION:") {
				action = line // Capture the action line
			}
		}

		// Apply updates to session
		if len(updates) > 0 {
			sess.UpdateVariables(updates)
			fmt.Printf("GATEWAY UPDATED STATE: %v\n", updates)
		}

		// Fallback: If no ACTION was found but we have valid text, treat it as a question/response
		// Check against default fallback to ensure we actually captured something new
		if action == "ACTION: ASK_QUESTION Sorry, I am having trouble thinking right now." && len(decision) > 0 {
			// Filter out update lines to find the "talk" part
			var speechParts []string
			for _, line := range lines {
				if !strings.HasPrefix(strings.TrimSpace(line), "UPDATE_STATE:") && strings.TrimSpace(line) != "" {
					speechParts = append(speechParts, line)
				}
			}
			if len(speechParts) > 0 {
				cleanSpeech := strings.Join(speechParts, "\n")
				action = "ACTION: ASK_QUESTION " + cleanSpeech
			}
		}
	} else {
		// Log actual error for admin
		fmt.Printf("GATEWAY ERROR: %v\n", err)
		// Friendly message for user
		action = "ACTION: ASK_QUESTION I'm currently experiencing high traffic or a temporary system issue. Please try again in a moment."
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
		// This replaces reliance on the LLM's "SUMMARY" which can be flaky or hallucinated.
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
		c.SSEvent("chunk", `{"node": "Guardian Assistant:", "text": "Great! I have everything I need. Running Trip Guardian now..."}`)
		c.Writer.Flush()

		// Prepare Accumulator
		var fullOutput strings.Builder
		var mu sync.Mutex

		// Reset Stream State
		bucketMutex.Lock()
		nodeBuckets = map[string]*FeedItem{}
		lastActiveNode = ""
		bucketMutex.Unlock()

		// Run Agent
		err := engine.Run(agentPath, agentInput, func(eventJSON string) {
			fmt.Println("RAW FASTGRAPH EVENT:", eventJSON)
			mu.Lock()
			defer mu.Unlock()

			// Feed Update
			// Robust Destination Lookup
			dest := vars["Destination"]
			if dest == "" {
				dest = vars["destination"] // Try lowercase fallback
			}
			fmt.Printf("DEBUG: Feed Update - Destination: '%s'\n", dest)
			processAndAppendFeed(eventJSON, dest)

			// Stream to Client
			c.SSEvent("message", eventJSON)
			c.Writer.Flush()

			// Accumulate for Done
			fullOutput.WriteString(extractTextFromEvent(eventJSON))
		})

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

// Helper to convert session history to map format for LLM
func convertHistory(hist []session.Message) []map[string]interface{} {
	var res []map[string]interface{}
	for _, m := range hist {
		res = append(res, map[string]interface{}{
			"role":    m.Role,
			"content": m.Content,
		})
	}
	return res
}

// Helper to extract text from event JSON
func extractTextFromEvent(eventJSON string) string {
	var evt struct {
		Message string `json:"message"`
	}
	if err := json.Unmarshal([]byte(eventJSON), &evt); err == nil {
		var nodeInfo struct {
			Text string `json:"text"`
		}
		if err := json.Unmarshal([]byte(evt.Message), &nodeInfo); err == nil && nodeInfo.Text != "" {
			return nodeInfo.Text
		}
		return evt.Message
	}
	return ""
}
