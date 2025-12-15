# Release Notes v0.3.3

## Major Features
- **Streaming Support**: Full end-to-end support for LLM streaming via `ExecuteStream`.
- **CLI Streaming**: New `--stream` flag for `fastgraph run` to output real-time chunks to stdout.
- **Streaming Contract**: `chunk` events now include `node` + `node_name` so Gateways can map chunks to UI cards.

## Improvements
- **Stability**: Enhanced robustness in Runtime Executor.
- **Documentation**: New Interface Contract specs.

## Components
- `windows-amd64/fastgraph.exe`: CLI Compiler & Runner
- `windows-amd64/fastgraph-registry.exe`: Agent Registry & Gateway Server
