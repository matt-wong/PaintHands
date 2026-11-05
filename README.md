# PaintHands

A desktop reference board for painters, built with Tauri, React and TypeScript.

## Setup

1. Install [Node.js](https://nodejs.org) and [Rust](https://rustup.rs).
2. Run `npm install`.
3. Copy `.env.example` to `.env` and add your Unsplash and Pixabay API keys.
4. Run `npm run setup:voice` once to download the offline speech recogniser (macOS only for now).
5. Run `npm run tauri dev`.

## Install as an app

Run `npm run install:app` to build PaintHands and put it in your Applications folder (macOS only). After that it opens from Spotlight, Launchpad or the Dock, with no terminal needed. The app does not update itself: run the command again after changing the code or `.env`. macOS will ask for microphone access again after each install.

The installed app and `npm run tauri dev` keep separate pinned collections.

## Voice

With a microphone connected, say "paint hands" followed by the name of one of the buttons in the bar at the bottom of the window, for example "paint hands pin three" or "paint hands search red apples". Clicking a button does the same thing as saying it. Speech is recognised on your computer by [Vosk](https://alphacephei.com/vosk/); nothing is sent over the internet.
