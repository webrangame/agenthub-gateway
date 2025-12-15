package main

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"
	"strings"

	"guardian-gateway/pkg/fastgraph/runtime"

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
	// Setup Mock Engine
	mockEngine := runtime.New()
	mockEngine.MockRun = func(agentPath, input string, onEvent func(string)) error {
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
