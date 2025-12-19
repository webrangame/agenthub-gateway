# Release Notes v0.4.0

## Highlights
- **Memory layer scaffolding**: pluggable Store/Cache interfaces, retry/backoff and fallback policies, opt-in executor hook.
- **CLI memory controls**: `fastgraph run` can enable memory, pick store/cache kinds, set fallback, retries, backoff, and soft-fail.
- **Vertex adapter (optional)**: interface-based store adapter ready for an injected Vertex client; core remains vendor-agnostic.
- **Docs**: memory API, features, and gateway usage guides added.

## Components (build required)
This repository does not ship binaries for 0.4.0. Build them with the update scripts:
- `scripts/update_all_installers.{sh,ps1,bat}`
Expected outputs per platform:
- `fastgraph`, `fastgraph-registry`, and installer wrapper (`install`/`setup`) for Windows, Linux, macOS (intel/arm).

## Notes
- Default memory behavior remains noop unless enabled via CLI/env and a MemoryManager is injected.
- For PII, encrypt content before writes; gateway should enforce auth/tenant scoping. Encryption helper not yet included.
