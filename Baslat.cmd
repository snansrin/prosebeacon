@echo off
setlocal
cd /d "%~dp0"
echo Leksivoraq baslatiliyor. Tarayicida http://127.0.0.1:3210 adresini acin.
echo Durdurmak icin bu pencerede Ctrl+C kullanin.
call npm.cmd start
pause
