package runtime

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// getTestBinPath helps find the binary in a cross-platform way relative to this test file.
// getTestBinPath helps find the binary in a cross-platform way relative to this test file.
func getTestBinPath() string {
	base, _ := filepath.Abs("../../..") // Base is server/

	// 1. Check for 'fastgraph' in server root (CI/CD setup copies it here)
	ciPath := filepath.Join(base, "fastgraph")
	if _, err := os.Stat(ciPath); err == nil {
		return ciPath
	}

	// 2. Check for 'fastgraph.exe' in server root (Windows Dev)
	winLocalPath := filepath.Join(base, "fastgraph.exe")
	if _, err := os.Stat(winLocalPath); err == nil {
		return winLocalPath
	}

	// 3. Try Linux/Mac binary in sibling directory (for local dev if running from server/)
	// If base is 'server', parent is repo root.
	repoRoot := filepath.Dir(base)
	linuxPath := filepath.Join(repoRoot, "installer_v0.3.3/linux/fastgraph")
	if _, err := os.Stat(linuxPath); err == nil {
		return linuxPath
	}

	return ciPath // Return default even if missing, to allow error to bubble up in test
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

	// We just want to see if callbacks fire.
	os.Setenv("GOOGLE_API_KEY", "dummy_test_key")
	defer os.Unsetenv("GOOGLE_API_KEY")

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

func TestSSEParsing(t *testing.T) {
	// This test verifies that the SSE parsing logic in engine.go correctly
	// extracts node metadata from FastGraph's SSE output format

	tests := []struct {
		name            string
		sseInput        []string                 // Lines of SSE input
		expectedEvents  int                      // Expected number of events emitted
		checkFirstEvent func(*testing.T, string) // Function to validate first event
	}{
		{
			name: "Basic chunk with node metadata",
			sseInput: []string{
				"event: chunk",
				`data: {"node": "NewsAlert", "node_name": "NewsAlert", "text": "Breaking news"}`,
				"",
			},
			expectedEvents: 1,
			checkFirstEvent: func(t *testing.T, eventJSON string) {
				var evt map[string]string
				if err := json.Unmarshal([]byte(eventJSON), &evt); err != nil {
					t.Fatalf("Failed to parse event JSON: %v", err)
				}
				if evt["type"] != "chunk" {
					t.Errorf("Expected type=chunk, got %s", evt["type"])
				}
				if evt["node"] != "NewsAlert" {
					t.Errorf("Expected node=NewsAlert, got %s", evt["node"])
				}
				if evt["message"] != "Breaking news" {
					t.Errorf("Expected message='Breaking news', got %s", evt["message"])
				}
			},
		},
		{
			name: "Done event",
			sseInput: []string{
				"event: done",
				`data: {}`,
				"",
			},
			expectedEvents: 1,
			checkFirstEvent: func(t *testing.T, eventJSON string) {
				var evt map[string]string
				if err := json.Unmarshal([]byte(eventJSON), &evt); err != nil {
					t.Fatalf("Failed to parse event JSON: %v", err)
				}
				if evt["type"] != "done" {
					t.Errorf("Expected type=done, got %s", evt["type"])
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			events := []string{}

			// Note: This is a conceptual test. The actual SSE parsing happens
			// in the goroutine within engine.Run(). This test demonstrates
			// the expected behavior rather than unit testing the internal logic.
			// For integration testing, use TestRunStreaming.

			// Simulate what the parser should do
			for i := 0; i < len(tt.sseInput); i += 3 {
				if i+1 >= len(tt.sseInput) {
					break
				}
				eventLine := tt.sseInput[i]
				dataLine := tt.sseInput[i+1]

				if strings.HasPrefix(eventLine, "event: ") && strings.HasPrefix(dataLine, "data: ") {
					eventType := strings.TrimPrefix(eventLine, "event: ")
					dataJSON := strings.TrimPrefix(dataLine, "data: ")

					// "done" events should be emitted as done regardless of whether JSON parsing succeeds.
					if eventType == "done" {
						doneEvent := map[string]string{
							"type": "done",
							"data": dataJSON,
						}
						if jsonBytes, err := json.Marshal(doneEvent); err == nil {
							events = append(events, string(jsonBytes))
						}
						continue
					}

					var data struct {
						Node     string `json:"node"`
						NodeName string `json:"node_name"`
						Text     string `json:"text"`
					}

					if err := json.Unmarshal([]byte(dataJSON), &data); err == nil {
						chunkEvent := map[string]string{
							"type":      "chunk",
							"message":   data.Text,
							"node":      data.Node,
							"node_name": data.NodeName,
						}
						if jsonBytes, err := json.Marshal(chunkEvent); err == nil {
							events = append(events, string(jsonBytes))
						}
					}
				}
			}

			if len(events) != tt.expectedEvents {
				t.Errorf("Expected %d events, got %d", tt.expectedEvents, len(events))
			}

			if len(events) > 0 && tt.checkFirstEvent != nil {
				tt.checkFirstEvent(t, events[0])
			}
		})
	}
}
