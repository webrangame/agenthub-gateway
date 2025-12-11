# FastGraph v0.3.1 - Android Installation

## 📦 What's Included
- `fastgraph` - FastGraph CLI tool (ARM64)
- `fastgraph-registry` - Registry server (ARM64)

## ⚠️ Important Note
Android is an experimental platform. Running CLI tools on Android requires Termux or a similar terminal emulator.

## 🚀 Quick Start

### 1. Prerequisites
Install Termux from F-Droid (recommended) or Google Play:
```bash
# Update packages
pkg update && pkg upgrade
```

### 2. Installation
1. Copy binaries to Termux:
   ```bash
   cp fastgraph fastgraph-registry $PREFIX/bin/
   ```
2. Make executable:
   ```bash
   chmod +x $PREFIX/bin/fastgraph $PREFIX/bin/fastgraph-registry
   ```

### 3. Verify Installation
```bash
fastgraph --version
# Output: 0.3.1
```

### 4. Run Your First Agent
```bash
# Install required tools
pkg install git

# Clone examples (or copy manually)
# Set up environment
export OPENAI_API_KEY="your-key-here"

# Run agent
fastgraph run trip_guardian.m
```

## 📚 Documentation
- [M Language Spec](https://github.com/niyogen/fastgraph-go/blob/main/docs/m_language_spec.md)
- [Interface Contract](https://github.com/niyogen/fastgraph-go/blob/main/docs/specs/interface_contract.md)

## 🔧 Requirements
- Android 7.0 (Nougat) or later
- ARM64 processor
- Termux or similar terminal emulator
- Stable internet connection

## ⚡ Limitations
- LLM streaming may be slower on mobile networks
- Battery consumption may be high for long-running agents
- Background execution may be limited by Android power management

## 💡 Use Cases
- On-device AI agent testing
- Travel assistant on mobile
- Lightweight agent execution

## 🐛 Troubleshooting
**Issue**: Permission denied  
**Solution**: Run `chmod +x fastgraph fastgraph-registry`

**Issue**: Command not found  
**Solution**: Ensure `$PREFIX/bin` is in your PATH

**Issue**: Network errors  
**Solution**: Check internet connection and firewall settings

For more help, visit: https://github.com/niyogen/fastgraph-go
