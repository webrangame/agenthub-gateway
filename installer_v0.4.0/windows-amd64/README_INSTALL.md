# FastGraph v0.4.0 - Installation & Usage (Windows AMD64)

## 📦 What's Included (after build)
- `fastgraph.exe`: Core CLI compiler and runner.
- `fastgraph-registry.exe`: Agent registry service.
- `setup.exe`: Optional installer wrapper.

> Binaries are not committed. Build them via `scripts/update_all_installers.{ps1,bat}` before distribution.

## 🚀 Installation
1) Run `setup.exe`, or
2) Manually place the `.exe` files into a PATH directory (e.g., `C:\Program Files\FastGraph\bin`) and ensure PATH is set.

## 🛠️ Verify
```bash
fastgraph --version
# Output: 0.4.0
```

## 🧩 Streaming Contract
`chunk` events include `node`, `node_name`, and `text` for gateway/UI mapping. Streaming remains opt-in via `fastgraph run --stream`.
