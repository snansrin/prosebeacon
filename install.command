#!/bin/bash
# ProseBeacon macOS installer — double-clickable. Creates a real application
# bundle in ~/Applications with the ProseBeacon icon; no Terminal needed.
cd "$(dirname "$0")" || exit 1

echo ""
echo "  ProseBeacon — yerel akademik yazı motoru (macOS kurulumu)"
echo ""

NODE_BIN="$(command -v node || true)"
if [ -z "$NODE_BIN" ]; then
  for candidate in /usr/local/bin/node /opt/homebrew/bin/node "$HOME/.nvm/versions/node"/*/bin/node; do
    if [ -x "$candidate" ]; then NODE_BIN="$candidate"; break; fi
  done
fi
if [ -z "$NODE_BIN" ]; then
  echo "  Node.js bulunamadı. https://nodejs.org adresinden kurup bu dosyayı tekrar çalıştırın."
  open "https://nodejs.org" 2>/dev/null || true
  read -r -p "  Kapatmak için Enter'a basın…" _
  exit 1
fi
echo "  [1/4] Node.js: $NODE_BIN"

if [ ! -d node_modules ]; then
  echo "  [2/4] Paketler yükleniyor (ilk kurulumda bir dakika sürebilir)…"
  "$NODE_BIN" "$(dirname "$NODE_BIN")/npm" install --no-audit --no-fund --loglevel=error || { echo "  Paket kurulumu başarısız."; exit 1; }
else
  echo "  [2/4] Paketler zaten kurulu."
fi

APP="$HOME/Applications/ProseBeacon.app"
echo "  [3/4] Uygulama oluşturuluyor: $APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key><string>launch</string>
  <key>CFBundleIdentifier</key><string>org.prosebeacon.app</string>
  <key>CFBundleName</key><string>ProseBeacon</string>
  <key>CFBundleDisplayName</key><string>ProseBeacon</string>
  <key>CFBundleIconFile</key><string>pb</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>0.3.0</string>
  <key>LSMinimumSystemVersion</key><string>10.15</string>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
PLIST

cat > "$APP/Contents/MacOS/launch" <<'LAUNCH'
#!/bin/bash
REPO="REPO_PATH_PLACEHOLDER"
cd "$REPO" || exit 1
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
NODE="$(command -v node || true)"
if [ -z "$NODE" ]; then
  for candidate in /usr/local/bin/node /opt/homebrew/bin/node "$HOME/.nvm/versions/node"/*/bin/node; do
    if [ -x "$candidate" ]; then NODE="$candidate"; break; fi
  done
fi
[ -x "$NODE" ] || { osascript -e 'display dialog "Node.js bulunamadı. https://nodejs.org adresinden kurun." buttons {"Tamam"}' ; exit 1; }
exec "$NODE" "$REPO/tools/launch.js"
LAUNCH
sed -i '' "s|REPO_PATH_PLACEHOLDER|$PWD|g" "$APP/Contents/MacOS/launch"
chmod +x "$APP/Contents/MacOS/launch"
cp -f assets/pb.icns "$APP/Contents/Resources/pb.icns"

echo "  [4/4] Uygulama açılıyor…"
touch "$APP"
open "$APP"

echo ""
echo "  Kurulum tamam. ProseBeacon artık ~/Applications içinde; Dock'a da sabitleyebilirsiniz."
echo "  Kapatmak için: ⌘Q veya Aktivite Monitörü'nden 'node' sürecini sonlandırın."
read -r -p "  Kapatmak için Enter'a basın…" _
