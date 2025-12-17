package session

import (
	"sync"
	"time"
)

// SessionState tracks the conversation logic state
type SessionState string

const (
	StateIdle       SessionState = "IDLE"
	StateCollecting SessionState = "COLLECTING"
	StateReady      SessionState = "READY"
	StatePostReport SessionState = "POST_REPORT"
)

// SetState updates the session state
func (s *Session) SetState(st SessionState) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.State = st
}

// Message represents a chat message in history
type Message struct {
	Role    string `json:"role"`    // "user" or "model"
	Content string `json:"content"` // Text content
}

// Session holds the state of a single user conversation
type Session struct {
	ID        string
	State     SessionState
	Variables map[string]string // Extracted data (e.g. "destination": "Paris")
	History   []Message
	LastSeen  time.Time
	mu        sync.Mutex
}

// SessionManager handles session lifecycle
type SessionManager struct {
	sessions map[string]*Session
	mu       sync.RWMutex
}

var GlobalManager *SessionManager

func Init() {
	GlobalManager = &SessionManager{
		sessions: make(map[string]*Session),
	}
}

// GetOrCreate returns an existing session or makes a new one
func (sm *SessionManager) GetOrCreate(id string) *Session {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	if sess, exists := sm.sessions[id]; exists {
		sess.LastSeen = time.Now()
		return sess
	}

	newSess := &Session{
		ID:        id,
		State:     StateIdle,
		Variables: make(map[string]string),
		History:   make([]Message, 0),
		LastSeen:  time.Now(),
	}
	sm.sessions[id] = newSess
	return newSess
}

// AppendMessage safely adds a message to history
func (s *Session) AppendMessage(role, content string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.History = append(s.History, Message{Role: role, Content: content})
}

// GetHistory returns a copy of the history
func (s *Session) GetHistory() []Message {
	s.mu.Lock()
	defer s.mu.Unlock()
	// Return copy to avoid races
	copied := make([]Message, len(s.History))
	copy(copied, s.History)
	return copied
}

// UpdateVariables merges new variables into the session state
func (s *Session) UpdateVariables(updates map[string]string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for k, v := range updates {
		s.Variables[k] = v
	}
}

// GetVariables returns a copy of the current variables
func (s *Session) GetVariables() map[string]string {
	s.mu.Lock()
	defer s.mu.Unlock()
	copied := make(map[string]string)
	for k, v := range s.Variables {
		copied[k] = v
	}
	return copied
}

// Reset clears history but keeps ID
func (s *Session) Reset() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.History = make([]Message, 0)
	s.Variables = make(map[string]string)
	s.State = StateIdle
}
