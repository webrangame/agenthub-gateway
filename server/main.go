package main

import (
	"context" // Added context
	"encoding/json"
	"fmt"
	"guardian-gateway/pkg/fastgraph/runtime"
	"guardian-gateway/pkg/llm"
	"guardian-gateway/pkg/session"
	"guardian-gateway/pkg/store" // New import
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
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
var feedStore *store.PostgresStore // New Global Store

// Feed streaming subscribers (SSE)
var feedSubMu sync.Mutex
var feedSubscribers = map[string]map[chan struct{}]struct{}{}

func subscribeFeed(ownerID string, ch chan struct{}) {
	feedSubMu.Lock()
	defer feedSubMu.Unlock()
	if feedSubscribers[ownerID] == nil {
		feedSubscribers[ownerID] = map[chan struct{}]struct{}{}
	}
	feedSubscribers[ownerID][ch] = struct{}{}
}

func unsubscribeFeed(ownerID string, ch chan struct{}) {
	feedSubMu.Lock()
	defer feedSubMu.Unlock()
	if subs, ok := feedSubscribers[ownerID]; ok {
		delete(subs, ch)
		if len(subs) == 0 {
			delete(feedSubscribers, ownerID)
		}
	}
}

func publishFeedUpdate(ownerID string) {
	feedSubMu.Lock()
	subs := feedSubscribers[ownerID]
	feedSubMu.Unlock()
	for ch := range subs {
		// Non-blocking notify; drop if buffer full.
		select {
		case ch <- struct{}{}:
		default:
		}
	}
}

// Atomic counter for unique IDs
// var eventCounter int64 (Removed: Unused)

// Removed global in-memory feed/buckets
// var currentFeed = []*FeedItem{}
// var nodeBuckets = map[string]*FeedItem{}
// var bucketMutex sync.Mutex

// @title           AiGuardian Gateway API
// @version         1.0
// @description     This is the gateway service for the AiGuardian application.
// @host            localhost:8080
// @BasePath        /

func main() {
	// Load .env file if it exists
	// Load .env file and OVERWRITE system env if present
	if err := godotenv.Overload(); err != nil {
		fmt.Printf("INFO: No .env file loaded. Error: %v\n", err)
	} else {
		fmt.Println("INFO: Loaded and overloaded config from .env")
	}

	// Init Engine
	engine = runtime.New()

	// Init Database Store
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		fmt.Println("FATAL: DATABASE_URL environment variable is required")
		os.Exit(1)
	}
	var err error
	// Attempt connection with timeout to avoid blocking startup indefinitely
	// We'll treat the store as optional for startup to allow debugging logs to flush
	// Try initial connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	pgStore, err := store.NewPostgresStore(ctx, connStr)
	cancel()

	if err != nil {
		fmt.Printf("WARNING: Failed to connect to DB initially: %v. Retrying in background...\n", err)
		// Retry in background
		go func() {
			for {
				time.Sleep(10 * time.Second)
				ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
				s, err := store.NewPostgresStore(ctx, connStr)
				cancel()
				if err == nil {
					fmt.Println("INFO: Connected to Postgres Store (Background Recovery)")
					feedStore = s
					return
				}
				fmt.Printf("WARNING: Background DB retry failed: %v\n", err)
			}
		}()
	} else {
		fmt.Println("INFO: Connected to Postgres Store")
		feedStore = pgStore
	}

	// Init Session Manager
	session.Init()

	// Auto-load pre-deployed agent
	agentPath := "./agents/trip-guardian/trip_guardian_v3.m"
	if _, err := os.Stat(agentPath); err == nil {
		fmt.Printf("INFO: Loading pre-deployed agent: %s\n", agentPath)
		meta, err := engine.Inspect(agentPath)
		if err != nil {
			fmt.Printf("WARNING: Failed to inspect agent: %v\n", err)
		} else {
			fmt.Printf("INFO: Agent loaded: %s (Capabilities: %v)\n", meta.Name, meta.Capabilities)
			// Start scheduled execution if configured
			if meta.Schedule != nil && meta.Schedule.Mode == "proactive" {
				go startScheduledExecution(agentPath, meta.Schedule)
			}
		}
	} else {
		fmt.Printf("WARNING: Pre-deployed agent not found at %s\n", agentPath)
	}

	r := gin.Default()

	// CORS Middleware
	// CORS Middleware
	config := cors.DefaultConfig()
	// config.AllowAllOrigins = true // Cannot use * with AllowCredentials
	config.AllowOrigins = []string{
		"http://localhost:3000",
		"http://127.0.0.1:3000",
		"https://market.niyogen.com",
		"https://travel.niyogen.com",
		"https://guardian-client-x6n5sofwia-uc.a.run.app", // Cloud Run Frontend
	}
	config.AllowCredentials = true
	config.AddAllowHeaders("Authorization", "X-Device-ID") // Added X-Device-ID
	r.Use(cors.New(config))

	// Health Check
	r.GET("/health", HealthHandler)

	// GET /api/feed
	r.GET("/api/feed", GetFeedHandler)

	// GET /api/feed/stream (SSE)
	r.GET("/api/feed/stream", FeedStreamHandler)

	// DELETE /api/feed
	r.DELETE("/api/feed", ClearFeedHandler)

	// POST /api/agent/upload - DISABLED (agents are pre-deployed)
	// r.POST("/api/agent/upload", UploadAgentHandler)

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
		// Per-run image cache
		nodeImages := make(map[string]string)
		if err := engine.Run(agentPath, "Proactive Check", loadMemoryConfig(), func(eventJSON string) {
			processAndSaveFeed(context.Background(), "system_broadcast", eventJSON, "", nodeImages)
		}); err != nil {
			fmt.Printf("Error running scheduled check for %s: %v\n", agentPath, err)
		}
	}
}

