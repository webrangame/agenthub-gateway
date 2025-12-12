package main

import (
	"encoding/json"
	"fmt"
	"guardian-gateway/pkg/fastgraph/runtime"
	"net/http"
	"path/filepath"
	"strings"
	"sync/atomic"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

// FeedItem represents a card in the Insight Stream
type FeedItem struct {
	ID        string                 `json:"id"`
	CardType  string                 `json:"card_type"` // weather | safe_alert | cultural_tip | map_coord | article
	Priority  string                 `json:"priority"`  // high | medium | low
	Timestamp string                 `json:"timestamp"` // ISO 8601 timestamp
	Data      map[string]interface{} `json:"data"`
}

var engine *runtime.Engine

// Atomic counter for unique IDs
var eventCounter int64

// Global Feed - Start empty, only show real agent output
var currentFeed = []FeedItem{}

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

	r := gin.Default()

	// CORS Middleware
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")
		c.Writer.Header().Set("Referrer-Policy", "no-referrer-when-downgrade")
		c.Writer.Header().Set("X-Content-Type-Options", "nosniff")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Health Check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "guardian-gateway"})
	})

	// GET /api/feed
	r.GET("/api/feed", func(c *gin.Context) {
		c.JSON(http.StatusOK, currentFeed)
	})

	// DELETE /api/feed
	r.DELETE("/api/feed", func(c *gin.Context) {
		currentFeed = []FeedItem{}
		fmt.Println("Feed cleared")
		c.JSON(http.StatusOK, gin.H{"status": "cleared", "message": "Feed has been reset"})
	})

	// POST /api/agent/upload
	r.POST("/api/agent/upload", func(c *gin.Context) {
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

		// Initial Run (Reactive)
		go func() {
			engine.Run(savePath, "Start Analysis", func(eventJSON string) {
				processAndAppendFeed(eventJSON)
			})
		}()

		c.JSON(http.StatusOK, gin.H{
			"status":       "success",
			"message":      "Agent uploaded and execution started",
			"filename":     filename,
			"capabilities": meta.Capabilities,
			"schedule":     meta.Schedule,
		})
	})

	// POST /api/chat/stream
	r.POST("/api/chat/stream", func(c *gin.Context) {
		var req struct {
			Message   string `json:"message"`
			AgentPath string `json:"agent_path"` // Optional, defaults to latest uploaded?
		}
		if err := c.BindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
			return
		}

		// For now, assume a single active agent or pass path.
		// If path empty, find first .m or .zip in root?
		agentPath := req.AgentPath
		if agentPath == "" {
			// Default to trip_guardian.m if available
			defaultAgent := "agents/trip-guardian/trip_guardian.m"
			if _, err := filepath.Abs(defaultAgent); err == nil {
				// Check if file exists
				if _, err := filepath.Glob(defaultAgent); err == nil {
					agentPath = defaultAgent
				}
			}
			
			// Fallback: pick the last uploaded one
			if agentPath == "" {
				matches, _ := filepath.Glob("uploaded_*.m")
				if len(matches) > 0 {
					agentPath = matches[0]
				} else {
					// Try zip
					zipMatches, _ := filepath.Glob("uploaded_*.zip")
					if len(zipMatches) > 0 {
						agentPath = zipMatches[0]
					}
				}
			}
		}

		if agentPath == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No agent found. Upload one first."})
			return
		}

		// Set SSE headers
		c.Writer.Header().Set("Content-Type", "text/event-stream")
		c.Writer.Header().Set("Cache-Control", "no-cache")
		c.Writer.Header().Set("Connection", "keep-alive")
		c.Writer.Flush()

		// Run Agent and Stream
		err := engine.Run(agentPath, req.Message, func(eventJSON string) {
			// Broadcast to Feed as well? Maybe yes, so history is kept.
			// But for chat, we might want direct response.
			// Let's do BOTH: Update feed AND stream to client.
			processAndAppendFeed(eventJSON)

			// Parse to see if it's a message chunk or just internal event
			// For simplicity, stream everything as data
			c.SSEvent("message", eventJSON)
			c.Writer.Flush()
		})

		if err != nil {
			c.SSEvent("error", err.Error())
		}
		c.SSEvent("done", "true")
	})

	// Start Server
	r.Run(":8081")
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
		engine.Run(agentPath, "Proactive Check", func(eventJSON string) {
			processAndAppendFeed(eventJSON)
		})
	}
}

