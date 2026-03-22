#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$APP_ROOT/../.." && pwd)"
MISO="$REPO_ROOT/reference/miso-lynx"

if [[ ! -d "$MISO" ]]; then
  echo "Expected miso-lynx at: $MISO" >&2
  exit 1
fi

if ! command -v bun >/dev/null 2>&1; then
  echo "bun is required (https://bun.sh)" >&2
  exit 1
fi

if ! command -v nix-build >/dev/null 2>&1; then
  echo "Nix is required to compile the counter example (GHCJS). Install Nix: https://nixos.org/download.html" >&2
  echo "Then: cd \"$MISO\" && nix-build -A miso-lynx-examples-ghcjs9122" >&2
  exit 1
fi

cd "$MISO"
bun install
bun run js

OUT="$(nix-build -A miso-lynx-examples-ghcjs9122)"
cp -f "$OUT/bin/counter.jsexe/all.js" "$MISO/all.js"
chmod +rw "$MISO/all.js"

mkdir -p "$MISO/dist"
bun build --minify-whitespace "$MISO/all.js" --target=bun --outfile="$MISO/dist/all.js"
bun run bundle

mkdir -p "$APP_ROOT/dist"
cp -f "$MISO/dist/main.lynx.bundle" "$APP_ROOT/dist/main.lynx.bundle"
echo "OK: $APP_ROOT/dist/main.lynx.bundle"
