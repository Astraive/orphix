#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
#  Orphix Mobile Dev Launcher (Expo)
# ─────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE_DIR="$ROOT/apps/mobile"

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[orphix]${NC} $*"; }
ok()    { echo -e "${GREEN}[  ok  ]${NC} $*"; }
fail()  { echo -e "${RED}[ fail ]${NC} $*"; }

if [ ! -d "$MOBILE_DIR" ]; then
    fail "apps/mobile not found"
    exit 1
fi

# Install deps if needed
if [ ! -d "$ROOT/node_modules" ]; then
    info "Installing dependencies…"
    cd "$ROOT" && pnpm install
fi

info "Starting mobile app (Expo)…"
ok "Expo DevTools → http://localhost:8081"
ok "Scan QR code with Expo Go on your phone"
echo ""

cd "$MOBILE_DIR" && npx expo start "$@"
