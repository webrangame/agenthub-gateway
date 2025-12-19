# FastGraph v0.4.0 - Installation & Usage (Linux AMD64)

## 📦 What's Included (after build)
- `fastgraph`: Core CLI compiler and runner.
- `fastgraph-registry`: Agent registry service.
- `install`: Optional installer wrapper.

> Binaries are not committed. Build them via `scripts/update_all_installers.sh` (or ps1 on Windows) before distribution.

## 🚀 Installation
1) Make binaries executable: `chmod +x fastgraph fastgraph-registry install`
2) Move them into a PATH directory (e.g., `/usr/local/bin`)

## 🛠️ Verify
```bash
fastgraph --version
# Output: 0.4.0
```

## 🧩 Streaming Contract
`chunk` events include `node`, `node_name`, and `text` for gateway/UI mapping. Streaming remains opt-in via `fastgraph run --stream`.
