@echo off
setlocal EnableDelayedExpansion
title ProseBeacon kurulum
color 0B
cd /d "%~dp0"

echo.
echo   ProseBeacon - yerel akademik yazi motoru
echo   Kurulum basliyor... (komut satiri bilgisi gerekmez)
echo.

rem --------------------------------------------------------------- 1) Node.js
where node >nul 2>nul
if errorlevel 1 (
  echo   [1/4] Node.js bulunamadi.
  echo         ProseBeacon icin Node.js 20 veya uzeri gerekir.
  echo         Simdi indirme sayfasini aciyorum; kurduktan sonra bu dosyayi tekrar calistirin.
  start "" https://nodejs.org/tr/download
  echo.
  pause
  exit /b 1
)
for /f "delims=" %%i in ('where node') do set "NODEPATH=%%i"
for /f "tokens=1 delims=." %%v in ('node -v') do set "NODEVER=%%v"
echo   [1/4] Node.js bulundu: !NODEVER!

rem ------------------------------------------------------------ 2) bagimlilik
if not exist "node_modules\" (
  echo   [2/4] Paketler yukleniyor ^(ilk kurulumda bir dakika surebilir^)...
  call npm install --no-audit --no-fund --loglevel=error
  if errorlevel 1 (
    echo         Paket kurulumu basarisiz oldu. Internet baglantisini kontrol edin.
    pause
    exit /b 1
  )
) else (
  echo   [2/4] Paketler zaten yuklu.
)

rem ------------------------------------------------------- 3) gizli baslatici
echo   [3/4] Baslatici olusturuluyor...
> "%~dp0ProseBeacon.vbs" (
  echo Set shell = CreateObject^("WScript.Shell"^)
  echo shell.CurrentDirectory = "%~dp0."
  echo shell.Run """!NODEPATH!"" ""%~dp0tools\launch.js""", 0, True
)

rem ------------------------------------------------------ 4) masaustu kisayol
echo   [4/4] Masaustune ProseBeacon kisayolu ekleniyor...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$d=[Environment]::GetFolderPath('Desktop'); $s=(New-Object -ComObject WScript.Shell).CreateShortcut($d+'\ProseBeacon.lnk'); $s.TargetPath='wscript.exe'; $s.Arguments='//nologo \"%~dp0ProseBeacon.vbs\"'; $s.WorkingDirectory='%~dp0.'; $s.IconLocation='%~dp0assets\pb.ico,0'; $s.Description='ProseBeacon - yerel akademik yazi motoru'; $s.WindowStyle=7; $s.Save()"
if errorlevel 1 (
  echo         Kisayol otomatik olusturulamadi. "%~dp0ProseBeacon.vbs" dosyasina cift tiklayarak da baslatabilirsiniz.
)

echo.
echo   Kurulum tamamlandi.
echo   Masaustundeki "ProseBeacon" simgesine cift tiklayin; tarayici kendiliginden acilir.
echo   Kapatmak icin tarayici sekmesini kapatip Gorev Yoneticisinden node islemini sonlandirin,
echo   veya terminalde calistirdiysaniz Ctrl+C yapin.
echo.
set /p LAUNCH="  Simdi baslatilsin mi? [E/h] "
if /i "!LAUNCH!"=="h" goto end
start "" wscript.exe //nologo "%~dp0ProseBeacon.vbs"
:end
pause
endlocal
