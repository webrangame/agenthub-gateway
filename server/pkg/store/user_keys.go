package store

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
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

// GetUserLiteLLMKey retrieves a user's LiteLLM key from the database
func (s *PostgresStore) GetUserLiteLLMKey(ctx context.Context, userID string) (string, error) {
	var key string
	var lastUsedAt sql.NullTime

	query := `SELECT litellm_key, last_used_at FROM user_litellm_keys WHERE user_id = $1`
	err := s.DB.QueryRowContext(ctx, query, userID).Scan(&key, &lastUsedAt)

	if err == sql.ErrNoRows {
		return "", nil // Key not found
	}
	if err != nil {
		return "", fmt.Errorf("failed to query user key: %w", err)
	}

	// Update last_used_at
	_, _ = s.DB.ExecContext(ctx, `UPDATE user_litellm_keys SET last_used_at = NOW() WHERE user_id = $1`, userID)

	return key, nil
}

// StoreUserLiteLLMKey saves a user's LiteLLM key to the database
func (s *PostgresStore) StoreUserLiteLLMKey(ctx context.Context, userID, key, keyName string, maxBudget float64) error {
	query := `
		INSERT INTO user_litellm_keys (user_id, litellm_key, key_name, max_budget, created_at)
		VALUES ($1, $2, $3, $4, NOW())
		ON CONFLICT (user_id) DO UPDATE 
		SET litellm_key = EXCLUDED.litellm_key, key_name = EXCLUDED.key_name
	`
	_, err := s.DB.ExecContext(ctx, query, userID, key, keyName, maxBudget)
	if err != nil {
		return fmt.Errorf("failed to store user key: %w", err)
	}
	return nil
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

	req.Header.Set("Authorization", "Bearer "+masterKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("failed to call LiteLLM API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", "", fmt.Errorf("LiteLLM API returned status %d", resp.StatusCode)
	}

	var result struct {
		Key string `json:"key"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", "", fmt.Errorf("failed to decode response: %w", err)
	}

	return result.Key, keyName, nil
}
