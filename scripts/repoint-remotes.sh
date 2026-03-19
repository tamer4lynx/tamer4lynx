#!/bin/bash
# Repoint all remotes to tamer4lynx org. Run after creating repos at github.com/tamer4lynx.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Setting main repo origin to tamer4lynx/tamer4lynx..."
git remote set-url origin https://github.com/tamer4lynx/tamer4lynx.git

for sub in packages/jiggle packages/tamer-dev-app packages/tamer-dev-client \
  packages/tamer-plugin packages/tamer-router packages/tamer-icons packages/tamer-insets \
  packages/tamer-system-ui packages/tamer-app-shell packages/tamer-text-input packages/tamer-auth \
  packages/tamer-biometric packages/tamer-display-browser packages/tamer-linking \
  packages/tamer-screen packages/tamer-secure-store packages/tamer-transports; do
  name=$(basename "$sub")
  if [ -d "$sub/.git" ]; then
    echo "Setting $sub origin to tamer4lynx/$name..."
    (cd "$sub" && git remote set-url origin "https://github.com/tamer4lynx/$name.git")
  fi
done

echo "Run: git submodule update --init --recursive  # to sync .gitmodules URLs"
echo "Then push main: git push origin main"
echo "Then push each submodule from its directory: git push origin main"
