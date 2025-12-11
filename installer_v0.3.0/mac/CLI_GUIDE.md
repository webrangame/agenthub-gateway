# FastGraph CLI - v0.3.0

## What's New in v0.3.0
- **Schedule Block**: Agents can now declare proactive execution intervals
- **Enhanced Inspect**: `fastgraph inspect` now shows schedule metadata
- **Streaming Support**: Real-time LLM response chunks (v0.2.0+)

---

## Installation

### Windows
1. Extract `fastgraph.exe` to `C:\Program Files\FastGraph`
2. Add to PATH: System Properties → Environment Variables → Path → Edit → New
3. Verify: `fastgraph --version`

### Linux/Mac
```bash
sudo mv fastgraph /usr/local/bin/
chmod +x /usr/local/bin/fastgraph
fastgraph --version
```

### Android (Termux)
See `docs/ANDROID_INTEGRATION.md`

---

## Commands

### `fastgraph run <file.m>`
Execute an M Language agent.

```bash
fastgraph run trip_guardian.m --input "Plan trip to Tokyo"
```

**Flags:**
- `--input, -i`: Input text
- `--wait, -w`: Wait before exit (for double-click scripts)

---

### `fastgraph inspect <file.m>` ⭐ NEW
Extract agent metadata for Server-Driven UI.

```bash
fastgraph inspect proactive_weather.m
```

**Output:**
```json
{
  "name": "ProactiveWeather",
  "capabilities": ["weather-monitor"],
  "schedule": {
    "interval": "30m",
    "mode": "proactive"
  },
  "nodes": ["GetWeather", "AnalyzeWeather"],
  "inputs": ["text_input"]
}
```

**Gateway Integration:**
```go
metadata := inspect("agent.m")
if metadata.Schedule != nil {
    interval := metadata.Schedule.Interval
    // Setup periodic execution
}
```

---

### `fastgraph build <file.m>`
Compile agent to standalone binary.

```bash
fastgraph build trip_guardian.m -o trip_guardian.exe
./trip_guardian.exe "Hello"
```

---

### `fastgraph create`
Interactive agent creation wizard.

---

### `fastgraph scaffold <file.m>`
Generate launcher scripts (.bat/.sh).

---

## M Language v0.3.0

### Schedule Block (NEW)
Define proactive execution:

```m
agent WeatherMonitor {
  schedule {
    interval: "30m"    // 5m, 30m, 1h, 24h
    mode: "proactive"  // or "reactive"
  }
  
  nodes { ... }
  edges { ... }
}
```

**Use Cases:**
- Weather alerts: `30m`
- Stock monitoring: `5m`
- Daily reports: `24h`

---

## Programmatic Usage (Go)

### Streaming (v0.2.0+)
```go
import "github.com/prageethmgunathilaka/FastGraph-Go/pkg/llm"

client := llm.NewOpenAIClient(apiKey)
client.CompleteStream(ctx, "gpt-4", prompt, func(chunk string) error {
    fmt.Print(chunk) // Real-time output
    return nil
})
```

### Agent Execution
```go
import (
    "github.com/prageethmgunathilaka/FastGraph-Go/pkg/mlang"
    "github.com/prageethmgunathilaka/FastGraph-Go/pkg/runtime"
    "github.com/prageethmgunathilaka/FastGraph-Go/pkg/llm"
)

// Parse
parser := mlang.NewParser(source)
agent, _ := parser.Parse()

// Execute
client := llm.NewOpenAIClient(apiKey)
executor := runtime.NewExecutor(agent, client)
result, _ := executor.Execute(ctx, "input text")
```

---

## Environment Variables

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_MAPS_KEY=AIza...
FASTGRAPH_REGISTRY_URL=http://3.208.94.148:8080
```

---

## Examples

### Basic Execution
```bash
fastgraph run examples/trip-guardian/trip_guardian.m --input "Trip to Paris"
```

### Inspect for Gateway
```bash
fastgraph inspect trip_guardian.m > metadata.json
```

### Compile to Binary
```bash
fastgraph build trip_guardian.m
./trip_guardian "Plan my trip"
```

---

## Support

- Documentation: `docs/`
- Examples: `examples/`
- Registry: http://3.208.94.148:8080
- GitHub: github.com/prageethmgunathilaka/FastGraph-Go

---

## Version History

### v0.3.0 (Current)
- Schedule block for proactive agents
- Enhanced inspect command

### v0.2.0
- LLM streaming support
- Agent inspection command
- Cross-platform installers

### v0.1.0
- Initial CLI release
