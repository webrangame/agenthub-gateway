# FastGraph v0.3.1 Release Notes

**Release Date:** December 11, 2024  
**Status:** Production Ready

## 🎉 Overview

v0.3.1 is a quality and stability release focusing on CI/CD fixes, production readiness improvements, and agent modernization with **cross-platform support**.

---

## 📦 Platform Support

### Supported Platforms
- ✅ **Windows** (x64)
- ✅ **macOS Intel** (x64)
- ✅ **macOS Apple Silicon** (ARM64)
- ✅ **Linux** (x64)
- ✅ **Android** (ARM64) - Experimental

Each platform includes:
- `fastgraph` CLI binary
- `fastgraph-registry` server binary  
- Platform-specific README with installation instructions
- Release notes

### Directory Structure
```
installer_v0.3.1/
├── windows/
│   ├── fastgraph.exe
│   ├── fastgraph-registry.exe
│   └── README.md
├── mac-intel/
│   ├── fastgraph
│   ├── fastgraph-registry
│   └── README.md
├── mac-arm/
│   ├── fastgraph (ARM64)
│   ├── fastgraph-registry
│   └── README.md
├── linux/
│   ├── fastgraph
│   ├── fastgraph-registry
│   └── README.md
├── android/
│   ├── fastgraph (requires Termux)
│   ├── fastgraph-registry
│   └── README.md
└── RELEASE_NOTES.md (this file)
```

---

## ✨ What's New

### 🔧 CI/CD & Quality Improvements
- **Fixed all test failures** (4 test fixes in runtime/mlang packages)
- **Resolved all linting errors** (10 errcheck + staticcheck violations)
- **100% passing test suite** across all packages
- **Clean golangci-lint** run with no errors

### 📚 Documentation Updates
- **Updated interface_contract.md** to 100% accuracy
  - Fixed code block formatting
  - Added provider-specific streaming caveats
  - Documented Anthropic streaming limitation
- **Platform-specific README files** for each installer
- **Streaming production readiness analysis** added

### 🛡️ Trip Guardian Modernization
- **Added schedule support** for proactive mode (every 30m)
- **Updated agent name** from TripValidator → TripGuardian
- **Enhanced capabilities** list for better discovery
- **Production registry** endpoint configuration

---

## 🐛 Bug Fixes

### Test Failures
1. **coverage_test.go** - Fixed type mismatch (string vs map)
2. **inspect_test.go** - Fixed parser block ordering  
3. **schedule_test.go** - Fixed test expectations
4. **Mock callback** - Added error checking

### Linting Errors
1. **3 json.Encode() calls** - Added error handling
2. **server.Shutdown()** - Added error logging
3. **w.Write()** - Used blank identifier
4. **conn.SetReadDeadline()** - Added error checking
5. **2 empty branches** - Removed staticcheck violations

---

## 🚀 Installation

### Windows
Download `windows/` folder and run:
```powershell
.\fastgraph.exe --version
```

### macOS Intel
Download `mac-intel/` folder:
```bash
chmod +x fastgraph fastgraph-registry
./fastgraph --version
```

### macOS Apple Silicon
Download `mac-arm/` folder:
```bash
chmod +x fastgraph fastgraph-registry
./fastgraph --version
```

### Linux
Download `linux/` folder:
```bash
chmod +x fastgraph fastgraph-registry
./fastgraph --version
```

### Android (Experimental)
Requires Termux. Download `android/` folder and see README.md for setup.

---

## 📊 Test Results

```
✅ pkg/registry  - 9 tests PASS
✅ pkg/network   - 9 tests PASS  
✅ pkg/runtime   - 16 tests PASS
✅ pkg/mlang     - 65 tests PASS
✅ cmd/fastgraph - 5 tests PASS

✅ golangci-lint - No errors
✅ Cross-platform builds - All successful
```

---

## 📖 Trip Guardian Updates

The modernized Trip Guardian agent now supports:

**Proactive Mode:**
- Runs every 30 minutes automatically
- Monitors weather, safety, cultural events
- Pushes insights proactively

**New Syntax:**
```m
agent TripGuardian {
  network {
    registry: "http://3.208.94.148:8080"
    capabilities: ["trip-guardian", "travel-assistant", "weather-monitoring", "safety-alerts"]
  }
  
  schedule {
    interval: "30m"
    mode: "proactive"
  }
  
  nodes { ... }
  edges { ... }
}
```

---

## 🔄 Breaking Changes

**None** - This is a backward-compatible release.

---

## 🔮 What's Next (v0.4.0)

Planned features for next release:
- Reactive chat interface for trip-guardian
- Dual-mode operation support
- Enhanced scheduling options
- Gateway implementation
- iOS/iPadOS support

---

## 🙏 Credits

Cross-platform builds created with Go's excellent toolchain. All tests passing thanks to comprehensive code review and careful error handling improvements.

For detailed changes, see GitHub releases.
