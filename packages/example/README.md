# Example – Expo-like Lynx app

ReactLynx app built with Tamer4Lynx. Includes HMR, WebSocket support via lynxwebsockets, and native modules (jiggle).

## Getting started

From the **project root** (not packages/example):

```bash
npm install
npm run build        # build t4l CLI
t4l android create  # one-time
t4l start           # dev server with HMR + WebSocket
```

In another terminal, build and run the app:

```bash
t4l android build --install
```

Or use npm scripts from the root: `npm run start`, `npm run android:build:install`

## Scripts

- `t4l start` – Dev server (rspeedy dev) + WebSocket server for native app
- `t4l android build` – Build APK (autolink + bundle + gradle)
- `t4l android build -i` – Build and install on device

## Dependencies

- **lynxwebsockets** – Native WebSocket polyfill for Lynx (required for HMR and WebSocket in native app)
- **jiggle** – Vibration/haptic native module
