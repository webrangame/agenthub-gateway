package runtime

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"sync"
)

// inferNodeFromLine attempts to infer a FastGraph node name from a plain-text line.
// Many agents print "NodeName: ..." prefixes; we use those as a best-effort mapping.
func inferNodeFromLine(line string) (string, bool) {
	trim := strings.TrimSpace(line)
	if trim == "" {
		return "", false
	}
	// Common node prefixes used by the bundled trip-guardian agent.
	prefixes := map[string]string{
		"NewsAlert:":        "NewsAlert",
		"CheckWeather:":     "CheckWeather",
		"KnowledgeCheck:":   "KnowledgeCheck",
		"ReviewSummarizer:": "ReviewSummarizer",
		"GeniusLoci:":       "GeniusLoci",
		"GenerateReport:":   "GenerateReport",
	}
	for p, node := range prefixes {
		if strings.HasPrefix(trim, p) {
			return node, true
		}
	}
	return "", false
}

// AgentMetadata matches the JSON output of 'fastgraph inspect'
type AgentMetadata struct {
	Name         string        `json:"name"`
	Capabilities []string      `json:"capabilities"`
	Schedule     *ScheduleInfo `json:"schedule"`
	Nodes        []string      `json:"nodes"`
	Inputs       []string      `json:"inputs"`
}

type ScheduleInfo struct {
	Interval string `json:"interval"`
	Mode     string `json:"mode"`
}

// MemoryConfig holds configuration for the FastGraph memory layer
type MemoryConfig struct {
	Enabled    bool
	Store      string // e.g., "vertex" or "inmemory"
	ProjectID  string
	Location   string
	CorpusName string
}

// Real Engine Wrapper
type Engine struct {
	BinPath string
	MockRun func(agentPath, input string, memory *MemoryConfig, onEvent func(string)) error
}

func New() *Engine {
	// ... existing binary discovery logic ...
	// Check if binary exists, try Linux binary first (for cloud), then Windows
	binPath := "./installer_v0.3.4/linux/fastgraph"
	if _, err := os.Stat(binPath); os.IsNotExist(err) {
		// Fallback to Windows executable (for local dev)
		binPath = "./installer_v0.3.4/windows-amd64/fastgraph.exe"
		if _, err := os.Stat(binPath); os.IsNotExist(err) {
			// Fallback to v0.3.3 for backward compatibility
			binPath = "./installer_v0.3.3/windows/fastgraph.exe"
			if _, err := os.Stat(binPath); os.IsNotExist(err) {
				// Fallback to root (legacy)
				binPath = "./fastgraph.exe"
				if _, err := os.Stat(binPath); os.IsNotExist(err) {
					binPath = "./fastgraph"
					if _, err := os.Stat(binPath); os.IsNotExist(err) {
						fmt.Println("WARNING: fastgraph binary not found")
					}
				}
			}
		}
	}

	fmt.Printf("INFO: Using FastGraph binary: %s\n", binPath)

	return &Engine{
		BinPath: binPath,
	}
}

// Inspect runs 'fastgraph inspect' and returns metadata
func (e *Engine) Inspect(agentPath string) (*AgentMetadata, error) {
	cmd := exec.Command(e.BinPath, "inspect", agentPath) // #nosec G204
	// Pass environment variables to the subprocess
	cmd.Env = os.Environ()
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to inspect agent: %v", err)
	}

	var meta AgentMetadata
	if err := json.Unmarshal(output, &meta); err == nil {
		return &meta, nil
	}
	// Fallback/Warning handled by caller or improve error here
	return nil, fmt.Errorf("failed to parse inspect output: %v", err)
}

