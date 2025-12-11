# FastGraph v0.3.0 Release Notes

## New Features

### 1. Schedule Block for Proactive Agents
Agents can now declare execution schedules to run periodically without user interaction.

**M Language Syntax:**
```m
agent WeatherMonitor {
  schedule {
    interval: "30m"
    mode: "proactive"
  }
  
  nodes { ... }
  edges { ... }
}
```

**Gateway Integration:**
```go
// 1. Inspect the agent
metadata, _ := runCommand("fastgraph", "inspect", "agent.m")

// 2. Parse schedule
if metadata.Schedule != nil {
    interval := parseDuration(metadata.Schedule.Interval) // "30m" -> 30 minutes
    
    // 3. Setup periodic execution
    ticker := time.NewTicker(interval)
    go func() {
        for range ticker.C {
            result := runAgent(ctx, "proactive check")
            events := parseEvents(result)
            broadcastToFrontend(events)
        }
    }()
}
```

**Valid Intervals:**
- `5m` - 5 minutes
- `30m` - 30 minutes  
- `1h` - 1 hour
- `24h` - 24 hours

---

### 2. Enhanced Inspect Command
The `fastgraph inspect` command now returns schedule metadata:

```bash
$ fastgraph inspect proactive_weather.m
{
  "name": "ProactiveWeather",
  "capabilities": ["weather-monitor"],
  "schedule": {
    "interval": "30m",
    "mode": "proactive"
  },
  "nodes": ["GetWeather", "AnalyzeWeather"]
}
```

---

## Breaking Changes

**None.** v0.3.0 is fully backward compatible with v0.2.0.

---

## Migration Guide

### For Gateway Developers

#### Before (v0.2.0)
```go
// Manual scheduling
ticker := time.NewTicker(30 * time.Minute)
go func() {
    for range ticker.C {
        runAgent(ctx, "check weather")
    }
}()
```

#### After (v0.3.0)
```go
// Agent declares its own schedule
metadata := inspect("weather_agent.m")
if metadata.Schedule != nil {
    setupSchedule(metadata.Schedule.Interval, func() {
        runAgent(ctx, "proactive check")
    })
}
```

### For Agent Developers

Add a `schedule` block to enable proactive execution:

```m
agent MyAgent {
  schedule {
    interval: "1h"
    mode: "proactive"
  }
  // ... existing agent code
}
```

---

## Architecture

### Concurrent Execution
Schedule runs and user chat can happen simultaneously:

```
Gateway Process
├─ Thread 1: Cron (every 30m) → runAgent("proactive")
└─ Thread 2: User Chat → runAgent("reactive")
```

Both execute independently without blocking.

---

## Examples

### Proactive Weather Agent
```m
agent WeatherMonitor {
  schedule {
    interval: "30m"
    mode: "proactive"
  }

  nodes {
    http_request GetWeather {
      url: "https://api.weather.com/..."
    }

    llm AnalyzeWeather {
      model: "gpt-4o-mini"
      prompt: """
        Check for weather alerts:
        ${GetWeather_output}
        
        Output events if needed.
      """
    }
  }

  edges {
    START -> GetWeather -> AnalyzeWeather -> END
  }
}
```

### Gateway Handling
```go
// On startup
agents := loadAgents()
for _, agent := range agents {
    meta := inspect(agent.Path)
    if meta.Schedule != nil {
        startProactiveExecution(agent, meta.Schedule)
    }
}

// The function
func startProactiveExecution(agent Agent, schedule Schedule) {
    interval := parseDuration(schedule.Interval)
    ticker := time.NewTicker(interval)
    
    go func() {
        for range ticker.C {
            result := runAgent(agent, "proactive check")
            if events := extractEvents(result); len(events) > 0 {
                pushToFrontend(events)
            }
        }
    }()
}
```

---

## Upgrade Instructions

1. Download `installer_v0.3.0/` for your platform
2. Replace existing `fastgraph` binary
3. Verify: `fastgraph --version` should show `0.3.0`
4. Update Gateway to handle schedule metadata
5. Optional: Add schedule blocks to existing agents

---

## Version Comparison

| Feature | v0.1.0 | v0.2.0 | v0.3.0 |
|---------|--------|--------|--------|
| CLI Execution | ✅ | ✅ | ✅ |
| Agent Building | ✅ | ✅ | ✅ |
| Streaming | ❌ | ✅ | ✅ |
| Inspection | ❌ | ✅ | ✅ |
| Schedule Block | ❌ | ❌ | ✅ |

---

## Support

- Documentation: `docs/specs/interface_contract.md`
- Examples: `examples/proactive_weather.m`
- GitHub: github.com/prageethmgunathilaka/FastGraph-Go
