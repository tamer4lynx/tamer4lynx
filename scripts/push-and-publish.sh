#!/usr/bin/env bash
set -e

REPO_ROOT="/Volumes/Storage/Projects/tamer4lynx"

# Packages with commits to push (or new repos to create+push)
PACKAGES=(
  tamer-navigation
  tamer-host
  tamer-dev-client
  tamer-insets
  tamer-icons
  tamer-router
  tamer-screen
  tamer-transports
  tamer-system-ui
  tamer-app-shell
  tamer-plugin
  tamer-linking
  tamer-local-storage
  tamer-webview
  tamer-auth
  tamer-biometric
  tamer-display-browser
  tamer-secure-store
  tamer-env
)

DESCRIPTIONS=(
  ["tamer-navigation"]="Native stack transport for Tamer4Lynx (TamerNav push/pop/dispatch)"
  ["tamer-host"]="Production Lynx host templates for existing iOS/Android apps"
  ["tamer-dev-client"]="Dev launcher module for Tamer4Lynx (QR scan, discovery, HMR)"
  ["tamer-insets"]="Safe area insets and keyboard state for Lynx"
  ["tamer-icons"]="Native icon element for Lynx (Material Icons, Font Awesome)"
  ["tamer-router"]="File-based routing for Lynx with Stack/Tabs and cross-spoke state"
  ["tamer-screen"]="Screen, SafeArea, and AvoidKeyboard components for Lynx"
  ["tamer-transports"]="Fetch, WebSocket, EventSource polyfills for Lynx"
  ["tamer-system-ui"]="Status bar and nav bar control for Lynx"
  ["tamer-app-shell"]="AppBar, TabBar, and Content navigation chrome for Lynx"
  ["tamer-plugin"]="Rsbuild plugin for Tamer4Lynx config merging"
  ["tamer-linking"]="Deep linking module for Lynx"
  ["tamer-local-storage"]="Web localStorage API for Lynx (SharedPreferences/UserDefaults)"
  ["tamer-webview"]="Native WebView element for Lynx"
  ["tamer-auth"]="OAuth 2.0 / PKCE authentication for Lynx"
  ["tamer-biometric"]="Biometric authentication for Lynx"
  ["tamer-display-browser"]="In-app browser for OAuth flows in Lynx"
  ["tamer-secure-store"]="Secure key-value storage for Lynx"
  ["tamer-env"]="Env file loading plugin for Rspeedy/Rsbuild"
)

echo "=== STEP 1: GitHub push ==="

for pkg in "${PACKAGES[@]}"; do
  d="$REPO_ROOT/packages/$pkg"
  echo ""
  echo "--- $pkg ---"

  # Create GitHub repo if it doesn't exist
  if ! gh repo view "tamer4lynx/$pkg" &>/dev/null; then
    desc="${DESCRIPTIONS[$pkg]:-$pkg}"
    echo "Creating https://github.com/tamer4lynx/$pkg"
    gh repo create "tamer4lynx/$pkg" --public --description "$desc"
  fi

  # Ensure remote is set
  git -C "$d" remote set-url origin "https://github.com/tamer4lynx/$pkg.git" 2>/dev/null || \
    git -C "$d" remote add origin "https://github.com/tamer4lynx/$pkg.git"

  # Push
  ahead=$(git -C "$d" log origin/main..HEAD --oneline 2>/dev/null | wc -l | tr -d ' ')
  if [ "$ahead" -gt 0 ] || [ "$pkg" = "tamer-navigation" ]; then
    git -C "$d" push origin main && echo "✅ pushed $pkg" || echo "⚠️  push failed for $pkg"
  else
    echo "↩️  $pkg up to date"
  fi
done

echo ""
echo "=== STEP 2: npm publish ==="

for pkg in "${PACKAGES[@]}"; do
  d="$REPO_ROOT/packages/$pkg"
  local_ver=$(node -p "require('$d/package.json').version" 2>/dev/null)
  npm_ver=$(npm view "@tamer4lynx/$pkg" version 2>/dev/null || echo "not_published")

  if [ "$npm_ver" = "not_published" ] || [ "$local_ver" != "$npm_ver" ]; then
    echo ""
    echo "--- Publishing @tamer4lynx/$pkg@$local_ver (npm has: $npm_ver) ---"
    cd "$d"
    npm publish --access public && echo "✅ published $pkg@$local_ver" || echo "⚠️  publish failed for $pkg"
    cd "$REPO_ROOT"
  else
    echo "↩️  @tamer4lynx/$pkg@$local_ver already on npm"
  fi
done

echo ""
echo "=== Done ==="
