#!/bin/sh
# 重新產生分享圖與圖示。需要先 npm start（預設 http://127.0.0.1:4318）與 Chrome。
cd "$(dirname "$0")/.." || exit 1
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
BASE="${BASE:-http://127.0.0.1:4318}"
shoot() { "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size="$2" --virtual-time-budget=5000 --screenshot="$PWD/$1" "$3" >/dev/null 2>&1; }
shoot assets/og.png 1200,630 "$BASE/?shot&coast=hualien"
shoot assets/icon-512.png 512,512 "file://$PWD/assets/icon.svg"
shoot assets/icon-32.png 32,32 "file://$PWD/assets/icon.svg"
# iOS 會自己裁圓角，主畫面圖示要滿版
sed 's/rx="14"/rx="0"/' assets/icon.svg > assets/icon-full.svg
shoot assets/apple-touch-icon.png 180,180 "file://$PWD/assets/icon-full.svg"
rm -f assets/icon-512.png assets/icon-full.svg
ls -l assets
