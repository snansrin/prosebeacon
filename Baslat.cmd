@echo off
setlocal
cd /d "%~dp0"
if not exist "node_modules\pdfjs-dist\package.json" (
  echo Belge okuma paketleri kuruluyor...
  call npm.cmd ci
  if errorlevel 1 (
    echo Paketler kurulamadi. Internet baglantisini ve Node.js surumunu kontrol edin.
    pause
    exit /b 1
  )
)
echo Leksivoraq baslatiliyor. Tarayicida http://127.0.0.1:3210 adresini acin.
echo Durdurmak icin bu pencerede Ctrl+C kullanin.
call npm.cmd start
pause
