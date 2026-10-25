$env:Path = "C:\Program Files\nodejs;" + [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
Set-Location "$PSScriptRoot\web"
Write-Host "Starting UART Messenger Local Server..." -ForegroundColor Cyan
& "C:\Program Files\nodejs\npm.cmd" run dev
