#!/bin/sh
# Downloads the offline speech recogniser (Vosk) and its small English model
# into src-tauri/vosk. macOS only. Run once with: npm run setup:voice
set -e

dir="$(dirname "$0")/../src-tauri/vosk"
rm -rf "$dir"
mkdir -p "$dir"
cd "$dir"

curl -L --fail -o lib.zip https://github.com/alphacep/vosk-api/releases/download/v0.3.42/vosk-osx-0.3.42.zip
curl -L --fail -o model.zip https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip
unzip -q lib.zip
unzip -q model.zip
mv vosk-osx-0.3.42/libvosk.dylib .
mv vosk-model-small-en-us-0.15 model
rm -r lib.zip model.zip vosk-osx-0.3.42

# Let the app find the library next to itself instead of in a system folder
install_name_tool -id @rpath/libvosk.dylib libvosk.dylib
codesign --force --sign - libvosk.dylib

echo "Voice files are ready in src-tauri/vosk"
