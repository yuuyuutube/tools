#!/bin/sh
# 重新產生分享圖與圖示。需要先 npm start（預設 http://127.0.0.1:4317）與 Google Chrome。
# 衣服配色與圖案是隨機的，不滿意就再跑一次。
cd "$(dirname "$0")/.." || exit 1
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
BASE="${BASE:-http://127.0.0.1:4317}"
shoot() { "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size="$2" --virtual-time-budget=4000 --screenshot="$PWD/$1" "$3" >/dev/null 2>&1; }
shoot assets/og.png 1200,630 "$BASE/?shot&night=0&wear=tee,socks"
shoot assets/icon-512.png 512,512 "file://$PWD/assets/icon.svg"
sips -Z 32 assets/icon-512.png --out assets/icon-32.png >/dev/null
# iOS 會自己裁圓角，主畫面圖示要滿版、不能有透明角落
sed 's/rx="14"/rx="0"/' assets/icon.svg > assets/icon-full.svg
shoot assets/icon-512.png 512,512 "file://$PWD/assets/icon-full.svg"
sips -Z 180 assets/icon-512.png --out assets/apple-touch-icon.png >/dev/null
rm assets/icon-512.png assets/icon-full.svg
ls -l assets
