package store

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestGenerateLiteLLMKey_Success(t *testing.T) {
	// Mock LiteLLM Proxy Server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Verify Request
		if r.Method != "POST" {
			t.Errorf("Expected POST, got %s", r.Method)
		}
		if r.Header.Get("Authorization") != "Bearer master-secret" {
			t.Errorf("Expected Authorization header")
		}
		if r.URL.Path != "/key/generate" {
			t.Errorf("Expected path /key/generate, got %s", r.URL.Path)
		}

		// Verify Body
		var payload map[string]interface{}
		_ = json.NewDecoder(r.Body).Decode(&payload)
		if payload["user_id"] != "test-user" {
			t.Errorf("Expected user_id 'test-user', got %v", payload["user_id"])
		}

		// Send Response
		w.WriteHeader(http.StatusOK)
		resp := map[string]string{
			"key": "sk-new-virtual-key",
		}
		_ = json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	key, keyName, err := GenerateLiteLLMKey(server.URL, "master-secret", "test-user", 10.0)

	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	if key != "sk-new-virtual-key" {
		t.Errorf("Expected key 'sk-new-virtual-key', got %s", key)
	}
	if keyName != "user_test-user" {
		t.Errorf("Expected keyName 'user_test-user', got %s", keyName)
	}
}

func TestGenerateLiteLLMKey_ErrorResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusForbidden)
		_, _ = w.Write([]byte(`{"error": "Invalid Master Key"}`))
	}))
	defer server.Close()

	_, _, err := GenerateLiteLLMKey(server.URL, "sub-key", "test-user", 0)

	if err == nil {
		t.Fatal("Expected error, got nil")
	}
	if !strings.Contains(err.Error(), "status 403") {
		t.Errorf("Expected status 403 error, got: %v", err)
	}
}

func TestGenerateLiteLLMKey_NetworkError(t *testing.T) {
	// Invalid URL to force network error
	_, _, err := GenerateLiteLLMKey("http://invalid-url", "master", "user", 0)

	if err == nil {
		t.Fatal("Expected network error")
	}
}