func loadMemoryConfig() *runtime.MemoryConfig {
	projectID := os.Getenv("VERTEX_PROJECT_ID")
	// Only enable if project ID is set, or forcing a specific store
	if projectID == "" {
		return nil
	}
	return &runtime.MemoryConfig{
		Enabled:    true,
		Store:      "inmemory", // Fallback to inmemory until Vertex allowlist is approved/binary supports it
		ProjectID:  projectID,
		Location:   os.Getenv("VERTEX_LOCATION"),
		CorpusName: os.Getenv("VERTEX_CORPUS_NAME"),
	}
}

// Sticky Node State to associate orphaned chunks - per user potentially?
// For simplicity, keeping global for now as single-user demo, or refactor to map[deviceID]string
var lastActiveNode string

func processAndSaveFeed(ctx context.Context, deviceID string, eventJSON string, destination string, nodeImages map[string]string) {
	fmt.Println("ENGINE EVENT:", eventJSON)

	// ... [Existing parsing logic mostly same, but need to adapt] ...
	// Parse the JSON event to extract a clean message
	var evt struct {
		Type    string `json:"type"`
		Message string `json:"message"`
		Node    string `json:"node"`
		Text    string `json:"text"`
	}

	message := eventJSON
	incomingNode := ""

	if err := json.Unmarshal([]byte(eventJSON), &evt); err == nil {
		if evt.Text != "" {
			message = evt.Text
		} else if evt.Message != "" {
			message = evt.Message
		}
		if evt.Node != "" {
			incomingNode = evt.Node
			// Update lastActiveNode logic if needed or keep loose
			lastActiveNode = evt.Node
		} else if evt.Type == "chunk" && lastActiveNode != "" {
			incomingNode = lastActiveNode
		}
	}

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

	// Logic to refine incomingNode and cleanText...
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
		cleanText = cleanMessage(message)
		if t, ok := data["title"].(string); !ok || t == "" {
			data["title"] = incomingNode
		}
		refineCardType(incomingNode, message, &cardType, &priority, data, destination)
		data["summary"] = cleanText
		data["source_node"] = incomingNode
	}

	// IMAGE CACHING LOGIC
	if incomingNode != "" && nodeImages != nil {
		if cachedImg, ok := nodeImages[incomingNode]; ok {
			// Reuse cached image
			data["imageUrl"] = cachedImg
		} else {
			// Save new image to cache if present
			if img, ok := data["imageUrl"].(string); ok && img != "" {
				nodeImages[incomingNode] = img
			}
		}
	}

	// Final filters
	if incomingNode == "" {
		if title, ok := data["title"].(string); ok && title != "" {
			incomingNode = title
		}
	}
	// Only drop technical extraction nodes. Allow KnowledgeCheck to show up.
	if incomingNode == "" || incomingNode == "ExtractDetails" || incomingNode == "ExtractCity" || incomingNode == "extractDetails" || incomingNode == "extractCity" {
		fmt.Printf("DEBUG: Dropping message from node '%s': %s (len=%d)\n", incomingNode, message, len(message))
		return
	}

	// SAVE TO DB
	if feedStore != nil {
		card := &store.Card{
			CardType:   cardType,
			Priority:   priority,
			SourceNode: incomingNode,
			Data:       data,
		}

		// DEBUG: Check summary length
		if summary, ok := data["summary"].(string); ok {
			fmt.Printf("DEBUG: Saving Card Node='%s' SummaryLen=%d\n", incomingNode, len(summary))
		}

		if err := feedStore.UpsertCard(ctx, deviceID, card); err != nil { // Use deviceID parameter
			fmt.Printf("DB ERROR: %v\n", err)
		} else {
			// Notify SSE clients to refresh feed immediately
			publishFeedUpdate(deviceID)
		}
	}
}

