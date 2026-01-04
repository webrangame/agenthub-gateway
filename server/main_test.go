package main

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"guardian-gateway/pkg/api"
	"guardian-gateway/pkg/fastgraph/runtime"
	"guardian-gateway/pkg/logic"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestHealthHandler(t *testing.T) {
	mockEngine := runtime.New()
	server := api.NewServer(mockEngine, nil, nil)

	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	server.HealthHandler(c)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "guardian-gateway")
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
			// Note: Updated logic signature might differ slightly from original main.go
			result := logic.ShouldSkipMessage(tt.message, tt.eventType, tt.nodeName)
			assert.Equal(t, tt.expected, result)
		})
	}
}
