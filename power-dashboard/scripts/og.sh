#!/bin/sh
# 重新產生分享圖與圖示。需要先 npm start（預設 http://127.0.0.1:4319）與 Chrome。
# Windows（Git Bash）：CHROME="/c/Program Files/Google/Chrome/Application/chrome.exe" sh scripts/og.sh
cd "$(dirname "$0")/.." || exit 1
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
BASE="${BASE:-http://127.0.0.1:4319}"
DIR="$(command -v cygpath >/dev/null && cygpath -m "$PWD" || echo "$PWD")"
shoot() { "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size="$2" --virtual-time-budget=6000 --screenshot="$DIR/$1" "$3" >/dev/null 2>&1; }
shoot assets/og.png 1200,630 "$BASE/?shot"
# 圖示：給 SVG 明確的寬高再截圖；iOS 會自己裁圓角，主畫面圖示要滿版
sed 's/<svg /<svg width="32" height="32" /' assets/icon.svg > assets/icon-tmp32.svg
sed -e 's/rx="14"/rx="0"/' -e 's/<svg /<svg width="180" height="180" /' assets/icon.svg > assets/icon-tmp180.svg
shoot assets/icon-32.png 32,32 "file:///$DIR/assets/icon-tmp32.svg"
shoot assets/apple-touch-icon.png 180,180 "file:///$DIR/assets/icon-tmp180.svg"
rm -f assets/icon-tmp32.svg assets/icon-tmp180.svg
ls -l assets
