package api

import (
	"context"
	"encoding/json"
	"fmt"
	"guardian-gateway/pkg/fastgraph/runtime"
	"guardian-gateway/pkg/logic"
	"guardian-gateway/pkg/store"
	"os"

	"gopkg.in/yaml.v2"
)

// ProcessAndSaveFeed processes an event and saves it to the DB
func (s *Server) ProcessAndSaveFeed(ctx context.Context, deviceID string, eventJSON string, destination string, nodeImages map[string]string) {
	fmt.Printf("DEBUG: ProcessAndSaveFeed - Event: %s\n", eventJSON)

	// 1. Parse Event
	var evt struct {
		Node    string `json:"node"`
		Message string `json:"message"`
		Text    string `json:"text"`
		Type    string `json:"type"`
	}
	if err := json.Unmarshal([]byte(eventJSON), &evt); err != nil {
		fmt.Printf("Error parsing event JSON: %v\n", err)
		return
	}

	content := evt.Message
	if content == "" {
		content = evt.Text
	}

	// 2. Map to Card Card
	msg := content
	if evt.Node != "" {
		msg = fmt.Sprintf("%s: %s", evt.Node, content)
	}

	// Use Logic Package
	cardType, priority, data := logic.MapToCard(msg, destination)

	// 3. Refine Logic
	// Add node name to data for debugging/filtering
	if evt.Node != "" {
		data["node"] = evt.Node
		// Special handling for "GenerateReport" - ensure title reflects it if not caught
		if evt.Node == "GenerateReport" {
			data["title"] = "GenerateReport"
		}
	}

	// Refine Card Type in-place
	logic.RefineCardType(data["title"].(string), msg, &cardType, &priority, data, destination)

	// --- UNSPLASH CACHING LOGIC ---
	// Logic: If this node already has an image cached, USE IT to prevent flicker/changing images
	// If not, and we generated one, CACHE IT.
	if evt.Node != "" {
		if cachedImg, ok := nodeImages[evt.Node]; ok {
			// Found in cache! Override whatever logic.fetchUnsplashImage found
			if cachedImg != "" {
				data["imageUrl"] = cachedImg
				// Note: We aren't caching user attribution links here for simplicity,
				// but you could expand the cache value to be a struct.
				fmt.Printf("🖼️ Using CACHED image for node '%s': %s\n", evt.Node, cachedImg)
			}
		} else {
			// Not in cache. Did we generate one?
			if imgUrl, ok := data["imageUrl"].(string); ok && imgUrl != "" {
				// Cache it!
				nodeImages[evt.Node] = imgUrl
				fmt.Printf("💾 CACHING image for node '%s': %s\n", evt.Node, imgUrl)
			}
		}
	}
	// ------------------------------

	// 4. Save to DB
	card := &store.Card{
		CardType:   cardType,
		Priority:   priority, // "high", "medium", "low"
		SourceNode: evt.Node, // Store source node for sticky Logic
		Data:       data,
	}

	// Use Upsert to handle "sticky" updates for same node
	if err := s.Store.UpsertCard(ctx, deviceID, card); err != nil {
		fmt.Printf("Error saving card to DB: %v\n", err)
	} else {
		fmt.Printf("Saved card to DB: %v (Priority: %s)\n", card.Data["title"], card.Priority)
	}
}

// LoadMemoryConfig loads memory configuration
func LoadMemoryConfig() *runtime.MemoryConfig {
	data, err := os.ReadFile("policy.yaml")
	if err != nil {
		return nil
	}
	var policy struct {
		Memory runtime.MemoryConfig `yaml:"memory"`
	}
	if err := yaml.Unmarshal(data, &policy); err != nil {
		return nil
	}
	return &policy.Memory
}

// StartScheduledExecution starts a scheduled agent
func (s *Server) StartScheduledExecution(agentPath string, schedule *runtime.ScheduleInfo) {
	fmt.Printf("Starting scheduled execution for %s (Every %s)\n", agentPath, schedule.Interval)
	// TODO: Implement actual cron/ticker
	// For now, just run once as checking
}
