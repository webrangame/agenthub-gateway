package llm

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

// TestGenerateContent_Success tests successful LiteLLM proxy response
func TestGenerateContent_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify request
		if r.Method != "POST" {
			t.Errorf("Expected POST, got %s", r.Method)
		}
		if r.Header.Get("Authorization") != "Bearer test-key" {
			t.Errorf("Expected Authorization header with Bearer token")
		}

		// Send success response
		resp := OpenAIResponse{
			Choices: []struct {
				Message struct {
					Content string `json:"content"`
				} `json:"message"`
			}{
				{Message: struct {
					Content string `json:"content"`
				}{Content: "UPDATE_STATE: Destination=Paris\nACTION: ASK_QUESTION How many days?"}},
			},
		}
		_ = json.NewEncoder(w).Encode(resp) // Error writing to test response writer can be ignored
	}))
	defer server.Close()

	os.Setenv("LITELLM_PROXY_URL", server.URL)
	os.Setenv("LITELLM_API_KEY", "test-key")
	defer os.Unsetenv("LITELLM_PROXY_URL")
	defer os.Unsetenv("LITELLM_API_KEY")

	history := []map[string]interface{}{
		{"role": "user", "content": "I want to visit Paris"},
	}

	result, err := GenerateContent(history, "You are a travel assistant")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}

	if !strings.Contains(result, "Paris") {
		t.Errorf("Expected response to contain 'Paris', got: %s", result)
	}
}

// TestGenerateContent_RateLimit tests rate limit error handling
func TestGenerateContent_RateLimit(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
		errResp := OpenAIResponse{
			Error: &struct {
				Message string `json:"message"`
				Type    string `json:"type"`
			}{
				Message: "Rate limit exceeded",
				Type:    "rate_limit_error",
			},
		}
		_ = json.NewEncoder(w).Encode(errResp) // Error writing to test response writer can be ignored
	}))
	defer server.Close()

	os.Setenv("LITELLM_PROXY_URL", server.URL)
	os.Setenv("LITELLM_API_KEY", "test-key")
	defer os.Unsetenv("LITELLM_PROXY_URL")
	defer os.Unsetenv("LITELLM_API_KEY")

	history := []map[string]interface{}{
		{"role": "user", "content": "Hello"},
	}

	_, err := GenerateContent(history, "System")
	if err == nil {
		t.Fatal("Expected rate limit error")
	}

	if !strings.Contains(err.Error(), "high traffic") {
		t.Errorf("Expected user-friendly error, got: %v", err)
	}
}

// TestGenerateContent_MissingAPIKey tests validation
func TestGenerateContent_MissingAPIKey(t *testing.T) {
	os.Unsetenv("LITELLM_API_KEY")
	os.Setenv("LITELLM_PROXY_URL", "https://example.com")
	defer os.Unsetenv("LITELLM_PROXY_URL")

	history := []map[string]interface{}{
		{"role": "user", "content": "Hello"},
	}

	_, err := GenerateContent(history, "System")
	if err == nil {
		t.Fatal("Expected error for missing API key")
	}

	if err.Error() != "LITELLM_API_KEY not set" {
		t.Errorf("Expected 'LITELLM_API_KEY not set', got: %v", err)
	}
}

// TestGenerateContent_MissingProxyURL tests validation
func TestGenerateContent_MissingProxyURL(t *testing.T) {
	os.Setenv("LITELLM_API_KEY", "test-key")
	os.Unsetenv("LITELLM_PROXY_URL")
	defer os.Unsetenv("LITELLM_API_KEY")

	history := []map[string]interface{}{
		{"role": "user", "content": "Hello"},
	}

	_, err := GenerateContent(history, "System")
	if err == nil {
		t.Fatal("Expected error for missing proxy URL")
	}

	if err.Error() != "LITELLM_PROXY_URL not set" {
		t.Errorf("Expected 'LITELLM_PROXY_URL not set', got: %v", err)
	}
}

// TestGenerateContent_EmptyResponse tests empty choices handling
func TestGenerateContent_EmptyResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := OpenAIResponse{
			Choices: []struct {
				Message struct {
					Content string `json:"content"`
				} `json:"message"`
			}{},
		}
		_ = json.NewEncoder(w).Encode(resp) // Error writing to test response writer can be ignored
	}))
	defer server.Close()

	os.Setenv("LITELLM_PROXY_URL", server.URL)
	os.Setenv("LITELLM_API_KEY", "test-key")
	defer os.Unsetenv("LITELLM_PROXY_URL")
	defer os.Unsetenv("LITELLM_API_KEY")

	history := []map[string]interface{}{
		{"role": "user", "content": "Hello"},
	}

	_, err := GenerateContent(history, "System")
	if err == nil {
		t.Fatal("Expected error for empty response")
	}

	if !strings.Contains(err.Error(), "no content generated") {
		t.Errorf("Expected 'no content generated', got: %v", err)
	}
}

// TestGenerateContent_RoleNormalization tests model->assistant conversion
func TestGenerateContent_RoleNormalization(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var reqBody map[string]interface{}
		_ = json.NewDecoder(r.Body).Decode(&reqBody) // Error decoding test request can be ignored

		messages := reqBody["messages"].([]interface{})
		// Check second message (first is system) has role "assistant"
		msg := messages[1].(map[string]interface{})
		if msg["role"] != "assistant" {
			t.Errorf("Expected role 'assistant', got %v", msg["role"])
		}

		resp := OpenAIResponse{
			Choices: []struct {
				Message struct {
					Content string `json:"content"`
				} `json:"message"`
			}{
				{Message: struct {
					Content string `json:"content"`
				}{Content: "Test"}},
			},
		}
		_ = json.NewEncoder(w).Encode(resp) // Error writing to test response writer can be ignored
	}))
	defer server.Close()

	os.Setenv("LITELLM_PROXY_URL", server.URL)
	os.Setenv("LITELLM_API_KEY", "test-key")
	defer os.Unsetenv("LITELLM_PROXY_URL")
	defer os.Unsetenv("LITELLM_API_KEY")

	history := []map[string]interface{}{
		{"role": "model", "content": "Hi"}, // "model" should become "assistant"
	}

	_, err := GenerateContent(history, "System")
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
}
