# Release Notes v0.3.3

## Major Features
- **Streaming Support**: Full end-to-end support for LLM streaming via `ExecuteStream`.
- **CLI Streaming**: New `--stream` flag for `fastgraph run` to output real-time chunks to stdout.
- **Streaming Contract**: `chunk` events now include `node` + `node_name` so Gateways can map chunks to UI cards.

## Improvements
- **Stability**: Improved robustness in Runtime Executor.
- **Documentation**: Updated Interface Contract specs.

## Components
- `fastgraph.exe`: CLI Compiler & Runner
- `fastgraph-registry.exe`: Agent Registry & Gateway Server
- `setup.exe`: Installer


