package models

// FeedItem represents a card in the Insight Stream
// This is the domain model used across the application.
type FeedItem struct {
	ID         string                 `json:"id"`
	CardType   string                 `json:"card_type"`
	Priority   string                 `json:"priority"`
	Timestamp  string                 `json:"timestamp"`
	SourceNode string                 `json:"source_node"`
	Data       map[string]interface{} `json:"data"`
}
