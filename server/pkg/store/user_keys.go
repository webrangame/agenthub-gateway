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

// GetUserKeyFromLiteLLM retrieves an existing key for a user from LiteLLM using /user/info
func GetUserKeyFromLiteLLM(proxyURL, masterKey, userID string) (string, error) {
	// Construct URL - use /user/info endpoint (same as frontend)
	url := fmt.Sprintf("%s/user/info?user_id=%s",
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
		return "", fmt.Errorf("failed to call LiteLLM /user/info: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, readErr := io.ReadAll(resp.Body)
		if readErr != nil {
			bodyBytes = []byte("(failed to read response body)")
		}
		fmt.Printf("❌ LiteLLM /user/info failed:\n")
		fmt.Printf("   Status: %d\n", resp.StatusCode)
		fmt.Printf("   URL: %s\n", url)
		fmt.Printf("   Response: %s\n", string(bodyBytes))
		return "", fmt.Errorf("LiteLLM API returned status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var result struct {
		UserID string `json:"user_id"`
		Keys   []struct {
			Key       string  `json:"key"`
			KeyName   string  `json:"key_name"`
			UserID    string  `json:"user_id"`
			Expires   *string `json:"expires"` // Optional expiry date
			MaxBudget float64 `json:"max_budget"`
			Spend     float64 `json:"spend"`
			IsActive  *bool   `json:"is_active"` // Optional active status
			KeyAlias  string  `json:"key_alias"`
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
		fmt.Printf("ℹ️ No key found for userID: %s via /user/info\n", userID)
		return "", nil
	}

	// Filter for active keys only
	var activeKey string
	var activeKeyName string
	for _, k := range result.Keys {
		// Check if key is active (if is_active field exists, it must be true)
		if k.IsActive != nil && !*k.IsActive {
			fmt.Printf("⏭️ Skipping inactive key: %s\n", k.KeyName)
			continue
		}

		// Check if key is not over budget
		if k.MaxBudget > 0 && k.Spend >= k.MaxBudget {
			fmt.Printf("⏭️ Skipping over-budget key: %s (spend: %.2f, budget: %.2f)\n",
				k.KeyName, k.Spend, k.MaxBudget)
			continue
		}

		// If we get here, this is a valid active key
		activeKey = k.Key
		activeKeyName = k.KeyName
		break
	}

	if activeKey == "" {
		fmt.Printf("⚠️ Keys found for userID: %s but none are active/within budget\n", userID)
		return "", nil // No active key found, will trigger key generation
	}

	fmt.Printf("✅ Found active key for userID: %s via /user/info (key_name: %s)\n", userID, activeKeyName)
	return activeKey, nil
}
