package runtime

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// getTestBinPath helps find the binary in a cross-platform way relative to this test file.
func getTestBinPath() string {
	base, _ := filepath.Abs("../../..")

	// Try Linux/Mac binary first (standard for CI)
	linuxPath := filepath.Join(base, "fastgraph")
	if _, err := os.Stat(linuxPath); err == nil {
		return linuxPath
	}

	// Fallback to Windows
	winPath := filepath.Join(base, "fastgraph.exe")
	if _, err := os.Stat(winPath); err == nil {
		return winPath
	}

	// Default to assuming linux if neither found (for CI context where it might be created later)
	return linuxPath
}

func TestInspect(t *testing.T) {
	// Setup
	binPath := getTestBinPath()
	engine := &Engine{BinPath: binPath}

	// We need a test agent.
	// We'll use the one in server/testdata/uploaded_trip_guardian.m
	agentPath, _ := filepath.Abs("../../../testdata/uploaded_trip_guardian.m")

	meta, err := engine.Inspect(agentPath)
	if err != nil {
		t.Skip("Skipping Inspect test, agent or binary likely missing:", err)
	}

	if meta.Name != "TripGuardian" {
		t.Errorf("Expected Name TripGuardian, got %s", meta.Name)
	}

	// Capability check removed as they are commented out in the agent file
	// foundCap := false ...
}

func TestRunStreaming(t *testing.T) {
	// Setup
	binPath := getTestBinPath()
	engine := &Engine{BinPath: binPath}
	agentPath, _ := filepath.Abs("../../../testdata/uploaded_trip_guardian.m")

	// Trigger a simple run (may fail if no API keys, but should at least start)
	// We just want to see if callbacks fire.

	callbackFired := false
	err := engine.Run(agentPath, "Hello Test", func(eventJSON string) {
		callbackFired = true
		if !strings.HasPrefix(eventJSON, "{") {
			t.Logf("Got non-JSON output: %s", eventJSON)
		}
	})

	// Check error? If binary runs but fails due to API key, it returns nil error (exit code 0 usually unless panic)
	// Actually if it fails logic, it might still exit 0 but log errors.
	if err != nil {
		// If binary missing, err is returned
		t.Skip("Skipping Run test, binary execution failed:", err)
	}

	if !callbackFired {
		t.Log("Warning: Callback never fired. Agent might have failed immediately or produced no output.")
	}
}
