# FastGraph v0.3.1 - macOS Installation (Apple Silicon)

## 📦 What's Included
- `fastgraph` - FastGraph CLI tool (ARM64)
- `fastgraph-registry` - Registry server (ARM64)

## 🚀 Quick Start

### 1. Installation
1. Extract this folder to `/usr/local/bin` or your preferred location
2. Make binaries executable:
   ```bash
   chmod +x fastgraph fastgraph-registry
   ```
3. Move to PATH (if not already):
   ```bash
   sudo mv fastgraph fastgraph-registry /usr/local/bin/
   ```

### 2. Verify Installation
```bash
fastgraph --version
# Output: 0.3.1
```

### 3. Run Your First Agent
```bash
# Navigate to examples
cd examples/trip-guardian

# Set up environment variables
cp .env.example .env
# Edit .env and add your API keys

# Run the agent
fastgraph run trip_guardian.m
```

### 4. Start Registry Server (Optional)
```bash
fastgraph-registry --port 8080
```

## 📚 Documentation
- [M Language Spec](https://github.com/niyogen/fastgraph-go/blob/main/docs/m_language_spec.md)
- [Interface Contract](https://github.com/niyogen/fastgraph-go/blob/main/docs/specs/interface_contract.md)

## 🔧 Requirements
- macOS 11.0 (Big Sur) or later
- Apple Silicon (M1/M2/M3)
- No additional dependencies required

## 💡 Examples
See the `examples/` directory for sample agents:
- `trip-guardian/` - Travel assistant with proactive monitoring
- `legal-contract-analyzer/` - Contract analysis agent
- `medical-summarizer/` - Medical document summarizer

## 🐛 Troubleshooting
**Issue**: "fastgraph cannot be opened because the developer cannot be verified"  
**Solution**: Run `xattr -d com.apple.quarantine fastgraph fastgraph-registry`

**Issue**: Permission denied  
**Solution**: Run `chmod +x fastgraph fastgraph-registry`

For more help, visit: https://github.com/niyogen/fastgraph-go
