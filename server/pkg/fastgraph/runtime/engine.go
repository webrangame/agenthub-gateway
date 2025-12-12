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
}

func New() *Engine {
	// Check if binary exists, try Linux binary first, then Windows
	binPath := "./fastgraph"
	if _, err := os.Stat(binPath); os.IsNotExist(err) {
		// Fallback to Windows executable
		binPath = "./fastgraph.exe"
		if _, err := os.Stat(binPath); os.IsNotExist(err) {
			fmt.Println("WARNING: fastgraph binary not found at ./fastgraph or ./fastgraph.exe")
		}
	}

	return &Engine{
		BinPath: binPath,
	}
}

// Inspect runs 'fastgraph inspect' and returns metadata
func (e *Engine) Inspect(agentPath string) (*AgentMetadata, error) {
	cmd := exec.Command(e.BinPath, "inspect", agentPath)
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
	fmt.Printf("CLI: Executing %s run %s\n", e.BinPath, agentPath)

	cmd := exec.Command(e.BinPath, "run", agentPath, "--input", input)

	// Create Pipes
	stdout, err := cmd.StdoutPipe()
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

	// Stream Output
	scanner := bufio.NewScanner(stdout)
	for scanner.Scan() {
		line := scanner.Text()
		// Forward CLI output to Frontend
		fmt.Println("CLI OUT:", line)

		if onEvent != nil {
			// Try to determine if line is JSON or Log
			if len(line) > 0 && line[0] == '{' {
				onEvent(line)
			} else {
				// Wrap Log
				onEvent(fmt.Sprintf(`{"type": "log", "message": "%s"}`, line))
			}
		}
	}

	if err := cmd.Wait(); err != nil {
		return fmt.Errorf("agent execution finished with error: %v", err)
	}

	return nil
}
