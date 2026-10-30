#!/usr/bin/env bash
# ProseBeacon Linux installer: registers a desktop entry with the pb icon and
# adds a desktop shortcut. No terminal knowledge required afterwards.
set -euo pipefail
cd "$(dirname "$0")"

echo ""
echo "  ProseBeacon — yerel akademik yazı motoru (Linux kurulumu)"
echo ""

NODE_BIN="$(command -v node || true)"
if [ -z "$NODE_BIN" ]; then
  echo "  Node.js bulunamadı. Dağıtımınızın paket yöneticisiyle kurun:"
  echo "    Ubuntu/Debian : sudo apt install nodejs npm"
  echo "    Fedora        : sudo dnf install nodejs npm"
  echo "    Arch          : sudo pacman -S nodejs npm"
  exit 1
fi
echo "  [1/4] Node.js: $NODE_BIN"

if [ ! -d node_modules ]; then
  echo "  [2/4] Paketler yükleniyor…"
  npm install --no-audit --no-fund --loglevel=error
else
  echo "  [2/4] Paketler zaten kurulu."
fi

ICON_DIR="$HOME/.local/share/icons"
APP_DIR="$HOME/.local/share/applications"
mkdir -p "$ICON_DIR" "$APP_DIR"
cp -f assets/pb.png "$ICON_DIR/prosebeacon.png"
echo "  [3/4] Simge kopyalandı: $ICON_DIR/prosebeacon.png"

cat > "$APP_DIR/prosebeacon.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Version=1.1
Name=ProseBeacon
GenericName=Academic writing assistant
Comment=Yerel akademik yazı ve kaynak denetimi
Exec=$NODE_BIN $PWD/tools/launch.js
Path=$PWD
Icon=prosebeacon
Terminal=false
StartupNotify=false
Categories=Office;Education;TextEditor;
Keywords=tez;rapor;akademik;yazım;kaynakça;
DESKTOP

DESKTOP_FILE="$HOME/Masaüstü/prosebeacon.desktop"
[ -d "$HOME/Desktop" ] && DESKTOP_FILE="$HOME/Desktop/prosebeacon.desktop"
cp -f "$APP_DIR/prosebeacon.desktop" "$DESKTOP_FILE"
chmod +x "$DESKTOP_FILE"
# GNOME marks copied launchers untrusted until they are flagged executable.
if command -v gio >/dev/null 2>&1; then gio set "$DESKTOP_FILE" metadata::trusted true 2>/dev/null || true; fi
echo "  [4/4] Kısayol oluşturuldu: $DESKTOP_FILE"

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$APP_DIR" 2>/dev/null || true
fi

echo ""
echo "  Kurulum tamam. Uygulama menüsünde veya masaüstünde 'ProseBeacon' simgesine tıklayın."
echo "  Şimdi başlatılsın mı? [E/h]"
read -r ANSWER || ANSWER=E
if [ "${ANSWER,,}" != "h" ]; then
  nohup "$NODE_BIN" "$PWD/tools/launch.js" >/dev/null 2>&1 &
fi
