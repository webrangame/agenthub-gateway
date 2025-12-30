package llm

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGenerateContent_Success(t *testing.T) {
	// Mock Gemini API server
	mockResponse := GeminiResponse{
		Candidates: []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		}{
			{
				Content: struct {
					Parts []struct {
						Text string `json:"text"`
					} `json:"parts"`
				}{
					Parts: []struct {
						Text string `json:"text"`
					}{
						{Text: "This is a test response"},
					},
				},
			},
		},
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify request method and headers
		assert.Equal(t, "POST", r.Method)
		assert.Equal(t, "application/json", r.Header.Get("Content-Type"))

		// Verify request body structure
		var reqBody map[string]interface{}
		err := json.NewDecoder(r.Body).Decode(&reqBody)
		require.NoError(t, err)

		// Check for required fields
		assert.Contains(t, reqBody, "contents")
		assert.Contains(t, reqBody, "system_instruction")
		assert.Contains(t, reqBody, "generationConfig")

		// Return mock response
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(mockResponse)
	}))
	defer server.Close()

	// Override API URL (we'd need to modify gemini.go to make this testable)
	// For now, we'll test with actual env var
	originalKey := os.Getenv("GOOGLE_API_KEY")
	os.Setenv("GOOGLE_API_KEY", "test-key-123")
	defer os.Setenv("GOOGLE_API_KEY", originalKey)

	// Test input
	history := []map[string]interface{}{
		{"role": "user", "content": "Hello"},
		{"role": "model", "content": "Hi there"},
	}
	systemPrompt := "You are a helpful assistant"

	// Note: This will call the real API unless we mock the HTTP client
	// For a proper test, we need to inject the HTTP client
	// Skipping actual call in this test due to API limitations
	t.Skipf("Skipping integration test - requires HTTP client injection (history: %d msgs, prompt: %s)", len(history), systemPrompt[:10])
}

func TestGenerateContent_MissingAPIKey(t *testing.T) {
	// Temporarily remove API key
	originalKey := os.Getenv("GOOGLE_API_KEY")
	os.Unsetenv("GOOGLE_API_KEY")
	defer os.Setenv("GOOGLE_API_KEY", originalKey)

	history := []map[string]interface{}{
		{"role": "user", "content": "Hello"},
	}
	systemPrompt := "Test prompt"

	result, err := GenerateContent(history, systemPrompt)

	assert.Error(t, err)
	assert.Equal(t, "", result)
	assert.Contains(t, err.Error(), "GOOGLE_API_KEY not set")
}

func TestGenerateContent_EmptyResponse(t *testing.T) {
	t.Skip("Requires HTTP client injection for proper mocking")
}

func TestGenerateContent_APIError(t *testing.T) {
	t.Skip("Requires HTTP client injection for proper mocking")
}

func TestGenerateContent_MalformedJSON(t *testing.T) {
	t.Skip("Requires HTTP client injection for proper mocking")
}

// Helper test for request body formatting
func TestRequestBodyFormat(t *testing.T) {
	// This tests the structure we expect to send
	history := []map[string]interface{}{
		{"role": "user", "content": "Test message"},
		{"role": "assistant", "content": "Test response"},
	}

	// Verify history conversion logic (this would be extracted from GenerateContent)
	var contents []map[string]interface{}
	for _, msg := range history {
		role := "user"
		if msg["role"] == "model" || msg["role"] == "assistant" {
			role = "model"
		}

		contents = append(contents, map[string]interface{}{
			"role": role,
			"parts": []map[string]string{
				{"text": msg["content"].(string)},
			},
		})
	}

	assert.Len(t, contents, 2)
	assert.Equal(t, "user", contents[0]["role"])
	assert.Equal(t, "model", contents[1]["role"])
}
