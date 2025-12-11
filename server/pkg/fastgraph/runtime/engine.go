package runtime

import (
	"bufio"
	"fmt"
	"os"
	"os/exec"
)

// Real Engine Wrapper
type Engine struct {
	Callbacks map[string]func(string)
	BinPath   string
}

func New() *Engine {
	// Check if binary exists, default to ./fastgraph.exe
	binPath := "./fastgraph.exe"
	if _, err := os.Stat(binPath); os.IsNotExist(err) {
		fmt.Println("WARNING: fastgraph.exe not found at", binPath)
	}

	return &Engine{
		Callbacks: make(map[string]func(string)),
		BinPath:   binPath,
	}
}

func (e *Engine) OnEvent(callback func(string)) {
	e.Callbacks["event"] = callback
}

// Run executes the agent via CLI
func (e *Engine) Run(agentPath string, input string) error {
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
			fmt.Println("ERROR: fastgraph.exe missing. Using fallback stub event.")
			if cb, ok := e.Callbacks["event"]; ok {
				cb(`{"type": "log", "message": "ERROR: fastgraph.exe not found. Please upload to server root."}`)
			}
			return nil
		}
		return err
	}

	// Stream Output
	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			line := scanner.Text()
			// Forward CLI output to Frontend
			// Assumption: CLI outputs JSON lines for events, or we wrap raw text
			fmt.Println("CLI OUT:", line)

			if cb, ok := e.Callbacks["event"]; ok {
				// Try to determine if line is JSON or Log
				if len(line) > 0 && line[0] == '{' {
					cb(line)
				} else {
					// Wrap Log
					cb(fmt.Sprintf(`{"type": "log", "message": "%s"}`, line))
				}
			}
		}
		cmd.Wait()
	}()

	return nil
}
