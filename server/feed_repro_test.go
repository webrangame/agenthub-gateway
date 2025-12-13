package main

import (
	"fmt"
	"testing"
	"time"
)

// Mock structures to match main.go
type FeedItemMock struct {
	ID         string
	SourceNode string
	Data       map[string]interface{}
}

var currentFeedMock []FeedItemMock

func processFeedMock(node, text string) {
	// SIMULATED LOGIC FROM MAIN.GO
	incomingNode := node
	cleanText := text

	searchLimit := 5
	if len(currentFeedMock) < searchLimit {
		searchLimit = len(currentFeedMock)
	}

	for i := 0; i < searchLimit; i++ {
		item := &currentFeedMock[i]

		match := false
		if incomingNode != "" {
			if item.SourceNode == incomingNode {
				match = true
			}
		}
		// Ignore fallback for this test, focusing on ID match

		if match {
			// Found the card! Append.
			lastSummary, _ := item.Data["summary"].(string)
			item.Data["summary"] = lastSummary + cleanText
			return
		}
	}

	// Create New
	newItem := FeedItemMock{
		ID:         fmt.Sprintf("evt-%d", time.Now().UnixNano()),
		SourceNode: incomingNode,
		Data: map[string]interface{}{
			"summary": cleanText,
		},
	}
	currentFeedMock = append([]FeedItemMock{newItem}, currentFeedMock...)
}

func TestFeedAggregation(t *testing.T) {
	currentFeedMock = []FeedItemMock{}

	// Step 1: Node A
	processFeedMock("NodeA", "Chunk1")
	if len(currentFeedMock) != 1 {
		t.Fatalf("Expected 1 item, got %d", len(currentFeedMock))
	}
	if currentFeedMock[0].Data["summary"] != "Chunk1" {
		t.Errorf("Expected Chunk1, got %v", currentFeedMock[0].Data["summary"])
	}

	// Step 2: Node B (Interleaved)
	processFeedMock("NodeB", "Chunk2")
	if len(currentFeedMock) != 2 {
		t.Fatalf("Expected 2 items, got %d", len(currentFeedMock))
	}
	// Index 0 should be B, Index 1 should be A
	if currentFeedMock[0].SourceNode != "NodeB" {
		t.Errorf("Top item should be NodeB")
	}

	// Step 3: Node A (again) -> Should find Index 1 and append
	processFeedMock("NodeA", "Chunk3")

	// CRITICAL CHECK
	if len(currentFeedMock) != 2 {
		t.Errorf("FAILURE: Expected 2 items (aggregation), got %d. It created a new card!", len(currentFeedMock))
	} else {
		// Verify append
		// Node A is at Index 1 (older)
		if currentFeedMock[1].SourceNode != "NodeA" {
			t.Errorf("Index 1 should be NodeA")
		}
		expected := "Chunk1Chunk3"
		got := currentFeedMock[1].Data["summary"]
		if got != expected {
			t.Errorf("Aggregation failed. Expected '%s', got '%s'", expected, got)
		}
	}
}
