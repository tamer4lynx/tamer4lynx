# Example – Expo-like Lynx app

ReactLynx app built with Tamer4Lynx. Includes HMR, WebSocket support via tamer-transports, and native modules (jiggle).

## Getting started

### From monorepo (project root)

```bash
npm install
# or: pnpm install | bun install
npm run build        # build t4l CLI
t4l android create  # one-time
t4l start           # dev server with HMR + WebSocket
```

In another terminal:

```bash
t4l android build --install
```

### Standalone project

Create a new Lynx project and add packages from npm:

```bash
pnpm create rspeedy
cd my-app
pnpm add @tamer4lynx/tamer-transports@prerelease @tamer4lynx/jiggle@prerelease
# or: npm i @tamer4lynx/tamer-transports@prerelease @tamer4lynx/jiggle@prerelease
# or: bun add @tamer4lynx/tamer-transports@prerelease @tamer4lynx/jiggle@prerelease
t4l init
t4l start
```

## Scripts

- `t4l start` – Dev server (rspeedy dev) + WebSocket server for native app
- `t4l android build` – Build APK (autolink + bundle + gradle)
- `t4l android build -i` – Build and install on device

## Dependencies

- **@tamer4lynx/tamer-transports** – Native fetch, WebSocket, and EventSource polyfills (required for HMR and WebSocket in native app)
- **@tamer4lynx/jiggle** – Vibration/haptic native module
