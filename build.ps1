# sPanel Single-Binary Build Script
param (
    [string]$Target = "local" # "local" or "linux"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "⚡ Building sPanel Single-Binary PaaS..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Build Next.js Dashboard
Write-Host "`n[1/2] Building Next.js Dashboard (output: export)..." -ForegroundColor Yellow
Set-Location -Path "./web"
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed!" -ForegroundColor Red
    Set-Location -Path ".."
    exit $LASTEXITCODE
}
Set-Location -Path ".."

# 2. Build Go Binary with Embedded Assets
Write-Host "`n[2/2] Compiling Go Binary with //go:embed..." -ForegroundColor Yellow

if ($Target -eq "linux") {
    Write-Host "Target: Linux amd64 (CGO_ENABLED=0)" -ForegroundColor Green
    $env:CGO_ENABLED="0"
    $env:GOOS="linux"
    $env:GOARCH="amd64"
    go build -ldflags="-s -w" -o spanel-linux-amd64 ./cmd/server
} else {
    Write-Host "Target: Local Windows Executable" -ForegroundColor Green
    go build -o spanel.exe ./cmd/server
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backend compilation failed!" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "`n🎉 SUCCESS! sPanel Single-Binary is ready!" -ForegroundColor Green
if ($Target -eq "linux") {
    Write-Host "Binary artifact: ./spanel-linux-amd64 (Deploy this single file to your VPS!)" -ForegroundColor Cyan
} else {
    Write-Host "Binary artifact: ./spanel.exe (Run .\spanel.exe to launch dashboard & API!)" -ForegroundColor Cyan
}
