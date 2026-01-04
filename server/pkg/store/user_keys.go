package store

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// UserLiteLLMKey represents the mapping between a user and their LiteLLM virtual key
type UserLiteLLMKey struct {
	UserID     string
	LiteLLMKey string
	KeyName    string
	CreatedAt  time.Time
	LastUsedAt *time.Time
	MaxBudget  float64
}

// GenerateLiteLLMKey calls the LiteLLM proxy to generate a new virtual key for a user
func GenerateLiteLLMKey(proxyURL, masterKey, userID string, maxBudget float64) (string, string, error) {
	keyName := fmt.Sprintf("user_%s", userID)

	payload := map[string]interface{}{
		"user_id":         userID,
		"key_alias":       keyName,
		"max_budget":      maxBudget,
		"budget_duration": "monthly",
		"metadata": map[string]string{
			"user_id": userID,
		},
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", "", fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", proxyURL+"/key/generate", bytes.NewBuffer(body))
	if err != nil {
		return "", "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+strings.TrimSpace(masterKey))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("failed to call LiteLLM API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// Read response body for error details
		bodyBytes, readErr := io.ReadAll(resp.Body)
		if readErr != nil {
			bodyBytes = []byte("(failed to read response body)")
		}

		fmt.Printf("❌ LiteLLM /key/generate failed:\n")
		fmt.Printf("   Status: %d\n", resp.StatusCode)
		fmt.Printf("   URL: %s\n", proxyURL+"/key/generate")
		fmt.Printf("   Response: %s\n", string(bodyBytes))
		fmt.Printf("   MasterKey length: %d chars\n", len(strings.TrimSpace(masterKey)))

		return "", "", fmt.Errorf("LiteLLM API returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var result struct {
		Key string `json:"key"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", "", fmt.Errorf("failed to decode response: %w", err)
	}

	return result.Key, keyName, nil
}

// GetUserKeyFromLiteLLM retrieves an existing key for a user from LiteLLM using /key/list
func GetUserKeyFromLiteLLM(proxyURL, masterKey, userID string) (string, error) {
	// Construct URL with query parameters
	url := fmt.Sprintf("%s/key/list?user_id=%s&sort_by=created_at&sort_order=desc&limit=1",
		strings.TrimSpace(proxyURL), userID)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+strings.TrimSpace(masterKey))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to call LiteLLM /key/list: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, readErr := io.ReadAll(resp.Body)
		if readErr != nil {
			bodyBytes = []byte("(failed to read response body)")
		}
		fmt.Printf("❌ LiteLLM /key/list failed:\n")
		fmt.Printf("   Status: %d\n", resp.StatusCode)
		fmt.Printf("   URL: %s\n", url)
		fmt.Printf("   Response: %s\n", string(bodyBytes))
		return "", fmt.Errorf("LiteLLM API returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var result struct {
		Keys []struct {
			Key     string `json:"key"`
			KeyName string `json:"key_name"`
			UserID  string `json:"user_id"`
		} `json:"keys"`
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	if err := json.Unmarshal(bodyBytes, &result); err != nil {
		return "", fmt.Errorf("failed to decode response: %w", err)
	}

	// If no keys found, return empty string (not an error)
	if len(result.Keys) == 0 {
		fmt.Printf("ℹ️ No key found for userID: %s via /key/list\n", userID)
		return "", nil
	}

	// Return the first (most recent) key
	key := result.Keys[0].Key
	fmt.Printf("✅ Found key for userID: %s via /key/list (key_name: %s)\n", userID, result.Keys[0].KeyName)
	return key, nil
}