func processAndAppendFeed(eventJSON string) {
	fmt.Println("ENGINE EVENT:", eventJSON)

	// Parse the JSON event to extract a clean message
	var evt struct {
		Type    string `json:"type"`
		Message string `json:"message"`
	}

	message := eventJSON // Default fallback
	if err := json.Unmarshal([]byte(eventJSON), &evt); err == nil {
		if evt.Message != "" {
			message = evt.Message
		}
	}

	// FILTER OUT USELESS MESSAGES calls
	if shouldSkipMessage(message, evt.Type, eventJSON) {
		return
	}

	// Heuristic Mapping for "Nicer" UI
	cardType, priority, data := mapToCard(message)

	// Generate truly unique ID to avoid collision in fast loops
	uniqueID := atomic.AddInt64(&eventCounter, 1)
	newItem := FeedItem{
		ID:        fmt.Sprintf("evt-%d-%d", time.Now().UnixNano(), uniqueID),
		CardType:  cardType,
		Priority:  priority,
		Timestamp: time.Now().Format(time.RFC3339),
		Data:      data,
	}
	// Prepend to feed
	currentFeed = append([]FeedItem{newItem}, currentFeed...)
}

func shouldSkipMessage(message, eventType, rawJSON string) bool {
	// Skip empty messages
	if strings.TrimSpace(message) == "" {
		return true
	}

	// Skip raw JSON logs (they're internal debug info, not user-facing)
	if eventType == "log" && (message == "" || message == rawJSON) {
		return true
	}

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
		"###",
		"***",
		"<hr>",
		"</hr>",
		"─", // U+2500 Box Drawing Light Horizontal
		"━", // U+2501 Box Drawing Heavy Horizontal
		"═", // U+2550 Box Drawing Double Horizontal
	}
	for _, char := range formatChars {
		if strings.TrimSpace(message) == char || strings.Contains(message, char) {
			return true
		}
	}

	// Skip very short messages (likely not useful)
	if len(strings.TrimSpace(message)) < 15 {
		return true
	}

	return false
}

func mapToCard(message string) (string, string, map[string]interface{}) {
	var cardType = "article"
	var priority = "medium"
	var data = map[string]interface{}{
		"summary": message,
	}

	// Default Title and Metadata
	data["title"] = "Agent Activity"
	data["source"] = "System"
	data["category"] = "Tips"
	data["colorTheme"] = "default"

	// 1. Safety Alerts (NewsAlert)
	if contains(message, "SAFETY:") || contains(message, "NB:") || contains(message, "Safety Briefing") || contains(message, "NewsAlert_output") || contains(message, "Warning") || contains(message, "Alert") {
		cardType = "safe_alert"
		priority = "high"
		data = map[string]interface{}{
			"message": cleanMessage(message),
			"level":   "warning",
		}
	} else if contains(message, "Weather") || contains(message, "CheckWeather_output") || contains(message, "Sky Watch") {
		// 2. Weather (Text Mode) - Use Article but styled as Weather Report
		cardType = "weather"
		data["title"] = "Sky Watch"
		data["source"] = "Weather Agent"
		data["category"] = "Weather"
		data["colorTheme"] = "blue"
		data["imageUrl"] = "https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&w=800&q=80" // Rain/Cloud
		data["description"] = cleanMessage(message)
		data["temp"] = "22°C" // Mock for now, or extract regex
		data["location"] = "Destination"
		data["condition"] = "Cloudy"
	} else if contains(message, "CULTURE:") || contains(message, "REVIEW:") || contains(message, "Wisdom") || contains(message, "GeniusLoci_output") || contains(message, "Tip") || contains(message, "Culture") {
		// 3. Wisdom/Tips - Enhanced with videos
		cardType = "cultural_tip"
		data["title"] = "Travel Wisdom"
		data["source"] = "Genius Loci"
		data["category"] = "Culture"
		data["colorTheme"] = "purple"
		data["imageUrl"] = "https://images.unsplash.com/photo-1528642474498-1af0c17fd8c3?auto=format&fit=crop&w=800&q=80" // Kyoto culture
		data["summary"] = cleanMessage(message)

		// Add video for cultural tips (example YouTube embed)
		if contains(message, "temple") || contains(message, "shrine") {
			data["videoUrl"] = "https://www.youtube.com/embed/s-VRyQprlu8" // Sample cultural video
		}
	} else if contains(message, "REPORT:") || contains(message, "Report") || contains(message, "GenerateReport_output") {
		// 4. Final Report
		data["title"] = "Trip Guardian Report"
		data["source"] = "Final Synthesis"
		data["category"] = "Report"
		data["colorTheme"] = "green"
		data["imageUrl"] = "https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?auto=format&fit=crop&w=800&q=80" // Travel map
		data["summary"] = cleanMessage(message)
	} else if contains(message, "News") || contains(message, "Breaking") {
		// 5. News Articles
		data["title"] = "Latest News"
		data["source"] = "News Agent"
		data["category"] = "Safety"
		data["colorTheme"] = "red"
		data["imageUrl"] = "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80" // News
	} else {
		// Default
		data["title"] = "Trip Guardian"
		data["source"] = "Analysis"
		data["category"] = "Tips"
		data["colorTheme"] = "default"
	}
	return cardType, priority, data
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
	return strings.TrimSpace(msg)
}

func contains(s, substr string) bool {
	return strings.Contains(s, substr)
}