// Run executes the agent via CLI and streams output to the callback
func (e *Engine) Run(agentPath string, input string, memory *MemoryConfig, onEvent func(string)) error {
	if e.MockRun != nil {
		return e.MockRun(agentPath, input, memory, onEvent)
	}

	args := []string{"run", agentPath, "--input", input, "--stream"}

	// Apply Memory Configuration
	if memory != nil && memory.Enabled {
		fmt.Printf("CLI: Memory Enabled (Store: %s)\n", memory.Store)
		args = append(args, "--memory-enabled")
		if memory.Store != "" {
			args = append(args, "--memory-store="+memory.Store)
		} else {
			// default to inmemory if not specified but enabled
			args = append(args, "--memory-store=inmemory")
		}
		// Hardcoded defaults as per plan requirements/best practices
		args = append(args, "--memory-cache=inmemory") // Always use cache for speed
	}

	fmt.Printf("CLI: Executing %s %v\n", e.BinPath, args)

	cmd := exec.Command(e.BinPath, args...) // #nosec G204

	// Pass environment variables to the subprocess
	env := os.Environ()

	// Inject Vertex Config if available
	if memory != nil {
		if memory.ProjectID != "" {
			env = append(env, "VERTEX_PROJECT_ID="+memory.ProjectID)
		}
		if memory.Location != "" {
			env = append(env, "VERTEX_LOCATION="+memory.Location)
		}
		if memory.CorpusName != "" {
			env = append(env, "VERTEX_CORPUS_NAME="+memory.CorpusName)
		}
	}
	cmd.Env = env

	// DEBUG: Print Key Prefixes explicitly from cmd.Env to be sure
	var debugMapKey string
	for _, e := range cmd.Env {
		if strings.HasPrefix(e, "GOOGLE_MAPS_KEY=") {
			debugMapKey = strings.TrimPrefix(e, "GOOGLE_MAPS_KEY=")
			break
		}
	}
	if len(debugMapKey) > 10 {
		fmt.Printf("DEBUG SUBPROCESS: GOOGLE_MAPS_KEY sent to agent: %s...\n", debugMapKey[:15])
		fmt.Printf("DEBUG SUBPROCESS: Key Length: %d\n", len(debugMapKey))
	} else {
		fmt.Printf("DEBUG SUBPROCESS: GOOGLE_MAPS_KEY MISSING or TOO SHORT! (Val='%s')\n", debugMapKey)
	}

	// Create Pipes
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return err
	}

	// Start Command
	if err := cmd.Start(); err != nil {
		// Fallback for demo if binary missing:
		if os.IsNotExist(err) {
			fmt.Println("ERROR: fastgraph binary missing. Using fallback stub event.")
			if onEvent != nil {
				onEvent(`{"type": "log", "message": "ERROR: fastgraph binary not found. Please ensure fastgraph is in the server root."}`)
			}
			return nil
		}
		return err
	}

	// WaitGroup for stream readers
	var wg sync.WaitGroup

	// Stream Stderr (Logs) - Line-based
	wg.Add(1)
	go func() {
		defer wg.Done()
		scanner := bufio.NewScanner(stderr)
		for scanner.Scan() {
			line := scanner.Text()
			fmt.Println("CLI LOG:", line)
			if onEvent != nil {
				// Wrap as Log event
				logEvent := map[string]string{"type": "log", "message": line}
				if jsonBytes, err := json.Marshal(logEvent); err == nil {
					onEvent(string(jsonBytes))
				}
			}
		}
	}()

	// Stream Stdout (Chunks) - Parse SSE format from FastGraph
	wg.Add(1)
	go func() {
		defer wg.Done()

		scanner := bufio.NewScanner(stdout)
		// Some agent outputs can contain long lines (markdown / JSON blocks).
		// Increase the scanner buffer to avoid token-too-long errors.
		scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
		var currentEvent string
		plainMode := false
		currentNode := ""

		for scanner.Scan() {
			line := scanner.Text()

			trim := strings.TrimSpace(line)

			// Parse SSE format: "event: chunk" or "data: {...}"
			if strings.HasPrefix(trim, "event: ") {
				plainMode = false
				currentEvent = strings.TrimPrefix(line, "event: ")
				continue
			} else if strings.HasPrefix(trim, "data: ") {
				plainMode = false
				dataJSON := strings.TrimPrefix(trim, "data: ")

				// DEBUG: Log what we're parsing
				fmt.Printf("DEBUG SSE: event=%s, data=%s\n", currentEvent, dataJSON)

				if onEvent != nil {
					// Parse the JSON data to extract node info
					var data struct {
						Node     string `json:"node"`
						NodeName string `json:"node_name"`
						Message  string `json:"message"` // FastGraph uses "message"
						Text     string `json:"text"`    // Fallback for older formats
					}

					if err := json.Unmarshal([]byte(dataJSON), &data); err == nil {
						// Use message if available, otherwise text
						content := data.Message
						if content == "" {
							content = data.Text
						}

						// DEBUG: Log parsed data
						fmt.Printf("DEBUG PARSED: node=%s, node_name=%s, content_len=%d\n", data.Node, data.NodeName, len(content))

						// Successfully parsed JSON - forward as chunk event with node metadata
						chunkEvent := map[string]string{
							"type":      "chunk",
							"message":   content,
							"node":      data.Node,
							"node_name": data.NodeName,
						}

						if jsonBytes, err := json.Marshal(chunkEvent); err == nil {
							fmt.Printf("DEBUG FORWARDING: %s\n", string(jsonBytes))
							onEvent(string(jsonBytes))
						}
					} else {
						// DEBUG: Log parse error
						fmt.Printf("DEBUG PARSE ERROR: %v\n", err)

						// Not JSON or done event - forward as-is for backward compatibility
						if currentEvent == "done" {
							doneEvent := map[string]string{
								"type": "done",
								"data": dataJSON,
							}
							if jsonBytes, err := json.Marshal(doneEvent); err == nil {
								onEvent(string(jsonBytes))
							}
						}
					}
				}
				currentEvent = "" // Reset after processing data
				continue
			}

			// Fallback: FastGraph may output plain text (no SSE framing).
			// In that case, stream each line as a chunk event so the gateway/UI still works.
			// We also try to infer node context from "NodeName:" prefixes.
			if trim == "" {
				continue
			}
			if !plainMode {
				// If we haven't seen any SSE framing yet, assume plain mode.
				plainMode = true
			}
			if node, ok := inferNodeFromLine(trim); ok {
				currentNode = node
			}
			if onEvent != nil {
				chunkEvent := map[string]string{
					"type":    "chunk",
					"message": line + "\n",
				}
				if currentNode != "" {
					chunkEvent["node"] = currentNode
					chunkEvent["node_name"] = currentNode
				}
				if jsonBytes, err := json.Marshal(chunkEvent); err == nil {
					onEvent(string(jsonBytes))
				}
			}
		}
		if err := scanner.Err(); err != nil {
			fmt.Println("CLI: Error reading stdout:", err)
		}
	}()

	// Wait for Command to Finish First
	if err := cmd.Wait(); err != nil {
		// Even if command failed, we wait for streams to flush
		wg.Wait()
		return fmt.Errorf("agent execution finished with error: %v", err)
	}

	// Ensure all output is processed
	wg.Wait()

	return nil
}
