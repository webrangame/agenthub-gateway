# Memory Usage (FastGraph v0.4.0)

This feature is gateway/CLI controlled. Core stays noop unless enabled and a MemoryManager is injected.

## Quick CLI example
```
fastgraph run agent.m --input "hello" ^
  --memory-enabled ^
  --memory-store=inmemory ^
  --memory-cache=inmemory ^
  --memory-fallback=cache-first ^
  --memory-retries=3 ^
  --memory-backoff-ms=200 ^
  --memory-soft-fail=true
```
Omit flags to stay noop.

## Wiring pattern
- Gateway builds MemoryManager (store/cache kind, retries, backoff, fallback, soft-fail).
- Inject into executor: `runtime.NewExecutor(agent, llm, runtime.WithMemoryManager(mgr))`.
- Executor writes node outputs best-effort; for finer control, gateway can call `mgr.Write` on selected nodes.

## PII / security
- Encrypt `Content` before writes when sensitive; keep metadata minimal/non-sensitive.
- Enforce auth/tenant scoping and redaction in the gateway.

## Notes
- Available backends here: `inmemory` store/cache, Vertex-style adapter (needs injected VertexClient). No SDK/vendor lock by default.
- To use Vertex, implement VertexClient in the gateway and inject it. 
