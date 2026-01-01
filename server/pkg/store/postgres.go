package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

// PostgresStore implements the persistence layer for the Insight Stream
type PostgresStore struct {
	DB *sql.DB
}

type Card struct {
	ID         string                 `json:"id"`
	OwnerID    string                 `json:"-"` // Internal use
	CardType   string                 `json:"card_type"`
	Priority   string                 `json:"priority"`
	Timestamp  string                 `json:"timestamp"`
	SourceNode string                 `json:"source_node"`
	Data       map[string]interface{} `json:"data"`
}

func NewPostgresStore(connStr string) (*PostgresStore, error) {
	db, err := sql.Open("pgx", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open db: %w", err)
	}
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping db: %w", err)
	}
	return &PostgresStore{DB: db}, nil
}

// UpsertCard inserts a new card or updates an existing "sticky" card from the same node
func (s *PostgresStore) UpsertCard(ctx context.Context, ownerID string, card *Card) error {
	// 1. Serialization
	contentJSON, err := json.Marshal(card.Data)
	if err != nil {
		return fmt.Errorf("failed to marshal content: %w", err)
	}

	// 2. Sticky Logic: Check for a recent card from this Node/Owner
	// We update if < 1 hour old (session window), otherwise we treat as new.
	// This matches the "resetThreshold" logic but persistent.
	query := `
		INSERT INTO cards (owner_id, card_type, priority, source_node, content, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
		ON CONFLICT (id) DO NOTHING 
		RETURNING id; 
	`
	// Note: We are NOT using ON CONFLICT (node) because we want multiple cards over time.
	// Instead, we try to UPDATE first.

	updateQuery := `
		UPDATE cards 
		SET content = $1, updated_at = NOW(), priority = $2, card_type = $3
		WHERE id = (
			SELECT id FROM cards 
			WHERE owner_id = $4 AND source_node = $5 
			AND updated_at > NOW() - INTERVAL '60 minutes'
			ORDER BY updated_at DESC
			LIMIT 1
		)
		RETURNING id;
	`

	var id string
	// Try Update First
	err = s.DB.QueryRowContext(ctx, updateQuery, contentJSON, card.Priority, card.CardType, ownerID, card.SourceNode).Scan(&id)

	if err == sql.ErrNoRows {
		// No recent card found -> Insert New
		_, err = s.DB.ExecContext(ctx, query, ownerID, card.CardType, card.Priority, card.SourceNode, contentJSON)
		if err != nil {
			return fmt.Errorf("failed to insert card: %w", err)
		}
	} else if err != nil {
		return fmt.Errorf("failed to update card: %w", err)
	}

	return nil
}

func (s *PostgresStore) GetFeed(ctx context.Context, ownerID string, limit int) ([]*Card, error) {
	query := `
		SELECT id, card_type, priority, source_node, content, updated_at
		FROM cards
		WHERE owner_id = $1
		ORDER BY updated_at DESC
		LIMIT $2
	`

	rows, err := s.DB.QueryContext(ctx, query, ownerID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	// Initialize as empty slice so JSON is [] not null
	feed := []*Card{}
	for rows.Next() {
		var c Card
		var contentBytes []byte
		var ts time.Time

		if err := rows.Scan(&c.ID, &c.CardType, &c.Priority, &c.SourceNode, &contentBytes, &ts); err != nil {
			return nil, err
		}

		if err := json.Unmarshal(contentBytes, &c.Data); err != nil {
			continue // Skip bad data
		}
		c.Timestamp = ts.Format(time.RFC3339)
		feed = append(feed, &c)
	}

	fmt.Printf("DEBUG: GetFeed found %d cards for %s\n", len(feed), ownerID)
	return feed, nil
}

// DeleteFeed removes all cards for a specific user/device
func (s *PostgresStore) DeleteFeed(ctx context.Context, ownerID string) error {
	query := `DELETE FROM cards WHERE owner_id = $1`
	res, err := s.DB.ExecContext(ctx, query, ownerID)
	if err != nil {
		return err
	}
	rows, _ := res.RowsAffected()
	fmt.Printf("DEBUG: DeleteFeed removed %d rows for %s\n", rows, ownerID)
	return nil
}
