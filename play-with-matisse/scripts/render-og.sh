#!/bin/sh
# Renders og.png, apple-touch-icon.png and icon-32.png with headless Chrome.
# Needs the dev server running: python3 scripts/dev-server.py 8767
set -e
cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BASE="${BASE:-http://localhost:8767}"
shot() { "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --virtual-time-budget=3000 "$@" >/dev/null 2>&1; }
shot --window-size=1200,630 --screenshot="$PWD/og.png" "$BASE/scripts/og.html"
# Headless windows have a minimum size, so render each icon centred in a larger window and centre-crop it with sips.
shot --window-size=600,600 --screenshot="$PWD/assets/apple-touch-icon.png" "$BASE/scripts/icon.html?bg=1&s=180"
shot --window-size=600,600 --default-background-color=00000000 --screenshot="$PWD/assets/icon-32.png" "$BASE/scripts/icon.html?s=32"
sips -c 180 180 assets/apple-touch-icon.png >/dev/null
sips -c 32 32 assets/icon-32.png >/dev/null
ls -l og.png assets/apple-touch-icon.png assets/icon-32.png
