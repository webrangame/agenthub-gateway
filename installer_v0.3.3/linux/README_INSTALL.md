# FastGraph v0.3.2 - Installation & Usage Guide

## 📦 What's Included
- `fastgraph` / `fastgraph.exe`: Core CLI compiler and runner.
- `fastgraph-registry` / `fastgraph-registry.exe`: Agent registry service.
- `setup.exe` (Windows) / `install` (Mac/Linux/Android): Automatic installation wrapper.

## 🚀 Installation

### Option 1: Automatic Installation (Recommended)
1. **Windows**: Double-click `setup.exe`.
2. **Mac/Linux**: Open a terminal, navigate to this folder, and run:
   ```bash
   chmod +x install
   ./install
   ```
   This will install binaries to your User Local bin directory and set up file associations.

### Option 2: Manual Installation
1. Move the binary files to a directory in your system PATH (e.g., `C:\Program Files\FastGraph` or `/usr/local/bin`).
2. Add the directory to your PATH if not already present.

## 🛠️ Verify Installation
Open a new terminal/command prompt and run:
```bash
fastgraph --version
# Output: 0.3.2
```

## 🏃 Quick Start

### 1. Run an Agent
Save the following as `hello.m`:
```mlang
agent HelloAgent {
    nodes {
        llm HelloNode {
            model: "gpt-4o-mini"
            prompt: "Say hello!"
        }
    }
    edges {
        START -> HelloNode -> END
    }
}
```

Run it:
```bash
fastgraph run hello.m
```

### 2. Start Registry (Optional)
```bash
fastgraph-registry --port 8080
```

### 3. CLI Command Reference

#### Core Commands
- **Run an Agent**:
  ```bash
  fastgraph run agent.m "input text"
  fastgraph run agent.m "$(cat input.txt)"
  ```

- **Create a New Agent**:
  ```bash
  fastgraph create "analyze sentiment of tweets"
  ```

- **Build Standalone Binary**:
  ```bash
  fastgraph build agent.m
  # Creates an executable 'agent' that runs without the CLI
  ```

#### Registry Management
- **Initialize/Migrate Database**:
  ```bash
  fastgraph migrate --db "postgres://user:pass@localhost:5432/dbname"
  ```

- **Start Registry Service**:
  ```bash
  fastgraph-registry --port 8080
  ```

## 📚 Documentation
- [M Language Spec](https://github.com/niyogen/fastgraph-go/blob/main/docs/m_language_spec.md)
- [Project Home](https://github.com/niyogen/fastgraph-go)

## 🔧 Requirements
- No external dependencies required.
- Internet connection required for LLM calls (OpenAI key in `.env`).

## 🐛 Troubleshooting
- **Command not found**: Ensure the install directory is in your PATH.
- **Permission denied**: Run `chmod +x fastgraph` on Linux/Mac.
