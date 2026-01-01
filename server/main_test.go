package main

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"guardian-gateway/pkg/fastgraph/runtime"
	"guardian-gateway/pkg/session"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestHealthHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	HealthHandler(c)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "guardian-gateway")
}

func TestChatStreamHandler(t *testing.T) {
	// Initialize Session for Handler
	session.Init()

	// Mock GenerateContentFunc
	originalGenerate := GenerateContentFunc
	defer func() { GenerateContentFunc = originalGenerate }()
	GenerateContentFunc = func(history []map[string]interface{}, systemPrompt string) (string, error) {
		return "ACTION: RUN_AGENT SUMMARY: Run requested by test", nil
	}

	// Setup Mock Engine
	mockEngine := runtime.New()
	mockEngine.MockRun = func(agentPath, input string, memory *runtime.MemoryConfig, onEvent func(string)) error {
		// Mock Output Events
		onEvent(`{"type": "chunk", "message": "Hello"}`)
		onEvent(`{"type": "chunk", "message": " World"}`)
		return nil
	}
	engine = mockEngine // Set global engine

	// Init Router
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	// Mock Request
	reqBody := []byte(`{"input": "Hello", "agent_path": "mock.m"}`)
	c.Request, _ = http.NewRequest("POST", "/api/chat/stream", bytes.NewBuffer(reqBody))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Request.RemoteAddr = "127.0.0.1:12345" // Needed for ClientIP binding

	// Call Handler
	ChatStreamHandler(c)

	// Verify Response
	assert.Equal(t, 200, w.Code)
	// assert.Equal(t, "text/event-stream", w.Header().Get("Content-Type"))

	// Verify Body (SSE Format)
	body := w.Body.String()
	compact := strings.ReplaceAll(body, " ", "")
	if !assert.Contains(t, body, `event:done`) {
		t.Logf("Response Body: %s", body)
	}
	// ChatStreamHandler emits SSE events as "message" with raw JSON payloads.
	assert.Contains(t, body, `event:message`)
	assert.Contains(t, compact, `data:{"type":"chunk","message":"Hello"}`)
	assert.Contains(t, compact, `data:{"type":"chunk","message":"World"}`)
}

func TestGetFeedHandler(t *testing.T) {
	// Note: This requires mocking feedStore
	// Since feedStore is a global, we'd need to refactor for proper testing
	globalFeedStore := feedStore
	defer func() { feedStore = globalFeedStore }()

	// For now, test with nil store (error case)
	feedStore = nil

	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/api/feed", nil)
	c.Request.Header.Set("X-Device-ID", "test-device")

	GetFeedHandler(c)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "DB not initialized")
}

func TestClearFeedHandler(t *testing.T) {
	globalFeedStore := feedStore
	defer func() { feedStore = globalFeedStore }()

	// Test with nil store
	feedStore = nil

	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("DELETE", "/api/feed", nil)
	c.Request.Header.Set("X-Device-ID", "test-device")

	ClearFeedHandler(c)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "DB not initialized")
}

func TestShouldSkipMessage(t *testing.T) {
	tests := []struct {
		name      string
		message   string
		eventType string
		nodeName  string
		expected  bool
	}{
		{"empty message", "", "chunk", "", true},
		{"log event", "debug info", "log", "", true},
		{"log from CheckWeather", "weather data", "log", "CheckWeather", false},
		{"raw JSON", `{"type": "log"}`, "chunk", "", true},
		{"INIT message", "INIT system", "chunk", "", true},
		{"short message", "hi", "chunk", "", true},
		{"valid long message", "This is a valid message with enough length", "chunk", "", false},
		{"horizontal line", "---", "chunk", "", true},
		{"valid with node", "test", "chunk", "TestNode", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := shouldSkipMessage(tt.message, tt.eventType, "", tt.nodeName)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestMapToCard(t *testing.T) {
	tests := []struct {
		name        string
		message     string
		destination string
		expCardType string
		expPriority string
		expCategory string
	}{
		{
			name:        "NewsAlert",
			message:     "NewsAlert: Breaking news",
			expCardType: "safe_alert",
			expPriority: "high",
			expCategory: "Safety",
		},
		{
			name:        "CheckWeather",
			message:     "CheckWeather: Sunny day",
			expCardType: "weather",
			expCategory: "Weather",
		},
		{
			name:        "GeniusLoci",
			message:     "GeniusLoci: Cultural tip",
			expCardType: "cultural_tip",
			expCategory: "Culture",
		},
		{
			name:        "GenerateReport",
			message:     "GenerateReport: Summary",
			expCardType: "article",
			expCategory: "Report",
		},
		{
			name:        "default",
			message:     "Random message",
			expCardType: "article",
			expPriority: "medium",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cardType, priority, data := mapToCard(tt.message, tt.destination)
			assert.Equal(t, tt.expCardType, cardType)
			if tt.expPriority != "" {
				assert.Equal(t, tt.expPriority, priority)
			}
			if tt.expCategory != "" {
				assert.Equal(t, tt.expCategory, data["category"])
			}
		})
	}
}

func TestCleanMessage(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"with prefix", "CheckWeather_output: Sunny", " Sunny"},
		{"with SAFETY", "SAFETY: Warning message", " Warning message"},
		{"no prefix", "Regular message", "Regular message"},
		{"multiple prefixes", "output: result: final", "  final"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := cleanMessage(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}
