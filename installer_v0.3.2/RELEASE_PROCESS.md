# FastGraph Release Process

This document outlines the steps to build and release a new version of FastGraph.

## 1. Prerequisites
- Go 1.21+ installed
- Zip utility installed
- Access to the target architectures (can cross-compile from one machine)

## 2. Versioning
1. Update `RELEASE_NOTES.md` with new features and fixes.
2. Tag the release in git (e.g., `v0.3.3`).

## 3. Build Process

The release consists of three main components that need to be compiled for each platform (Windows, Linux, macOS/Darwin):
1. `fastgraph` (CLI)
2. `fastgraph-registry` (Service)
3. `installer` (Setup wrapper)

### Step 3.1: Build Binaries (Cross-Compilation)

Run the following commands from the root of the repository:

#### Windows (amd64)
```bash
GOOS=windows GOARCH=amd64 go build -o installer_v0.3.2/windows/fastgraph.exe ./cmd/fastgraph
GOOS=windows GOARCH=amd64 go build -o installer_v0.3.2/windows/fastgraph-registry.exe ./cmd/fastgraph-registry
GOOS=windows GOARCH=amd64 go build -o installer_v0.3.2/windows/setup.exe ./cmd/installer
```

#### Linux (amd64)
```bash
GOOS=linux GOARCH=amd64 go build -o installer_v0.3.2/linux/fastgraph ./cmd/fastgraph
GOOS=linux GOARCH=amd64 go build -o installer_v0.3.2/linux/fastgraph-registry ./cmd/fastgraph-registry
GOOS=linux GOARCH=amd64 go build -o installer_v0.3.2/linux/install ./cmd/installer
```

#### macOS (amd64 - Intel)
```bash
GOOS=darwin GOARCH=amd64 go build -o installer_v0.3.2/mac-intel/fastgraph ./cmd/fastgraph
GOOS=darwin GOARCH=amd64 go build -o installer_v0.3.2/mac-intel/fastgraph-registry ./cmd/fastgraph-registry
GOOS=darwin GOARCH=amd64 go build -o installer_v0.3.2/mac-intel/install ./cmd/installer
```

#### macOS (arm64 - Apple Silicon)
```bash
GOOS=darwin GOARCH=arm64 go build -o installer_v0.3.2/mac-arm/fastgraph ./cmd/fastgraph
GOOS=darwin GOARCH=arm64 go build -o installer_v0.3.2/mac-arm/fastgraph-registry ./cmd/fastgraph-registry
GOOS=darwin GOARCH=arm64 go build -o installer_v0.3.2/mac-arm/install ./cmd/installer
```

## 4. Packaging

After building, you should have populated the `installer_v0.3.2` subdirectories.

### structure
Ensure each platform directory has:
- `fastgraph` binary
- `fastgraph-registry` binary
- `install` / `setup` binary
- Copy of `README_INSTALL.md`

### Create Archives

Zip the contents of each platform directory to create the release artifacts:

```bash
cd installer_v0.3.2
zip -r fastgraph-v0.3.2-windows-amd64.zip windows/* README_INSTALL.md
zip -r fastgraph-v0.3.2-linux-amd64.zip linux/* README_INSTALL.md
zip -r fastgraph-v0.3.2-darwin-amd64.zip mac-intel/* README_INSTALL.md
zip -r fastgraph-v0.3.2-darwin-arm64.zip mac-arm/* README_INSTALL.md
```

## 5. Release

1. Upload the `.zip` files to the GitHub Release.
2. Upload `checksums.txt` (generate via `sha256sum *.zip > checksums.txt`).
