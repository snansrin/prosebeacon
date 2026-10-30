@echo off
setlocal
cd /d "%~dp0"
node -e "for (const name of ['pdfjs-dist','mammoth','docx','pdfkit','yauzl']) require.resolve(name)" >nul 2>&1
if errorlevel 1 (
  echo Belge okuma paketleri kuruluyor...
  call npm.cmd ci
  if errorlevel 1 (
    echo Paketler kurulamadi. Internet baglantisini ve Node.js surumunu kontrol edin.
    pause
    exit /b 1
  )
)
echo ProseBeacon baslatiliyor. Tarayicida http://127.0.0.1:3210 adresini acin.
echo Durdurmak icin bu pencerede Ctrl+C kullanin.
call npm.cmd start
pause
