# Memory Usage (FastGraph v0.4.0)

Gateway/CLI-controlled; core stays noop unless enabled and a MemoryManager is injected.

## Quick CLI example
```
fastgraph run agent.m --input "hello" \
  --memory-enabled \
  --memory-store=inmemory \
  --memory-cache=inmemory \
  --memory-fallback=cache-first \
  --memory-retries=3 \
  --memory-backoff-ms=200 \
  --memory-soft-fail=true
```
Skip flags to remain noop.

## Wiring pattern
- Gateway builds MemoryManager (store/cache kind, retries, backoff, fallback, soft-fail).
- Inject into executor: `runtime.NewExecutor(agent, llm, runtime.WithMemoryManager(mgr))`.
- Executor writes node outputs best-effort; gateway can call `mgr.Write` selectively.

## PII / security
- Encrypt `Content` before writes if sensitive; keep metadata minimal.
- Enforce auth/tenant scoping and redaction in the gateway.

## Notes
- Backends: `inmemory` store/cache, Vertex-style adapter (needs injected VertexClient). No SDK/vendor lock by default.
- To use Vertex, implement VertexClient in the gateway and inject it. 
