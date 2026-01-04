package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"guardian-gateway/pkg/fastgraph/runtime"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestHealthHandler(t *testing.T) {
	mockEngine := runtime.New()
	server := NewServer(mockEngine, nil, nil)

	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	server.HealthHandler(c)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "guardian-gateway")
}

func TestGetFeedHandler_DBError(t *testing.T) {
	mockEngine := runtime.New()
	// Nil store -> should return error
	server := NewServer(mockEngine, nil, nil)

	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request, _ = http.NewRequest("GET", "/api/feed", nil)

	server.GetFeedHandler(c)

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.Contains(t, w.Body.String(), "DB not initialized")
}
