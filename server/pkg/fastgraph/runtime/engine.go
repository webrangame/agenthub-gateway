package runtime

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"strings"
)

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

// Real Engine Wrapper
type Engine struct {
	BinPath string
	MockRun func(agentPath, input string, onEvent func(string)) error
}

func New() *Engine {
	// Check if binary exists, try Linux binary first, then Windows
	// Check if binary exists, try Linux binary first, then Windows
	binPath := "./installer_v0.3.3/linux/fastgraph"
	if _, err := os.Stat(binPath); os.IsNotExist(err) {
		// Fallback to Windows executable
		binPath = "./installer_v0.3.3/windows/fastgraph.exe"
		if _, err := os.Stat(binPath); os.IsNotExist(err) {
			// Fallback to root (legacy)
			binPath = "./fastgraph.exe"
			if _, err := os.Stat(binPath); os.IsNotExist(err) {
				fmt.Println("WARNING: fastgraph binary not found")
			}
		}
	}

	return &Engine{
		BinPath: binPath,
	}
}

// Inspect runs 'fastgraph inspect' and returns metadata
func (e *Engine) Inspect(agentPath string) (*AgentMetadata, error) {
	cmd := exec.Command(e.BinPath, "inspect", agentPath) // #nosec G204
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to inspect agent: %v", err)
	}

	var meta AgentMetadata
	if err := json.Unmarshal(output, &meta); err != nil {
		return nil, fmt.Errorf("failed to parse inspect output: %v", err)
	}
	return &meta, nil
}

// Run executes the agent via CLI and streams output to the callback
func (e *Engine) Run(agentPath string, input string, onEvent func(string)) error {
	if e.MockRun != nil {
		return e.MockRun(agentPath, input, onEvent)
	}

	fmt.Printf("CLI: Executing %s run %s --stream\n", e.BinPath, agentPath)

	cmd := exec.Command(e.BinPath, "run", agentPath, "--input", input, "--stream") // #nosec G204

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
	done := make(chan struct{})

	// Stream Stderr (Logs) - Line-based
	go func() {
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

	// Stream Stdout (Chunks) - with Tag Parsing
	go func() {
		defer close(done)

		buf := make([]byte, 256) // Smaller buffer for responsiveness
		var buffer strings.Builder
		state := "IDLE" // IDLE, REPORT, INSIGHT
		currentTag := ""

		for {
			n, err := stdout.Read(buf)
			if n > 0 {
				chunk := string(buf[:n])
				buffer.WriteString(chunk)

				// specific logic to handle the stream
				for {
					str := buffer.String()

					if state == "IDLE" {
						// Look for start tag
						idxStart := strings.Index(str, "[[")
						if idxStart == -1 {
							// No tag start, discard junk (intermediate nodes without tags)
							// Unless we want to keep a tail in case split tag
							if len(str) > 10 { // Keep last few chars overlap
								buffer.Reset()
								buffer.WriteString(str[len(str)-2:])
							}
							break
						} else {
							// Found [[, need ]]
							idxEnd := strings.Index(str[idxStart:], "]]")
							if idxEnd == -1 {
								break // Wait for more data
							}
							idxEnd += idxStart // Absolute pos

							// Extract Tag
							tag := str[idxStart+2 : idxEnd]

							// Remove processed part
							// Discard BEFORE tag (junk)
							remaining := str[idxEnd+2:]
							buffer.Reset()
							buffer.WriteString(remaining)

							if tag == "REPORT" {
								state = "REPORT"
							} else {
								state = "INSIGHT"
								currentTag = tag // e.g. SAFETY, CULTURE
							}
						}
					} else if state == "REPORT" {
						// Streaming mode
						endTag := "[[END_REPORT]]"
						idx := strings.Index(str, "[[END") // Optimization: Just check for end marker start

						if idx != -1 {
							// Possible end
							if strings.Contains(str, endTag) {
								// Found pure end
								idxEndToken := strings.Index(str, endTag)
								content := str[:idxEndToken]

								// Emit content
								if len(content) > 0 && onEvent != nil {
									chunkEvent := map[string]string{"type": "chunk", "message": content}
									if jsonBytes, err := json.Marshal(chunkEvent); err == nil {
										onEvent(string(jsonBytes))
									}
								}

								// Reset
								remaining := str[idxEndToken+len(endTag):]
								buffer.Reset()
								buffer.WriteString(remaining)
								state = "IDLE"
							} else {
								break // Wait for full tag
							}
						} else {
							// Safe to stream?
							// Stream all BUT last few chars (overlap protection)
							safeLen := len(str) - 8 // len("[[END_R")
							if safeLen > 0 {
								toEmit := str[:safeLen]
								if onEvent != nil {
									chunkEvent := map[string]string{"type": "chunk", "message": toEmit}
									if jsonBytes, err := json.Marshal(chunkEvent); err == nil {
										onEvent(string(jsonBytes))
									}
								}
								buffer.Reset()
								buffer.WriteString(str[safeLen:])
							}
							break
						}
					} else if state == "INSIGHT" {
						// Buffering mode
						endTag := "[[END_" + currentTag + "]]"
						if strings.Contains(str, endTag) {
							idxEndToken := strings.Index(str, endTag)
							content := str[:idxEndToken]

							// Emit Log Event for Insight
							if onEvent != nil {
								// Format message so processAndAppendFeed picks it up
								// e.g. "SAFETY: ..."
								prefix := ""
								switch currentTag {
								case "SAFETY":
									prefix = "SAFETY: "
								case "GetDate":
									prefix = "DATE: " // If we tagged it
								case "WISDOM":
									prefix = "Wisdom: "
								case "REVIEWS":
									prefix = "REVIEW: "
								case "CULTURE":
									prefix = "CULTURE: "
								case "CITY":
									prefix = "CITY: "
								}

								logMsg := prefix + content
								logEvent := map[string]string{"type": "log", "message": logMsg}
								if jsonBytes, err := json.Marshal(logEvent); err == nil {
									onEvent(string(jsonBytes))
								}
							}

							// Reset
							remaining := str[idxEndToken+len(endTag):]
							buffer.Reset()
							buffer.WriteString(remaining)
							state = "IDLE"
						} else {
							break // Wait for more
						}
					}
				}
			}
			if err != nil {
				break
			}
		}
	}()

	// Wait for Stdout to close (command finished writing output)
	<-done

	if err := cmd.Wait(); err != nil {
		return fmt.Errorf("agent execution finished with error: %v", err)
	}

	return nil
}
