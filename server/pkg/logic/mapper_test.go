package logic

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestExtractCountry(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"Delhi, India", "India"},
		{"Paris, France", "France"},
		{"London, UK", "UK"},
		{"Colombo, Sri Lanka", "Sri Lanka"},
		{"Japan", "Japan"},
		{"", ""},
		{"City, State, Country", "Country"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := ExtractCountry(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestCleanMessage(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"SAFETY: Avoid the area.", " Avoid the area."},
		{"NewsAlert: Breaking News", "NewsAlert: Breaking News"}, // CleanMessage only removes prefixes list, distinct from Mapper prefix logic
		{"SAFETY: CULTURE: REPORT: Multiple prefixes", "   Multiple prefixes"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := CleanMessage(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestExtractTextFromEvent(t *testing.T) {
	// Case 1: Simple Message
	json1 := `{"message": "Hello World"}`
	assert.Equal(t, "Hello World", ExtractTextFromEvent(json1))

	// Case 2: Nested Text (Agent Node output)
	json2 := `{"message": "{\"text\": \"Inner Text\"}"}`
	assert.Equal(t, "Inner Text", ExtractTextFromEvent(json2))

	// Case 3: Invalid JSON
	assert.Equal(t, "", ExtractTextFromEvent("invalid"))
}

func TestMapToCard(t *testing.T) {
	// This test mock/checks basic logic.
	// Note: FetchUnsplashImage will be called, which might try to hit API unless we mock it or set env.
	// For unit testing pure logic, we might want to dependency inject external calls, but for now we accept it might fail or we skip network parts.
	// Actually, MapToCard hardcodes calls to FetchUnsplashImage. This is a refactoring candidate (Dependency Injection).
	// For now, we test cases that DON'T trigger images or ignore image output.

	msg := "NewsAlert: This is a test alert"
	cardType, priority, data := MapToCard(msg, "Test Dest")

	assert.Equal(t, "safe_alert", cardType)
	assert.Equal(t, "high", priority)
	assert.Equal(t, "This is a test alert", data["summary"])
	assert.Equal(t, "Safety", data["category"])
}
