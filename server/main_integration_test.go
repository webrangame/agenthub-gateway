package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"guardian-gateway/pkg/session"

	"github.com/gin-gonic/gin"
)

// Mock GenerateContent for testing
func MockGenerateContent(history []map[string]interface{}, systemPrompt string, apiKey ...string) (string, error) {
	// Verify if systemPrompt contains injected context
	if !strings.Contains(systemPrompt, "Current User Time:") {
		return "", fmt.Errorf("System Prompt missing Time Context")
	}
	if !strings.Contains(systemPrompt, "User Location:") {
		return "", fmt.Errorf("System Prompt missing Location Context")
	}

	// Check specific values if possible
	if !strings.Contains(systemPrompt, "TestTime") {
		return "", fmt.Errorf("System Prompt missing specific TestTime")
	}

	return `{"action": "ASK_QUESTION", "content": "Context Verified", "updates": {}}`, nil
}

func TestChatStreamHandler_ContextInjection(t *testing.T) {
	// Setup Gin
	gin.SetMode(gin.TestMode)
	r := gin.New()

	// Override LLM function
	OriginalGenerate := GenerateContentFunc
	GenerateContentFunc = MockGenerateContent
	defer func() { GenerateContentFunc = OriginalGenerate }()

	// Init Session
	session.Init()

	r.POST("/api/chat/stream", ChatStreamHandler)

	// Prepare Request with Context
	reqBody := map[string]string{
		"input":         "Hello",
		"client_time":   "TestTime 12:00 PM",
		"user_location": "TestCity",
	}
	bodyBytes, _ := json.Marshal(reqBody)

	req, _ := http.NewRequest("POST", "/api/chat/stream", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", "test-user-context")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// Assertions
	if w.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK, got %d. Body: %s", w.Code, w.Body.String())
	}

	// Verify output contains the mock response
	if !strings.Contains(w.Body.String(), "Context Verified") {
		t.Errorf("Response did not contain expected content from Mock LLM. Got: %s", w.Body.String())
	}
}
