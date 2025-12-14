package main

import (
	"encoding/json"
	"fmt"
	"guardian-gateway/pkg/fastgraph/runtime"
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
			processAndAppendFeed(eventJSON)
		}); err != nil {
			fmt.Printf("Error running scheduled check for %s: %v\n", agentPath, err)
		}
	}
}

func processAndAppendFeed(eventJSON string) {
	fmt.Println("ENGINE EVENT:", eventJSON)

	// Parse the JSON event to extract a clean message
	var evt struct {
		Type    string `json:"type"`
		Message string `json:"message"`
	}

	message := eventJSON // fallback
	if err := json.Unmarshal([]byte(eventJSON), &evt); err == nil {
		if evt.Message != "" {
			message = evt.Message
		}
	}

	// Skip useless messages
	if shouldSkipMessage(message, evt.Type, eventJSON) {
		return
	}

	// Default UI mapping
	cardType, priority, data := mapToCard(message)

	// Try to extract node information
	var nodeInfo struct {
		Node string `json:"node"`
		Text string `json:"text"`
	}
	incomingNode := ""
	var cleanText string

	if err := json.Unmarshal([]byte(message), &nodeInfo); err == nil && nodeInfo.Node != "" {
		incomingNode = nodeInfo.Node
		cleanText = nodeInfo.Text
		cardType, priority, data = mapToCard(cleanText)
		data["source_node"] = incomingNode
	} else {
		cleanText = cleanMessage(message)
		data["summary"] = cleanText
	}

	// FILTER: Hide internal utility nodes from the public feed to prevent clutter
	if incomingNode == "ExtractDetails" || incomingNode == "ExtractCity" || incomingNode == "KnowledgeCheck" || incomingNode == "FetchReviews" {
		return
	}

	// ---------- MAP‑BASED BUCKET LOGIC ----------
	bucketMutex.Lock()
	defer bucketMutex.Unlock()

	if incomingNode != "" {
		if existing, ok := nodeBuckets[incomingNode]; ok {
			// Append to existing bucket
			lastSummary, _ := existing.Data["summary"].(string)
			if len(lastSummary) < 10000 {
				existing.Data["summary"] = lastSummary + cleanText
				existing.Timestamp = time.Now().Format(time.RFC3339)
			}
			return
		}
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
	if incomingNode != "" {
		nodeBuckets[incomingNode] = &newItem
	}
	// Prepend to feed slice (most recent first)
	currentFeed = append([]*FeedItem{&newItem}, currentFeed...)
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

	// Default Title
	data["title"] = "TripGuardian"
	data["source"] = "Analysis"
	data["category"] = "Tips"
	data["colorTheme"] = "default"

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
	} else if title == "GeniusLoci" || title == "KnowledgeCheck" || title == "ReviewSummarizer" {
		cardType = "cultural_tip"
		data["source"] = "Genius Loci"
		data["category"] = "Culture"
		data["colorTheme"] = "purple"
		data["imageUrl"] = "https://images.unsplash.com/photo-1528642474498-1af0c17fd8c3?auto=format&fit=crop&w=800&q=80"

		if contains(message, "temple") || contains(message, "shrine") {
			data["videoUrl"] = "https://www.youtube.com/embed/s-VRyQprlu8"
		}
	} else if title == "GenerateReport" {
		cardType = "article"
		data["source"] = "Final Synthesis"
		data["category"] = "Report"
		data["colorTheme"] = "green"
		data["imageUrl"] = "https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?auto=format&fit=crop&w=800&q=80"
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
	currentFeed = []*FeedItem{}
	fmt.Println("Feed cleared")
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

	// Initial Run (Reactive)
	go func() {
		if err := engine.Run(savePath, "Start Analysis", func(eventJSON string) {
			processAndAppendFeed(eventJSON)
		}); err != nil {
			fmt.Printf("Error running initial analysis for %s: %v\n", savePath, err)
		}
	}()

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
func ChatStreamHandler(c *gin.Context) {
	var req struct {
		Input     string `json:"input"`
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

	// Accumulate full output for "done" event
	var fullOutput strings.Builder
	var mu sync.Mutex

	// Run Agent and Stream
	err := engine.Run(agentPath, req.Input, func(eventJSON string) {
		mu.Lock()
		defer mu.Unlock()

		// Broadcast to Feed as well? Maybe yes, so history is kept.
		processAndAppendFeed(eventJSON)

		// Parse the JSON event to extract text
		var evt struct {
			Type    string `json:"type"`
			Message string `json:"message"`
		}
		if err := json.Unmarshal([]byte(eventJSON), &evt); err == nil {
			if evt.Message != "" {
				fullOutput.WriteString(evt.Message)
				// Emit Chunk
				chunkData := map[string]string{"text": evt.Message}
				if chunkBytes, err := json.Marshal(chunkData); err == nil {
					c.SSEvent("chunk", string(chunkBytes))
					c.Writer.Flush()
				}
			}
		}
	})

	if err != nil {
		mu.Lock()
		c.SSEvent("error", err.Error())
		mu.Unlock()
	}

	// Emit Done
	doneData := map[string]string{"output": fullOutput.String()}
	if doneBytes, err := json.Marshal(doneData); err == nil {
		mu.Lock()
		c.SSEvent("done", string(doneBytes))
		mu.Unlock()
	}
}
