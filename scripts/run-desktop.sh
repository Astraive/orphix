#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
#  Orphix Desktop Dev Launcher (Electron)
# ─────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DESKTOP_DIR="$ROOT/apps/desktop"

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[orphix]${NC} $*"; }
ok()    { echo -e "${GREEN}[  ok  ]${NC} $*"; }
fail()  { echo -e "${RED}[ fail ]${NC} $*"; }

if [ ! -d "$DESKTOP_DIR" ]; then
    fail "apps/desktop not found"
    exit 1
fi

# Install deps if needed
if [ ! -d "$ROOT/node_modules" ]; then
    info "Installing dependencies…"
    cd "$ROOT" && pnpm install
fi

# Build shared packages
info "Building shared packages…"
cd "$ROOT" && pnpm turbo build --filter="@orphix/types" --filter="@orphix/config" --filter="@orphix/themes" --filter="@orphix/ui" 2>/dev/null || true

info "Starting desktop app (Electron)…"
cd "$DESKTOP_DIR" && npx electron-vite dev "$@"
