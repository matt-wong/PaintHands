#!/bin/sh
# Builds PaintHands and installs it in the Applications folder, so it opens from
# Spotlight, Launchpad or the Dock without a terminal. macOS only.
# Run it again after changing the code or .env: npm run install:app
set -e

cd "$(dirname "$0")/.."

if pgrep -f "/Applications/PaintHands.app/" > /dev/null; then
  echo "PaintHands is open. Quit it, then run this again."
  exit 1
fi

npm run tauri build -- --bundles app

# Replace the whole app rather than copying over it, so no old files stay inside
rm -rf /Applications/PaintHands.app
ditto src-tauri/target/release/bundle/macos/PaintHands.app /Applications/PaintHands.app

# The installed app can't see this project folder, so it gets its own private
# copy of the API keys
if [ -f .env ]; then
  config="$HOME/Library/Application Support/com.matthewwong.painthands"
  mkdir -p "$config"
  cp .env "$config/.env"
  chmod 600 "$config/.env"
else
  echo "No .env found, so image search won't work until you add one and run this again."
fi

# Each build counts as a new app to macOS, so clear the old microphone answer
# and let it ask again the next time the app opens
tccutil reset Microphone com.matthewwong.painthands || true

echo "PaintHands is installed in your Applications folder."
