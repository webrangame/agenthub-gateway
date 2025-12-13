# Interface Contract & Integration Specs

**Version:** v0.3.0  
**Role:** Shared Brain between FastGraph Backend and AI Guardian Frontend

## 1. Project Context ("AI Guardian")
- **Goal:** Split-screen frontend with Chat (Left) and Proactive Feed (Right)
- **Core Capability:** Execute `.agent` files (M Language)
- **New in v0.3.0:** Proactive agent scheduling via `schedule` blocks
- **Frontend Tech:** React + Vite + Tailwind
- **Backend Tech:** FastGraph-Go (this repo)

### Architecture Flow
```mermaid
graph LR
    User((User)) -->|Interact| Frontend[Ai Guardian Frontend]
    Frontend -->|HTTP Requests| Backend[Ai Guardian Backend (Your Project)]
    subgraph "Your Project Scope"
        Backend -->|Implements| Gateway[Gateway Logic]
    end
    Gateway -->|Calls| Engine[FastGraph Runtime (This Repo)]
    Engine -->|Runs| Agent[Trip Guardian Agent]
```
### C. Insight Stream (Right Panel - "Feed")
- **Endpoint:** `GET /api/feed`
- **Response Schema:**
    ```json
    [
      {
        "id": "unique_id",
        "card_type": "weather | safe_alert | cultural_tip | map_coord",
        "priority": "high | medium | low",
        "data": { ...specific_schema... }
      }
    ]
    ```

### E. Evolution Contract (Adding New Capabilities)
**Crucial Dependancy:** The Frontend is **dumb**. It only knows what it has been coded to show.

1.  **If you add a NEW capability** (e.g., `vr-tour`):
    *   The Agent **CAN** send the data.
    *   The Frontend **WILL NOT** show it correctly (it will likely ignore it or show raw text).
    *   **Action Required:** You MUST update the Frontend code to add a `VRTourComponent` and map it to the `vr-tour` capability.

2.  **Fallback Strategy:**
    *   The Frontend SHOULD implement a "Default View" (e.g., a simple JSON tree or text block) for any unknown capabilities to ensure data is not completely lost to the user.



*Note: You are implementing the Gateway logic in your own backend. It will call the FastGraph Runtime/CLI.*

## 2. Integration FAQ (For Frontend Agent)

**Q: Connection Endpoint?**
**A:** Connect to the **Guardian Gateway** (I am building this now).
- **Base URL:** `http://localhost:8081` (I will run this locally for you)
- **Cloud Registry:** `http://3.208.94.148:8080` (Used by the *backend* for discovery, but frontend talks to Gateway).

**Q: Should I mock?**
**A:** **YES.** I am building the backend now. Use the API Spec below to build your mocks.

**Q: Agent File Schema?**
**A:** See [M Language Spec](../m_language_spec.md). Use the `.agent` extension (same syntax as `.m`).

## 3. Operational Contract (What FastGraph Offers)

### A. Execution (How to Run)
**Option 1: CLI (Any Language)**
- **Command:** `go run cmd/fastgraph/main.go run <path_to_agent_file>`
- **Input:** Pass initial input as a command-line argument.

**Option 2: Go Library (Native Integration)**
You can import `fastgraph/pkg/runtime` directly if your backend is in Go.
```go
import (
    "github.com/prageethmgunathilaka/FastGraph-Go/pkg/mlang"
    "github.com/prageethmgunathilaka/FastGraph-Go/pkg/runtime"
    "github.com/prageethmgunathilaka/FastGraph-Go/pkg/llm"
)
// ... (code snippet)
```

**Option 3: Pre-compiled Binary (Black Box)**
You can compile the agent into a standalone executable.
- **Build:** `fastgraph build agent.m -o my_agent.exe`
- **Run:** `./my_agent.exe "Input text"`
- *Benefit:* You don't need to ship the framework source code, just the binary.


### B. Persistence (Keeping it Running)
FastGraph runs as a **process**.
- **Short-lived:** For tasks (e.g., "Plan a trip"), the process runs, finishes, and exits.
- **Long-running:** For daemons, use the `server` mode (coming soon) or wrap the CLI in a supervisor (like systemd or Docker).
- **State:** Agent state is currently **ephemeral** (memory only). If the process dies, state is lost unless you implement external database saving in your tools.

### C. Recovery (If it Crashes)
- **Automatic:** The Runtime has no built-in "restart" logic.
- **Your Responsibility:** Your backend must monitor the process. If it exits with non-zero code, **you must restart it**.
- **Retry Logic:** Safe to retry safe/idempotent agents.

