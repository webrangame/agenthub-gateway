package main

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"guardian-gateway/pkg/fastgraph/runtime"
	"guardian-gateway/pkg/session"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// Integration Test to verify Router Wiring
func TestIntegration_RouterWiring(t *testing.T) {
	// Initialize Session Manager to avoid nil panic
	session.Init()

	// Setup Mock Engine to avoid actual binary calls
	mockEngine := runtime.New()
	mockEngine.MockRun = func(agentPath, input string, memory *runtime.MemoryConfig, onEvent func(string)) error {
		return nil
	}
	engine = mockEngine

	// Setup Router (Real Setup)
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/api/chat/stream", ChatStreamHandler)

	// Create Request
	reqBody := []byte(`{"input": "Integration Test", "agent_path": "mock.m"}`)
	req, _ := http.NewRequest("POST", "/api/chat/stream", bytes.NewBuffer(reqBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// Verify Wiring
	assert.Equal(t, 200, w.Code)
	assert.Contains(t, w.Body.String(), "event:done")
}
