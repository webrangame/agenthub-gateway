package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"strings"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	// Original URL for 'postgres' maintenance connection
	baseConnStr := "postgresql://postgres:it371Ananda@agent-marketplace-db.cmt466aga8u0.us-east-1.rds.amazonaws.com:5432/postgres?sslmode=require"

	ctx := context.Background()

	// 1. Connect to Maintenance DB
	fmt.Println("Connecting to maintenance DB...")
	db, err := sql.Open("pgx", baseConnStr)
	if err != nil {
		log.Fatalf("Failed to open maintenance connection: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping maintenance DB: %v", err)
	}
	fmt.Println("Connected to 'postgres'. Checking for 'tg_cards'...")

	// 2. Create Database if not exists
	var exists bool
	err = db.QueryRow("SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = 'tg_cards')").Scan(&exists)
	if err != nil {
		log.Fatalf("Failed to check database existence: %v", err)
	}

	if !exists {
		fmt.Println("Creating database 'tg_cards'...")
		_, err = db.Exec("CREATE DATABASE tg_cards")
		if err != nil {
			log.Fatalf("Failed to create database: %v", err)
		}
		fmt.Println("Database created.")
	} else {
		fmt.Println("Database 'tg_cards' already exists.")
	}

	if err := db.Close(); err != nil {
		log.Printf("Warning: failed to close maintenance DB connection: %v", err)
	}

	// 3. Connect to New DB
	// 3. Connect to New DB
	// Explicitly construct string to avoid replace errors
	targetConnStr := "postgresql://postgres:it371Ananda@agent-marketplace-db.cmt466aga8u0.us-east-1.rds.amazonaws.com:5432/tg_cards?sslmode=require"
	fmt.Printf("DEBUG: Target Connection String: %s\n", strings.Replace(targetConnStr, "it371Ananda", "***", 1))

	targetDB, err := sql.Open("pgx", targetConnStr)
	if err != nil {
		log.Fatalf("Failed to open target connection: %v", err)
	}
	defer targetDB.Close()

	if err := targetDB.Ping(); err != nil {
		log.Fatalf("Failed to ping target DB: %v", err)
	}

	// 4. Schema Migration
	schema := `
	CREATE TABLE IF NOT EXISTS cards (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		owner_id TEXT NOT NULL,
		card_type TEXT NOT NULL,
		priority TEXT NOT NULL,
		source_node TEXT NOT NULL,
		content JSONB NOT NULL DEFAULT '{}',
		created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
		updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	);

	CREATE INDEX IF NOT EXISTS idx_cards_owner_created ON cards (owner_id, created_at DESC);
	CREATE INDEX IF NOT EXISTS idx_cards_owner_node ON cards (owner_id, source_node);
	`

	fmt.Println("Applying schema migration...")
	_, err = targetDB.ExecContext(ctx, schema)
	if err != nil {
		log.Fatalf("Failed to apply schema: %v", err)
	}

	fmt.Println("✅ Database setup validation complete!")
}
