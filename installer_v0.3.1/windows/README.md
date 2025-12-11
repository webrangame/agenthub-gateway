# FastGraph v0.3.1 - Windows Installation

## 📦 What's Included
- `fastgraph.exe` - FastGraph CLI tool
- `fastgraph-registry.exe` - Registry server

## 🚀 Quick Start

### 1. Installation
1. Extract this folder to your desired location (e.g., `C:\Program Files\FastGraph`)
2. Add the folder to your system PATH:
   ```powershell
   $env:Path += ";C:\Program Files\FastGraph"
   ```

### 2. Verify Installation
```powershell
fastgraph --version
# Output: 0.3.1
```

### 3. Run Your First Agent
```powershell
# Navigate to examples
cd examples/trip-guardian

# Set up environment variables
copy .env.example .env
# Edit .env and add your API keys

# Run the agent
fastgraph run trip_guardian.m
```

### 4. Start Registry Server (Optional)
```powershell
fastgraph-registry --port 8080
```

## 📚 Documentation
- [M Language Spec](https://github.com/niyogen/fastgraph-go/blob/main/docs/m_language_spec.md)
- [Interface Contract](https://github.com/niyogen/fastgraph-go/blob/main/docs/specs/interface_contract.md)

## 🔧 Requirements
- Windows 10 or later
- No additional dependencies required

## 💡 Examples
See the `examples/` directory for sample agents:
- `trip-guardian/` - Travel assistant with proactive monitoring
- `legal-contract-analyzer/` - Contract analysis agent
- `medical-summarizer/` - Medical document summarizer

## 🐛 Troubleshooting
**Issue**: `fastgraph: command not found`  
**Solution**: Add the installation folder to your PATH

**Issue**: API key errors  
**Solution**: Ensure `.env` file has valid `OPENAI_API_KEY`

For more help, visit: https://github.com/niyogen/fastgraph-go
