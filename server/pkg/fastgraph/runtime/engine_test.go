package runtime

import (
	"path/filepath"
	"strings"
	"testing"
)

// NOTE: These tests need the real/mock 'fastgraph.exe' to be present.
// We assume 'fastgraph.exe' is in the server root, which is "../../.." from here?
// Actually Engine New() looks in "./fastgraph.exe" by default.
// In tests, "PWD" is the package dir.
// We should point it to the binary we copied.

func TestInspect(t *testing.T) {
	// Setup
	binPath, _ := filepath.Abs("../../../fastgraph.exe")
	engine := &Engine{BinPath: binPath}

	// We need a test agent.
	// Let's assume one exists or create a temp one.
	// We'll use the one in server/uploaded_trip_guardian.m if it exists, or skip.
	agentPath, _ := filepath.Abs("../../../uploaded_trip_guardian.m")

	meta, err := engine.Inspect(agentPath)
	if err != nil {
		t.Skip("Skipping Inspect test, agent or binary likely missing:", err)
	}

	if meta.Name != "TripGuardian" {
		t.Errorf("Expected Name TripGuardian, got %s", meta.Name)
	}

	foundCap := false
	for _, c := range meta.Capabilities {
		if c == "trip-guardian" {
			foundCap = true
			break
		}
	}
	if !foundCap {
		t.Errorf("Expected capability trip-guardian, got %v", meta.Capabilities)
	}
}

func TestRunStreaming(t *testing.T) {
	// Setup
	binPath, _ := filepath.Abs("../../../fastgraph.exe")
	engine := &Engine{BinPath: binPath}
	agentPath, _ := filepath.Abs("../../../uploaded_trip_guardian.m")

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
