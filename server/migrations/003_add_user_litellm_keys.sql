-- Migration: Add user_litellm_keys table
-- This stores the mapping between user IDs and their LiteLLM virtual keys

CREATE TABLE IF NOT EXISTS user_litellm_keys (
    user_id VARCHAR(255) PRIMARY KEY,
    litellm_key VARCHAR(255) NOT NULL,
    key_name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP,
    max_budget DECIMAL(10,2) DEFAULT 10.00
);

CREATE INDEX IF NOT EXISTS idx_litellm_key ON user_litellm_keys(litellm_key);

-- For quick lookup by key (if needed for reverse mapping)
CREATE INDEX IF NOT EXISTS idx_key_name ON user_litellm_keys(key_name);
