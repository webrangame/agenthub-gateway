# Release Notes v0.4.1

## Recent Fixes (2025-12-31)
- **LLM Proxy Support**: OpenAI client now supports custom base URLs and optional extra headers (e.g., LiteLLM proxies).
- **Provider Override**: Added FASTGRAPH_PROVIDER to force provider selection when multiple API keys exist.

## Major Features
- **Proxy-Friendly OpenAI Client**: Configure FASTGRAPH_OPENAI_BASE_URL and FASTGRAPH_OPENAI_HEADERS (JSON map) to route through gateways.
- **Headers Injection**: Support for custom headers (auth/tenant) when calling OpenAI-compatible endpoints.

## Improvements
- Safer defaults; unchanged behavior if new env vars are unset.
- Clearer error handling for malformed header JSON.

## Components
- astgraph: CLI Compiler & Runner
- astgraph-registry: Agent Registry & Gateway Server
- install / setup: Platform-specific installer

## Installation
Run the install or setup executable from your platform folder.