### D. Inter-Agent Communication
- **Registry:** Agents discover each other via the **Cloud Registry** (`http://3.208.94.148:8080`).
- **Protocol:** Agents talk via **HTTP/WebSocket**.
- **Requirement:** For Agent A to talk to Agent B, both must be running and registered.

### E. Streaming Support (Real-time Responses) -- NEW in v0.3.2
**FastGraph now supports full End-to-End LLM streaming.**

**1. API Endpoint**
- **URL:** `POST /api/chat/stream`
- **Headers:** `Content-Type: application/json`
- **Body:**
  ```json
  {
    "input": "User query here",
    "m_code": "agent MyAgent { ... }"  // Optional: Execute ad-hoc agent
    // "agent_id": "agent-123"        // Optional: Execute registered agent (Coming Soon)
  }
  ```

**2. Response Format (Server-Sent Events)**
The server streams events using standard SSE format (`text/event-stream`).

**Event Types:**
- `chunk`: Contains a partial text fragment from the LLM.
- `error`: Indicates a failure.
- `done`: Indicates the stream has finished.

**Example Stream:**
```
event: chunk
data: {"text": "Hello"}

event: chunk
data: {"text": " world"}

event: done
data: {"output": "Hello world"}
```

**3. UI Implementation Guidelines (Frontend)**
To maximize the user benefit, the UI should:
1.  **Thinking State:** Show a "Connecting..." or "Thinking..." state immediately after sending the request.
2.  **Accumulate & Render:** Append `data.text` from `chunk` events to the message bubble *as they arrive*. Do not wait for `done`.
3.  **Auto-Scroll:** Valid streaming text often pushes the bottom of the chat; ensure the view auto-scrolls to keep the latest text visible.
4.  **Typing Effect:** The natural arrival of network packets serves as a "typing effect". No artificial delay is needed.
5.  **Markdown:** Parse Markdown incrementally if possible, or re-render the accumulation on every chunk (efficiently).

**Sample Client Code (JavaScript):**
```javascript
const response = await fetch('/api/chat/stream', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({input: "Plan a trip", m_code: "..."})
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const {value, done} = await reader.read();
  if (done) break;
  const text = decoder.decode(value);
  // Parse 'event: chunk\ndata: {...}' and append to UI
}
```




## 4. Action Items
- [ ] **Frontend (You):** Build UI using these API contracts (Mock response initially).
- [ ] **Backend (Me):** Implement `cmd/gateway/main.go` to serve these endpoints.



### F. Discovery (Agent Inspection)  NEW in v0.2.0
**Purpose:** Gateway can programmatically discover agent capabilities for Server-Driven UI.

**Command:**
```bash
fastgraph inspect trip_guardian.m
```

**Output:**
```json
{
  "name": "TripValidator",
  "capabilities": ["trip-validator"],
  "schedule": {
    "interval": "30m",
    "mode": "proactive"
  },
  "nodes": ["GetDate", "ExtractDetails"],
  "inputs": ["text_input"]
}
```

**Gateway Usage:**
```go
// Discover capabilities
cmd := exec.Command("fastgraph", "inspect", "agent.m")
output, _ := cmd.Output()
var meta AgentMetadata
json.Unmarshal(output, &meta)

// Use for SDUI
if contains(meta.Capabilities, "trip-guardian") {
    setupSplitScreenUI()
}

// Setup schedule
if meta.Schedule != nil {
    setupPeriodicExecution(meta.Schedule)
}
```

### G. Schedule Management (Proactive Agents)  NEW in v0.3.0
**Purpose:** Agents can declare periodic execution schedules.

**M Language:**
```m
agent WeatherMonitor {
  schedule {
    interval: "30m"
    mode: "proactive"
  }
  nodes { ... }
}
```

**Gateway Implementation:**
```go
// On agent load
agents := loadAgents()
for _, agent := range agents {
    meta := inspectAgent(agent.Path)
    if meta.Schedule != nil {
        startScheduledExecution(agent, meta.Schedule)
    }
}

// Schedule handler
func startScheduledExecution(agent Agent, schedule ScheduleInfo) {
    interval := parseDuration(schedule.Interval)
    ticker := time.NewTicker(interval)
    
    go func() {
        for range ticker.C {
            result := runAgent(agent, "proactive check")
            events := parseEvents(result)
            if len(events) > 0 {
                broadcastToFrontend(events)
            }
        }
    }()
}
```

**Concurrent Execution:**
```
Gateway Process
 Thread 1: Cron (every 30m)  → runAgent("proactive")
 Thread 2: User Chat          → runAgent("reactive")
```
