package llm

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"strings"
	"time"
)

// OpenAIResponse represents the response from OpenAI-compatible endpoints (LiteLLM proxy)
type OpenAIResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
		Type    string `json:"type"`
	} `json:"error,omitempty"`
}

// mapToUserFriendlyError converts technical backend errors to user-friendly messages
func mapToUserFriendlyError(err error, statusCode int) error {
	if err == nil {
		return nil
	}

	errMsg := err.Error()

	// Rate limiting (429)
	if statusCode == http.StatusTooManyRequests || strings.Contains(strings.ToLower(errMsg), "rate limit") {
		return fmt.Errorf("I'm currently experiencing high traffic or a temporary system issue. Please try again in a moment")
	}

	// Quota exceeded
	if strings.Contains(strings.ToLower(errMsg), "quota exceeded") || strings.Contains(strings.ToLower(errMsg), "exceeded quota") {
		return fmt.Errorf("I'm currently experiencing high traffic or a temporary system issue. Please try again in a moment")
	}

	// Authentication errors (401, 403)
	if statusCode == http.StatusUnauthorized || statusCode == http.StatusForbidden {
		return fmt.Errorf("I'm currently experiencing a configuration issue. Please contact support if this persists")
	}

	// Network/timeout errors
	if netErr, ok := err.(*net.OpError); ok {
		if netErr.Timeout() {
			return fmt.Errorf("I'm currently experiencing connectivity issues. Please try again in a moment")
		}
		return fmt.Errorf("I'm currently unable to connect to the service. Please try again in a moment")
	}

	// Service unavailable (503)
	if statusCode == http.StatusServiceUnavailable {
		return fmt.Errorf("I'm currently experiencing high traffic or a temporary system issue. Please try again in a moment")
	}

	// Bad gateway (502)
	if statusCode == http.StatusBadGateway {
		return fmt.Errorf("I'm currently experiencing a temporary service disruption. Please try again in a moment")
	}

	// Gateway timeout (504)
	if statusCode == http.StatusGatewayTimeout {
		return fmt.Errorf("I'm currently experiencing high traffic or a temporary system issue. Please try again in a moment")
	}

	// Generic connection error
	if strings.Contains(strings.ToLower(errMsg), "connection") || strings.Contains(strings.ToLower(errMsg), "timeout") {
		return fmt.Errorf("I'm currently experiencing connectivity issues. Please try again in a moment")
	}

	// Return original error for non-mappable cases (for debugging)
	return err
}

// GenerateContent calls the LiteLLM proxy with the conversation history
// Production always uses LiteLLM proxy for billing tracking and rate limiting
// If userApiKey is provided, it will be used instead of the environment variable
func GenerateContent(history []map[string]interface{}, systemPrompt string, userApiKey ...string) (string, error) {
	// Use user-provided API key if available, otherwise fall back to environment variable
	var apiKey string
	if len(userApiKey) > 0 && userApiKey[0] != "" {
		apiKey = userApiKey[0]
	} else {
		apiKey = os.Getenv("LITELLM_API_KEY")
	}
	if apiKey == "" {
		return "", fmt.Errorf("LITELLM_API_KEY not set")
	}

	proxyURL := os.Getenv("LITELLM_PROXY_URL")
	if proxyURL == "" {
		return "", fmt.Errorf("LITELLM_PROXY_URL not set")
	}

	model := os.Getenv("LITELLM_MODEL")
	if model == "" {
		model = "gemini-2.0-flash" // Default model
	}

	url := proxyURL + "/v1/chat/completions"

	// Convert to OpenAI chat completion format
	var messages []map[string]string

	// Add system prompt as first message
	if systemPrompt != "" {
		messages = append(messages, map[string]string{
			"role":    "system",
			"content": systemPrompt,
		})
	}

	// Add conversation history
	for _, msg := range history {
		role := fmt.Sprintf("%v", msg["role"])
		content := fmt.Sprintf("%v", msg["content"])

		// Normalize role names (model -> assistant for OpenAI format)
		if role == "model" {
			role = "assistant"
		}

		messages = append(messages, map[string]string{
			"role":    role,
			"content": content,
		})
	}

	requestBody := map[string]interface{}{
		"model":       model,
		"messages":    messages,
		"temperature": 0.0,
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+strings.TrimSpace(apiKey))

	client := &http.Client{
		Timeout: 30 * time.Second,
	}
	resp, err := client.Do(req)
	if err != nil {
		// Log detailed error for debugging
		fmt.Printf("LLM HTTP Error: %v (URL: %s)\n", err, url)
		// Map to user-friendly error
		return "", mapToUserFriendlyError(err, 0)
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != http.StatusOK {
		// Log detailed error for debugging
		fmt.Printf("LLM Proxy Error: Status=%d, Body=%s\n", resp.StatusCode, string(bodyBytes))
		// Try to parse error from LiteLLM
		var errResp OpenAIResponse
		if json.Unmarshal(bodyBytes, &errResp) == nil && errResp.Error != nil {
			technicalErr := fmt.Errorf("litellm proxy error (%d): %s", resp.StatusCode, errResp.Error.Message)
			return "", mapToUserFriendlyError(technicalErr, resp.StatusCode)
		}
		technicalErr := fmt.Errorf("litellm proxy error (%d): %s", resp.StatusCode, string(bodyBytes))
		return "", mapToUserFriendlyError(technicalErr, resp.StatusCode)
	}

	var openaiResp OpenAIResponse
	if err := json.Unmarshal(bodyBytes, &openaiResp); err != nil {
		return "", fmt.Errorf("failed to parse litellm response: %w", err)
	}

	if len(openaiResp.Choices) > 0 {
		return openaiResp.Choices[0].Message.Content, nil
	}

	return "", fmt.Errorf("no content generated from litellm")
}
