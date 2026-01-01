package main

import (
	"guardian-gateway/pkg/fastgraph/runtime"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestMemoryConfigPassing(t *testing.T) {
	// 1. Setup Mock Engine
	e := runtime.New()

	var capturedConfig *runtime.MemoryConfig
	var called bool

	e.MockRun = func(agentPath, input string, memory *runtime.MemoryConfig, onEvent func(string)) error {
		capturedConfig = memory
		called = true
		return nil
	}

	// 2. Simulate Config Load (Manual for test)
	mockConfig := &runtime.MemoryConfig{
		Enabled:    true,
		Store:      "vertex",
		ProjectID:  "test-project",
		Location:   "us-central1",
		CorpusName: "projects/123/locations/us-central1/ragCorpora/456",
	}

	// 3. Execute Run
	err := e.Run("test.m", "input", mockConfig, func(s string) {})

	// 4. Assertions
	assert.NoError(t, err)
	assert.True(t, called)
	assert.NotNil(t, capturedConfig)
	assert.Equal(t, "vertex", capturedConfig.Store)
	assert.Equal(t, "test-project", capturedConfig.ProjectID)
	assert.Equal(t, "us-central1", capturedConfig.Location)
}
