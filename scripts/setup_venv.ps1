$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$venvPath = Join-Path $root ".venv"

if (Get-Command py -ErrorAction SilentlyContinue) {
  py -m venv $venvPath
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
  python -m venv $venvPath
} else {
  throw "Neither 'py' nor 'python' is available. Install Python 3.11+ first."
}

$pythonExe = Join-Path $venvPath "Scripts\\python.exe"
& $pythonExe -m pip install --upgrade pip
& $pythonExe -m pip install -r (Join-Path $root "requirements.txt")

Write-Host "Virtual environment ready at $venvPath"
Write-Host "Activate it with: .\\.venv\\Scripts\\Activate.ps1"

