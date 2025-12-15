param(
  [switch]$Deep
)

$ErrorActionPreference = "Stop"

function Remove-DirIfExists([string]$Path) {
  if (Test-Path -LiteralPath $Path) {
    Write-Host "Removing directory: $Path"
    Remove-Item -LiteralPath $Path -Recurse -Force
  }
}

function Remove-FileIfExists([string]$Path) {
  if (Test-Path -LiteralPath $Path) {
    Write-Host "Removing file: $Path"
    Remove-Item -LiteralPath $Path -Force
  }
}

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $RepoRoot

try {
  # Dependency folders (largest offenders)
  Remove-DirIfExists (Join-Path $RepoRoot "node_modules")
  Remove-DirIfExists (Join-Path $RepoRoot "client\node_modules")
  Remove-DirIfExists (Join-Path $RepoRoot "client-next\node_modules")

  # Vite build outputs / caches
  Remove-DirIfExists (Join-Path $RepoRoot "client\dist")
  Remove-DirIfExists (Join-Path $RepoRoot "client\dist-ssr")
  Remove-DirIfExists (Join-Path $RepoRoot "client\coverage")
  Remove-DirIfExists (Join-Path $RepoRoot "client\.vite")

  # Next.js outputs / caches
  Remove-DirIfExists (Join-Path $RepoRoot "client-next\.next")
  Remove-DirIfExists (Join-Path $RepoRoot "client-next\out")
  Remove-DirIfExists (Join-Path $RepoRoot "client-next\coverage")
  Remove-DirIfExists (Join-Path $RepoRoot "client-next\.vercel")

  # Common log-ish artifacts in this repo (optional)
  if ($Deep) {
    Remove-FileIfExists (Join-Path $RepoRoot "stdout.txt")
    Remove-FileIfExists (Join-Path $RepoRoot "stderr.txt")
    Remove-FileIfExists (Join-Path $RepoRoot "stream_output.txt")
    Remove-FileIfExists (Join-Path $RepoRoot "test_output.txt")
    Remove-FileIfExists (Join-Path $RepoRoot "fastgraph_raw_output.txt")
    Remove-FileIfExists (Join-Path $RepoRoot "fastgraph_stream_output.txt")

    Remove-FileIfExists (Join-Path $RepoRoot "server\test_output.txt")
    Remove-FileIfExists (Join-Path $RepoRoot "server\fastgraph_raw_output.txt")
    Remove-FileIfExists (Join-Path $RepoRoot "server\fastgraph_stream_output.txt")
  }

  Write-Host ""
  Write-Host "Clean complete."
  Write-Host "Tip: run with -Deep to also remove local output/log artifacts."
} finally {
  Pop-Location
}


