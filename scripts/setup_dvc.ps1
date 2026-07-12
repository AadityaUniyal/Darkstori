# PowerShell script to setup Data Version Control (DVC)
# This script fulfills GAP 1.3: Data versioning for reproducibility.

Write-Host "Setting up Data Version Control (DVC) for Darkstori..."

# Check if pip is available
if (-not (Get-Command "pip" -ErrorAction SilentlyContinue)) {
    Write-Error "pip is not installed or not in PATH. Please install Python and pip first."
    exit 1
}

# Install DVC
Write-Host "Installing DVC..."
pip install dvc

# Initialize DVC
Write-Host "Initializing DVC in the current directory..."
dvc init

# Track data directories
Write-Host "Adding data directories to DVC tracking..."
if (Test-Path "data/raw") {
    dvc add data/raw
} else {
    Write-Warning "Directory data/raw not found, skipping..."
}

if (Test-Path "data/external") {
    dvc add data/external
} else {
    Write-Warning "Directory data/external not found, skipping..."
}

if (Test-Path "data/processed") {
    dvc add data/processed
} else {
    Write-Warning "Directory data/processed not found, skipping..."
}

# Configure remote (Optional: Local directory for now)
Write-Host "Configuring local DVC remote..."
New-Item -ItemType Directory -Force -Path "C:\tmp\dvcstore"
dvc remote add -d myremote C:\tmp\dvcstore

# Commit DVC files to Git
Write-Host "Committing DVC configuration to Git..."
git add .dvc/config .dvcignore data/*.dvc
git commit -m "Initialize DVC for data versioning (GAP 1.3)"

Write-Host "DVC setup complete! You can now use 'dvc push' and 'dvc pull' to sync data."
