#!/bin/bash
# Create tamer4lynx org repos and push. Requires gh CLI and org admin access.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ORG="tamer4lynx"

SUBMODULES=(
  docs jiggle tamer-dev-app tamer-dev-client tamer-plugin tamer-router
  tamer-icons tamer-insets tamer-system-ui tamer-app-shell tamer-text-input
  tamer-auth tamer-biometric tamer-display-browser tamer-linking
  tamer-screen tamer-secure-store tamer-transports
)

cd "$ROOT"

echo "=== Creating main repo $ORG/tamer4lynx ==="
gh repo create "$ORG/tamer4lynx" --public --description "CLI and native modules for Lynx" --source=. --remote=tamer4lynx 2>/dev/null || \
  git remote add tamer4lynx "https://github.com/$ORG/tamer4lynx.git" 2>/dev/null || true
git push tamer4lynx HEAD:main

echo ""
echo "=== Creating submodule repos and pushing ==="
for name in "${SUBMODULES[@]}"; do
  sub="packages/$name"
  if ! git -C "$sub" rev-parse --git-dir >/dev/null 2>&1; then
    echo "Skipping $sub (not a git repo)"
    continue
  fi
  echo "--- $name ---"
  gh repo create "$ORG/$name" --public --description "Tamer4Lynx package" 2>/dev/null || true
  (cd "$sub" && git remote set-url origin "https://github.com/$ORG/$name.git")
  branch=$(cd "$sub" && git branch --show-current)
  (cd "$sub" && git push -u origin "${branch}:main")
done

echo ""
echo "Done. Main repo: https://github.com/$ORG/tamer4lynx"
