package session

import (
	"sync"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGetOrCreate(t *testing.T) {
	Init()
	// Test New
	s1 := GlobalManager.GetOrCreate("user1")
	assert.NotNil(t, s1)
	assert.Equal(t, "user1", s1.ID)
	assert.Equal(t, StateIdle, s1.State)

	// Test Existing
	s1.State = StateCollecting
	s2 := GlobalManager.GetOrCreate("user1")
	assert.Equal(t, s1, s2)
	assert.Equal(t, StateCollecting, s2.State)
}

func TestSessionLifecycle(t *testing.T) {
	Init()
	s := GlobalManager.GetOrCreate("lifecycle_user")

	// State
	s.SetState(StateReady)
	assert.Equal(t, StateReady, s.State)

	// Variables
	s.UpdateVariables(map[string]string{"foo": "bar"})
	vars := s.GetVariables()
	assert.Equal(t, "bar", vars["foo"])

	// Immutability of GetVariables return
	vars["foo"] = "modified"
	assert.Equal(t, "bar", s.GetVariables()["foo"])

	// History
	s.AppendMessage("user", "hi")
	hist := s.GetHistory()
	assert.Len(t, hist, 1)
	assert.Equal(t, "hi", hist[0].Content)

	// Reset
	s.Reset()
	assert.Empty(t, s.GetHistory())
	assert.Empty(t, s.GetVariables())
	assert.Equal(t, StateIdle, s.State)
}

func TestConcurrentAccess(t *testing.T) {
	Init()
	s := GlobalManager.GetOrCreate("conc_user")
	var wg sync.WaitGroup

	// Write concurrently
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			s.AppendMessage("user", "test")
			s.UpdateVariables(map[string]string{"k": "v"})
		}()
	}

	wg.Wait()
	assert.Len(t, s.GetHistory(), 100)
}
