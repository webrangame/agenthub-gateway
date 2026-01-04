package main

import (
	"context"
	"fmt"
	"guardian-gateway/pkg/api"
	"guardian-gateway/pkg/fastgraph/runtime"
	"guardian-gateway/pkg/llm"
	"guardian-gateway/pkg/session"
	"guardian-gateway/pkg/store"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq" // Postgres driver

	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	_ "guardian-gateway/docs" // Import generated docs
)

// @title           AiGuardian Gateway API
// @version         1.0
// @description     This is the gateway service for the AiGuardian application.
// @host            localhost:8080
// @BasePath        /

func main() {
	// Initialize context
	ctx := context.Background()

	// Load .env
	if err := godotenv.Load(); err != nil {
		fmt.Println("Warning: No .env file found (using system env vars)")
	}

	// Connect to Database (PostgreSQL)
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		// Fallback for local testing
		dbHost := os.Getenv("DB_HOST")
		dbUser := os.Getenv("DB_USER")
		dbPass := os.Getenv("DB_PASS")
		dbName := os.Getenv("DB_NAME")
		if dbHost != "" {
			dbURL = fmt.Sprintf("postgres://%s:%s@%s/%s?sslmode=disable", dbUser, dbPass, dbHost, dbName)
		} else {
			dbURL = "postgres://postgres:password@localhost:5432/guardian_db?sslmode=disable"
		}
	}

	fmt.Println("Connecting to Database...")
	// store.NewPostgresStore checks connection with Ping
	feedStore, err := store.NewPostgresStore(ctx, dbURL)
	if err != nil {
		// Non-fatal for now allows server to start, but handlers will fail
		fmt.Printf("⚠️ Failed to connect to database: %v\n", err)
		// Retry logic could go here
	} else {
		fmt.Println("✅ Database Connected!")
	}

	// Initialize FastGraph Engine
	// Initialize FastGraph Engine
	engine := runtime.New()

	// Initialize Session Manager
	session.Init()

	// Initialize API Server
	// Wrap llm.GenerateContent to match the expected signature
	genFunc := func(history []map[string]interface{}, systemPrompt, apiKey string) (string, error) {
		if apiKey != "" {
			return llm.GenerateContent(history, systemPrompt, apiKey)
		}
		return llm.GenerateContent(history, systemPrompt)
	}
	server := api.NewServer(engine, feedStore, genFunc)

	// Setup Router
	r := gin.Default()

	// CORS Configuration
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization", "X-User-ID", "X-Device-ID", "X-LiteLLM-API-Key"}
	r.Use(cors.New(config))

	// Routes
	r.GET("/health", server.HealthHandler)

	// Feed Routes
	r.GET("/api/feed", server.GetFeedHandler)
	r.DELETE("/api/feed", server.ClearFeedHandler)

	// Agent Routes
	r.POST("/api/agent/upload", server.UploadAgentHandler)

	// GET /api/feed/stream (SSE)
	r.GET("/api/feed/stream", server.FeedStreamHandler)

	// Chat Route (Streaming)
	r.POST("/api/chat/stream", server.ChatStreamHandler)

	// Swagger Docs
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
	}

	fmt.Printf("Gateway running on port %s\n", port)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("listen: %s\n", err)
	}
}
