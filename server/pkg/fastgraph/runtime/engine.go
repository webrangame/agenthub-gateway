package runtime

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
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
			// Fallback to root (legacy Windows)
			binPath = "./fastgraph.exe"
			if _, err := os.Stat(binPath); os.IsNotExist(err) {
				// Fallback to root (Linux)
				binPath = "./fastgraph"
				if _, err := os.Stat(binPath); os.IsNotExist(err) {
					fmt.Println("WARNING: fastgraph binary not found")
				}
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

	// Stream Stdout (Chunks) - Tagless Mode
	go func() {
		defer close(done)

		buf := make([]byte, 1024)
		for {
			n, err := stdout.Read(buf)
			if n > 0 {
				chunk := string(buf[:n])

				// Emit raw chunk immediately
				if onEvent != nil {
					chunkEvent := map[string]string{"type": "chunk", "message": chunk}
					if jsonBytes, err := json.Marshal(chunkEvent); err == nil {
						onEvent(string(jsonBytes))
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
