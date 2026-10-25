@echo off
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0web"
echo Starting UART Messenger Web Server...
call npm.cmd run dev
pause
