# FastGraph CLI - v0.2.0

## Installation

### Windows
1. Extract `fastgraph.exe` to a folder (e.g., `C:\Program Files\FastGraph`)
2. Add the folder to your PATH environment variable
3. Verify: `fastgraph --version`

### Linux/Mac
1. Extract the binary to `/usr/local/bin/` or `~/bin/`
2. Make it executable: `chmod +x fastgraph`
3. Verify: `fastgraph --version`

### Android
See `docs/ANDROID_INTEGRATION.md` for Termux setup.

---

## Commands

### `fastgraph run <file.m>`
Execute an M Language agent.

**Example:**
```bash
fastgraph run trip_guardian.m --input "Plan a trip to Tokyo"
```

**Flags:**
- `--input, -i`: Input text for the agent
- `--wait, -w`: Wait for user input before exiting (for double-click scripts)

---

### `fastgraph build <file.m>`
Compile an agent to a standalone binary.

**Example:**
```bash
fastgraph build trip_guardian.m -o my_agent.exe
```

**Flags:**
- `--output, -o`: Output binary name
- `--keep-temp, -k`: Keep generated Go source files

---

### `fastgraph inspect <file.m>`
**NEW in v0.2.0** - Extract agent metadata (capabilities, nodes).

**Example:**
```bash
fastgraph inspect trip_guardian.m
```

**Output (JSON):**
```json
{
  "name": "TripValidator",
  "capabilities": ["trip-validator"],
  "nodes": ["ExtractDetails", "CheckWeather"],
  "inputs": ["text_input"]
}
```

**Use Case:** Server-Driven UI - Gateway services can use this to determine the required frontend layout.

---

### `fastgraph create`
Launch the interactive agent creation wizard.

---

### `fastgraph scaffold <file.m>`
Generate double-click launcher scripts (.bat or .sh).

---

## Environment Variables

- `OPENAI_API_KEY`: Required for LLM nodes
- `ANTHROPIC_API_KEY`: Alternative to OpenAI
- `GOOGLE_MAPS_KEY`: For Google Places API nodes
- `FASTGRAPH_REGISTRY_URL`: Custom registry URL (default: Cloud Registry)

---

## Quick Start

1. **Create an agent:**
   ```bash
   fastgraph create
   ```

2. **Run it:**
   ```bash
   fastgraph run my_agent.m --input "Hello world"
   ```

3. **Compile to binary:**
   ```bash
   fastgraph build my_agent.m
   ./my_agent.exe "Hello world"
   ```

---

## Support

- Docs: `docs/`
- Examples: `examples/`
- Registry: `http://3.208.94.148:8080`
