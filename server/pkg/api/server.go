package api

import (
	"guardian-gateway/pkg/fastgraph/runtime"
	"guardian-gateway/pkg/store"
)

// Server holds dependencies for API handlers
type Server struct {
	Engine              *runtime.Engine
	Store               *store.PostgresStore
	GenerateContentFunc func(history []map[string]interface{}, systemPrompt, apiKey string) (string, error)
}

// NewServer creates a new Server instance
func NewServer(engine *runtime.Engine, store *store.PostgresStore, genFunc func([]map[string]interface{}, string, string) (string, error)) *Server {
	return &Server{
		Engine:              engine,
		Store:               store,
		GenerateContentFunc: genFunc,
	}
}