func shouldSkipMessage(message, eventType, rawJSON, nodeName string) bool {
	// Skip truly empty messages, but allow whitespace (newlines/spaces) for formatting
	if message == "" {
		return true
	}

	// Skip ALL raw JSON logs (internal debug info)
	if eventType == "log" {
		// EXCEPTION: Allow logs from CheckWeather (it emits output as log)
		// Some events don't include nodeName reliably, so also allow if the payload contains CheckWeather markers.
		if nodeName == "CheckWeather" ||
			strings.Contains(message, "CheckWeather") ||
			strings.Contains(message, "CheckWeather_output") ||
			strings.Contains(rawJSON, "CheckWeather") {
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

	// Heuristic: Some CheckWeather outputs arrive without the "CheckWeather:" prefix.
	// Ensure we keep a stable title so processAndSaveFeed can infer a node and won't drop the card.
	if strings.Contains(message, "CheckWeather") || strings.Contains(message, "CheckWeather_output") {
		data["title"] = "CheckWeather"
	}

	// PREFIX DETECTION LOGIC
	// We check for "NodeName: Content" pattern
	prefixMap := map[string]string{
		"NewsAlert:":           "NewsAlert",
		"CheckWeather:":        "CheckWeather",
		"CheckWeather_output:": "CheckWeather",
		"KnowledgeCheck:":      "KnowledgeCheck",
		"ReviewSummarizer:":    "ReviewSummarizer",
		"GeniusLoci:":          "GeniusLoci",
		"GenerateReport:":      "GenerateReport",
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
		// If we matched by content (contains "Weather"), ensure node inference is stable.
		if title == "" {
			data["title"] = "CheckWeather"
		}
		data["source"] = "Weather Agent"
		data["category"] = "Weather"
		data["colorTheme"] = "blue"
		data["imageUrl"] = "https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&w=800&q=80"
		data["description"] = data["summary"]
		data["temp"] = "22°C"
		data["location"] = "Destination"
		data["condition"] = "Cloudy"
		data["condition"] = "Cloudy"

		// Extract country from destination (e.g., "Delhi, India" -> "India")
		country := extractCountry(destination)
		query := "landscape"
		if country != "" {
			query = country // Just the country name
		}
		fmt.Printf("DEBUG: Unsplash Weather Query: '%s' (Country: '%s')\n", query, country)
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

		country := extractCountry(destination)
		query := "culture"
		if country != "" {
			query = country // Just the country name
		}
		fmt.Printf("DEBUG: Unsplash Culture Query: '%s' (Country: '%s')\n", query, country)
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

		country := extractCountry(destination)
		query := "travel"
		if country != "" {
			query = country // Just the country name
		}
		fmt.Printf("DEBUG: Unsplash Report Query: '%s' (Country: '%s')\n", query, country)
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
	if title == "newsAlert" || title == "NewsAlert" || contains(message, "SAFETY:") || contains(message, "Warning") {
		*cardType = "safe_alert"
		*priority = "high"
		data["message"] = data["summary"]
		data["level"] = "warning"
		data["category"] = "Safety"
		data["colorTheme"] = "red"
	} else if title == "checkWeather" || title == "CheckWeather" || contains(message, "Weather") {
		*cardType = "weather"
		data["source"] = "Weather Agent"
		data["category"] = "Weather"
		data["colorTheme"] = "blue"
		data["imageUrl"] = "https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&w=800&q=80"
		data["description"] = data["summary"]
		data["temp"] = "22°C"
		data["location"] = "Destination"
		data["condition"] = "Cloudy"
		country := extractCountry(destination)
		query := "landscape"
		if country != "" {
			query = country // Just the country name
		}
		if img, name, link := fetchUnsplashImage(query); img != "" {
			data["imageUrl"] = img
			data["imageUser"] = name
			data["imageUserLink"] = link
		} else {
			data["imageUrl"] = "https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&w=800&q=80"
		}
	} else if title == "geniusLoci" || title == "GeniusLoci" || title == "knowledgeCheck" || title == "KnowledgeCheck" || title == "reviewSummarizer" || title == "ReviewSummarizer" {
		*cardType = "cultural_tip"
		data["source"] = "Genius Loci"
		data["category"] = "Culture"
		data["colorTheme"] = "purple"
		country := extractCountry(destination)
		query := "culture"
		if country != "" {
			query = country // Just the country name
		}
		if img, name, link := fetchUnsplashImage(query); img != "" {
			data["imageUrl"] = img
			data["imageUser"] = name
			data["imageUserLink"] = link
		} else {
			data["imageUrl"] = "https://images.unsplash.com/photo-1528642474498-1af0c17fd8c3?auto=format&fit=crop&w=800&q=80"
		}
	} else if title == "generateReport" || title == "GenerateReport" {
		*cardType = "article"
		data["source"] = "Final Synthesis"
		data["category"] = "Report"
		data["colorTheme"] = "green"
		data["colorTheme"] = "green"
		country := extractCountry(destination)
		query := "travel landscape"
		if country != "" {
			query = country + " travel landscape"
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
	fmt.Printf("🔍 fetchUnsplashImage called with query: '%s'\n", query)
	apiKey := os.Getenv("UNSPLASH_ACCESS_KEY")
	if apiKey == "" {
		fmt.Println("❌ UNSPLASH_ACCESS_KEY not set!")
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

	if resp.StatusCode == http.StatusNotFound {
		// Query too specific, try simpler fallback
		fmt.Printf("⚠️ Unsplash returned 404 for '%s', trying simpler query...\n", query)

		// Extract just the destination (remove ", Sri Lanka" or similar patterns)
		simplifiedQuery := query
		if idx := strings.Index(query, ","); idx > 0 {
			simplifiedQuery = strings.TrimSpace(query[:idx])
		}
		// Remove very specific terms
		simplifiedQuery = strings.ReplaceAll(simplifiedQuery, " culture tradition", " travel")
		simplifiedQuery = strings.ReplaceAll(simplifiedQuery, " weather sky", " landscape")

		if simplifiedQuery != query {
			fmt.Printf("🔄 Retrying with: '%s'\n", simplifiedQuery)
			// Recursive retry with simplified query
			return fetchUnsplashImage(simplifiedQuery)
		}

		fmt.Printf("⚠️ Unsplash API Returned: 404 (No images found)\n")
		return "", "", ""
	}

	if resp.StatusCode != http.StatusOK {
		fmt.Printf("⚠️ Unsplash API Returned: %d\n", resp.StatusCode)
		return "", "", ""
	}

	var result struct {
		Urls struct {
			Regular string `json:"regular"`
			Small   string `json:"small"`
		} `json:"urls"`
		Links struct {
			DownloadLocation string `json:"download_location"`
		} `json:"links"`
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

	// Trigger download tracking (required by Unsplash API guidelines)
	// Run asynchronously with timeout to prevent blocking if Unsplash is down
	if result.Links.DownloadLocation != "" {
		fmt.Printf("📸 Unsplash: Triggering download for image...\n")
		go func(downloadURL, clientID string) {
			// Append client_id to download URL (required for authentication)
			if !strings.Contains(downloadURL, "client_id=") {
				separator := "?"
				if strings.Contains(downloadURL, "?") {
					separator = "&"
				}
				downloadURL = fmt.Sprintf("%s%sclient_id=%s", downloadURL, separator, clientID)
			}

			trackClient := &http.Client{Timeout: 2 * time.Second}
			trackResp, err := trackClient.Get(downloadURL)
			if err != nil {
				fmt.Printf("⚠️ Unsplash download tracking failed (non-critical): %v\n", err)
				return
			}
			defer trackResp.Body.Close()
			fmt.Printf("✅ Unsplash download tracked! (Status: %d)\n", trackResp.StatusCode)
		}(result.Links.DownloadLocation, apiKey)
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

// extractCountry extracts the country from a destination string
// Examples: "Delhi, India" -> "India", "Pasikuda, Sri Lanka" -> "Sri Lanka"
func extractCountry(destination string) string {
	if destination == "" {
		return ""
	}

	// Check if destination contains a comma (e.g., "City, Country")
	if idx := strings.LastIndex(destination, ","); idx > 0 && idx < len(destination)-1 {
		country := strings.TrimSpace(destination[idx+1:])
		return country
	}

	// If no comma, assume the whole destination is the country/region
	return destination
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
	// Identify User
	// Identify User (Hybrid: Auth User > Device > IP)
	ownerID := c.GetHeader("X-User-ID")
	if ownerID == "" {
		ownerID = c.GetHeader("X-Device-ID")
	}
	if ownerID == "" {
		ownerID = c.ClientIP()
	}

	if feedStore == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB not initialized"})
		return
	}

	feed, err := feedStore.GetFeed(c.Request.Context(), ownerID, 50)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch feed"})
		return
	}
	c.JSON(http.StatusOK, feed)
}

// FeedStreamHandler godoc
// @Summary      Feed Stream (SSE)
// @Description  Streams feed update notifications (client should re-fetch /api/feed on events)
// @Tags         feed
// @Produce      text/event-stream
// @Success      200  {string}  string  "SSE Stream"
// @Router       /api/feed/stream [get]
func FeedStreamHandler(c *gin.Context) {
	// Identify User (Hybrid: Auth User > Device > IP)
	ownerID := c.GetHeader("X-User-ID")
	if ownerID == "" {
		ownerID = c.GetHeader("X-Device-ID")
	}
	if ownerID == "" {
		ownerID = c.ClientIP()
	}

	// SSE headers
	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no")
	c.Status(http.StatusOK)

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "streaming unsupported"})
		return
	}

	ch := make(chan struct{}, 32)
	subscribeFeed(ownerID, ch)
	defer unsubscribeFeed(ownerID, ch)

	writeEvent := func(w io.Writer, eventName string, data string) {
		// SSE format: "event: <name>\ndata: <payload>\n\n"
		fmt.Fprintf(w, "event: %s\n", eventName)
		fmt.Fprintf(w, "data: %s\n\n", data)
		flusher.Flush()
	}

	// Initial event so the client can fetch immediately.
	writeEvent(c.Writer, "feed_updated", "{}")

	heartbeat := time.NewTicker(25 * time.Second)
	defer heartbeat.Stop()

	for {
		select {
		case <-c.Request.Context().Done():
			return
		case <-ch:
			writeEvent(c.Writer, "feed_updated", "{}")
		case <-heartbeat.C:
			writeEvent(c.Writer, "ping", "{}")
		}
	}
}

// ClearFeedHandler godoc
// @Summary      Clear Feed
// @Description  Clear the insight stream feed
// @Tags         feed
// @Produce      json
// @Success      200  {object}  map[string]string
// @Router       /api/feed [delete]
func ClearFeedHandler(c *gin.Context) {
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

	if feedStore == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "DB not initialized"})
		return
	}

	if err := feedStore.DeleteFeed(c.Request.Context(), ownerID); err != nil {
		fmt.Printf("Error clearing feed for %s: %v\n", ownerID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to clear feed"})
		return
	}

	fmt.Printf("INFO: Feed cleared for %s\n", ownerID)
	publishFeedUpdate(ownerID)
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

	if userID != "" && feedStore != nil {
		// Try to get existing key from database
		key, err := feedStore.GetUserLiteLLMKey(c.Request.Context(), userID)
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
					if err := feedStore.StoreUserLiteLLMKey(c.Request.Context(), userID, newKey, keyName, 10.00); err != nil {
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
	decisionResponse, err := GenerateContentFunc(convertHistory(history), systemMsg, litellmApiKey)
	fmt.Printf("GATEWAY RAW RESPONSE: %s\n", decisionResponse)

	// Default fallback
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
			// Actually, let's just construct the full legacy action string for compatibility with Step 4
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
		c.SSEvent("chunk", `{"node": "Guardian Assistant:", "text": "Great! I have everything I need. I'm performing a comprehensive safety scan for your trip. Check the Insight Stream tab for details."}`)
		c.Writer.Flush()

		// Prepare Accumulator
		var fullOutput strings.Builder
		var mu sync.Mutex
		nodeAccumulators := make(map[string]string)
		nodeImages := make(map[string]string) // Cache for Unsplash images
		currentAccumulatingNode := ""
		var finalDest string // Capture destination for final flush

		// Reset Stream State
		// bucketMutex.Lock() // Removed
		// nodeBuckets = map[string]*FeedItem{}
		lastActiveNode = ""
		// bucketMutex.Unlock() // Removed

		// Run Agent
		err := engine.Run(agentPath, agentInput, loadMemoryConfig(), func(eventJSON string) {
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
					processAndSaveFeed(c.Request.Context(), sessionKey, string(fullEventBytes), dest, nodeImages)
				}
			} else {
				// Fallback for system events (like done/error) or chunks before any node is seen
				processAndSaveFeed(c.Request.Context(), sessionKey, eventJSON, dest, nodeImages)
			}

			// Stream to Client (Send ORIGINAL chunk)
			c.SSEvent("message", eventJSON)
			c.Writer.Flush()

			// Accumulate for Done
			fullOutput.WriteString(extractTextFromEvent(eventJSON))
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
					// Use the existing processAndSaveFeed logic which handles mapToCard, DB upsert, etc.
					processAndSaveFeed(c.Request.Context(), sessionKey, string(fullEventBytes), finalDest, nodeImages)
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
