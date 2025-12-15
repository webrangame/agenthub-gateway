# FastGraph v0.3.3 - Installation & Usage Guide

## 📦 What's Included
- `fastgraph.exe`: Core CLI compiler and runner.
- `fastgraph-registry.exe`: Agent registry service.
- `setup.exe`: Automatic installation wrapper.

## 🚀 Installation (Windows)

### Option 1: Automatic Installation (Recommended)
1. Double-click `setup.exe`.

### Option 2: Manual Installation
1. Move the `.exe` files to a directory in your system PATH (e.g., `C:\Program Files\FastGraph\bin`).
2. Add that directory to your PATH if not already present.

## 🛠️ Verify Installation
Open a new terminal/command prompt and run:

```bash
fastgraph --version
# Output: 0.3.3
```

## 🧩 Streaming Contract (Gateway/UI)
When using streaming (SSE or `fastgraph run --stream`), each `chunk` event includes:
- `node` (always non-empty; fallback: `"unknown"`)
- `node_name` (alias of `node`)
- `text` (the chunk text)


