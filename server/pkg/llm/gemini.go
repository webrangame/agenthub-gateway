package llm

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

// GeminiResponse is a partial struct for parsing Gemini API response
type GeminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
}

// GenerateContent calls the Gemini API (gemini-1.5-flash) with the conversation history
func GenerateContent(history []map[string]interface{}, systemPrompt string) (string, error) {
	apiKey := os.Getenv("GOOGLE_API_KEY")
	if apiKey == "" {
		return "", fmt.Errorf("GOOGLE_API_KEY not set")
	}

	url := "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey

	// Construct request body compliant with Gemini API
	// https://ai.google.dev/api/rest/v1beta/models/generateContent

	// Prepend system prompt as a "user" message or properly if using beta features.
	// For simplicity with 1.5-flash, we can prepend it to context or use the new system_instruction field if supported by the endpoint version.
	// We'll trust the standard "messages" array style structure translated to Gemini "contents".

	var contents []map[string]interface{}

	// Add System Prompt as the first "user" message (common workaround) or just rely on context
	// Actually, Gemini supports "system_instruction" in the JSON body now.

	// Convert history to Gemini "role" + "parts" format
	for _, msg := range history {
		role := "user"
		if msg["role"] == "model" || msg["role"] == "assistant" {
			role = "model"
		}

		contents = append(contents, map[string]interface{}{
			"role": role,
			"parts": []map[string]string{
				{"text": fmt.Sprintf("%v", msg["content"])},
			},
		})
	}

	requestBody := map[string]interface{}{
		"contents": contents,
		"system_instruction": map[string]interface{}{
			"parts": []map[string]string{
				{"text": systemPrompt},
			},
		},
		"generationConfig": map[string]interface{}{
			"temperature": 0.0, // Set to 0 for deterministic routing logic
		},
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return "", err
	}

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("gemini api error: %d - %s", resp.StatusCode, string(bodyBytes))
	}

	var geminiResp GeminiResponse
	if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err != nil {
		return "", err
	}

	if len(geminiResp.Candidates) > 0 && len(geminiResp.Candidates[0].Content.Parts) > 0 {
		return geminiResp.Candidates[0].Content.Parts[0].Text, nil
	}

	return "", fmt.Errorf("no content generated")
}
