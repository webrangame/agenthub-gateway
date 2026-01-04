package api

import (
	"guardian-gateway/pkg/fastgraph/runtime"
	"guardian-gateway/pkg/store"
	"sync" // Added sync
)

// Server holds dependencies for API handlers
type Server struct {
	Engine              *runtime.Engine
	Store               *store.PostgresStore
	GenerateContentFunc func(history []map[string]interface{}, systemPrompt, apiKey string) (string, error)

	// Feed streaming subscribers (SSE)
	FeedSubMu       sync.Mutex
	FeedSubscribers map[string]map[chan struct{}]struct{}
}

// NewServer creates a new Server instance
func NewServer(engine *runtime.Engine, store *store.PostgresStore, genFunc func([]map[string]interface{}, string, string) (string, error)) *Server {
	return &Server{
		Engine:              engine,
		Store:               store,
		GenerateContentFunc: genFunc,
		FeedSubscribers:     make(map[string]map[chan struct{}]struct{}),
	}
}

func (s *Server) SubscribeFeed(ownerID string, ch chan struct{}) {
	s.FeedSubMu.Lock()
	defer s.FeedSubMu.Unlock()
	if s.FeedSubscribers[ownerID] == nil {
		s.FeedSubscribers[ownerID] = map[chan struct{}]struct{}{}
	}
	s.FeedSubscribers[ownerID][ch] = struct{}{}
}

func (s *Server) UnsubscribeFeed(ownerID string, ch chan struct{}) {
	s.FeedSubMu.Lock()
	defer s.FeedSubMu.Unlock()
	if subs, ok := s.FeedSubscribers[ownerID]; ok {
		delete(subs, ch)
		if len(subs) == 0 {
			delete(s.FeedSubscribers, ownerID)
		}
	}
}

func (s *Server) PublishFeedUpdate(ownerID string) {
	s.FeedSubMu.Lock()
	subs := s.FeedSubscribers[ownerID]
	s.FeedSubMu.Unlock()
	for ch := range subs {
		// Non-blocking notify; drop if buffer full.
		select {
		case ch <- struct{}{}:
		default:
		}
	}
}
