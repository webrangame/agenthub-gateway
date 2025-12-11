package main

import (
	"encoding/json"
	"fmt"
	"guardian-gateway/pkg/fastgraph/runtime"
	"net/http"
	"path/filepath"
	"strings"
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

// Global Feed - Start empty, only show real agent output
var currentFeed = []FeedItem{}

func main() {
	// Load .env file if it exists
	if err := godotenv.Load(); err != nil {
		fmt.Println("INFO: No .env file found, relying on system env.")
	} else {
		fmt.Println("INFO: Loaded config from .env")
	}

	// Init Stub Engine
	engine = runtime.New()

	// Setup Event Listener: Bridge Engine -> UI Feed
	engine.OnEvent(func(eventJSON string) {
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

		// FILTER OUT USELESS MESSAGES
		// Skip empty messages
		if strings.TrimSpace(message) == "" {
			fmt.Println("SKIPPED: Empty message")
			return
		}

		// Skip raw JSON logs (they're internal debug info, not user-facing)
		if evt.Type == "log" && (message == "" || message == eventJSON) {
			fmt.Println("SKIPPED: Raw log event")
			return
		}

		// Skip trivial/system messages that don't add value
		trivialPhrases := []string{
			`{"type"`,   // Raw JSON
			"INIT",      // System initialization
			"DEBUG",     // Debug logs
			"TRACE",     // Trace logs
			"null",      // Null messages
			"undefined", // Undefined messages
		}
		for _, phrase := range trivialPhrases {
			if strings.Contains(message, phrase) {
				fmt.Println("SKIPPED: Trivial message -", message)
				return
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
		}
		for _, char := range formatChars {
			if strings.TrimSpace(message) == char || strings.Contains(message, char) {
				fmt.Println("SKIPPED: Formatting char -", message)
				return
			}
		}

		// Skip very short messages (likely not useful)
		if len(strings.TrimSpace(message)) < 15 {
			fmt.Println("SKIPPED: Too short -", message)
			return
		}

		// Heuristic Mapping for "Nicer" UI
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

		// 1. Safety Alerts
		if contains(message, "Safety Briefing") || contains(message, "Warning") || contains(message, "Alert") {
			cardType = "safe_alert"
			priority = "high"
			data = map[string]interface{}{
				"message": message,
				"level":   "warning",
			}
		} else if contains(message, "Weather") || contains(message, "Sky Watch") {
			// 2. Weather (Text Mode) - Use Article but styled as Weather Report
			data["title"] = "Sky Watch"
			data["source"] = "Weather Agent"
			data["category"] = "Weather"
			data["colorTheme"] = "blue"
			data["imageUrl"] = "https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&w=800&q=80" // Rain/Cloud
			data["description"] = "Current weather conditions for your destination"
		} else if contains(message, "Wisdom") || contains(message, "Tip") || contains(message, "Culture") {
			// 3. Wisdom/Tips - Enhanced with videos
			data["title"] = "Travel Wisdom"
			data["source"] = "Genius Loci"
			data["category"] = "Culture"
			data["colorTheme"] = "purple"
			data["imageUrl"] = "https://images.unsplash.com/photo-1528642474498-1af0c17fd8c3?auto=format&fit=crop&w=800&q=80" // Kyoto culture

			// Add video for cultural tips (example YouTube embed)
			if contains(message, "temple") || contains(message, "shrine") {
				data["videoUrl"] = "https://www.youtube.com/embed/s-VRyQprlu8" // Sample cultural video
			}
		} else if contains(message, "Report") {
			// 4. Final Report
			data["title"] = "Trip Guardian Report"
			data["source"] = "Final Synthesis"
			data["category"] = "Report"
			data["colorTheme"] = "green"
			data["imageUrl"] = "https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?auto=format&fit=crop&w=800&q=80" // Travel map
		} else if contains(message, "News") || contains(message, "Breaking") {
			// 5. News Articles
			data["title"] = "Latest News"
			data["source"] = "News Agent"
			data["category"] = "Safety"
			data["colorTheme"] = "red"
			data["imageUrl"] = "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=800&q=80" // News
		} else {
			// Default
			data["title"] = "Agent Log"
			data["source"] = "Runtime"
			data["category"] = "Tips"
			data["colorTheme"] = "default"
		}

		newItem := FeedItem{
			ID:        fmt.Sprintf("evt-%d", time.Now().UnixNano()),
			CardType:  cardType,
			Priority:  priority,
			Timestamp: time.Now().Format(time.RFC3339),
			Data:      data,
		}
		// Prepend to feed
		currentFeed = append([]FeedItem{newItem}, currentFeed...)
	})

	r := gin.Default()

	// CORS Middleware (Simplified for Dev)
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

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

	// Mock Feed API
	// GET /api/feed
	r.GET("/api/feed", func(c *gin.Context) {
		c.JSON(http.StatusOK, currentFeed)
	})

	// DELETE /api/feed - Clear the feed
	r.DELETE("/api/feed", func(c *gin.Context) {
		currentFeed = []FeedItem{}
		fmt.Println("Feed cleared")
		c.JSON(http.StatusOK, gin.H{"status": "cleared", "message": "Feed has been reset"})
	})

	// POST /api/agent/upload
	// Accepts a .agent (zip) file
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

		// Trigger Engine Execution (Stub)
		go engine.Run(savePath, "Start Analysis")

		c.JSON(http.StatusOK, gin.H{
			"status":       "success",
			"message":      "Agent uploaded and execution started",
			"filename":     filename,
			"capabilities": []string{"trip-guardian"}, // Mock capability detection
		})
	})

	// Start Server on 8081 (as per contract)
	r.Run(":8081")
}

func contains(s, substr string) bool {
	return strings.Contains(s, substr)
}
