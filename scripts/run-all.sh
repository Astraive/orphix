#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
#  Orphix Full Dev Launcher
#  Starts: DBs → APIs → Web → Desktop → Mobile
# ─────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_COMPOSE="$ROOT/databases/docker-compose.yml"
LOG_DIR="$ROOT/scripts/logs"
mkdir -p "$LOG_DIR"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[orphix]${NC} $*"; }
ok()    { echo -e "${GREEN}[  ok  ]${NC} $*"; }
warn()  { echo -e "${YELLOW}[ warn ]${NC} $*"; }
fail()  { echo -e "${RED}[ fail ]${NC} $*"; }

PIDS=()
cleanup() {
    info "Shutting down…"
    for pid in "${PIDS[@]}"; do
        kill "$pid" 2>/dev/null || true
    done
    wait 2>/dev/null || true
    ok "All processes stopped."
}
trap cleanup EXIT INT TERM

# ── 1. Docker databases ──────────────────────────────────
info "Starting all databases via Docker…"
docker compose -f "$DB_COMPOSE" up -d --wait 2>/dev/null || \
docker-compose -f "$DB_COMPOSE" up -d --wait 2>/dev/null || {
    fail "Could not start Docker containers. Is Docker running?"
    exit 1
}
ok "Postgres (5432) + Postgres-Private (5433) + Redis (6379) ready"

# ── 2. Install deps ──────────────────────────────────────
if [ ! -d "$ROOT/node_modules" ]; then
    info "Installing dependencies…"
    cd "$ROOT" && bun install
fi

# ── 3. Build shared packages ─────────────────────────────
info "Building shared packages…"
cd "$ROOT" && bunx turbo build --filter="@orphix/types" --filter="@orphix/config" --filter="@orphix/themes" --filter="@orphix/ui" 2>/dev/null || true
ok "Shared packages built"

# ── helper ────────────────────────────────────────────────
start_service() {
    local name="$1" dir="$2" cmd="$3" logfile="$4"
    if [ ! -d "$dir" ]; then
        warn "Skipping $name — directory not found"
        return
    fi
    info "Starting $name…"
    (cd "$dir" && eval "$cmd") > "$logfile" 2>&1 &
    PIDS+=($!)
    ok "$name started (pid ${PIDS[-1]}) → $logfile"
}

# ── 4. APIs ──────────────────────────────────────────────
start_service "control-api" "$ROOT/apis/control" \
    "bun run start:dev" \
    "$LOG_DIR/control.log"

start_service "link-api" "$ROOT/apis/link" \
    "bun run dev" \
    "$LOG_DIR/link.log"

if [ -f "$ROOT/apis/marketplace/package.json" ]; then
    start_service "marketplace-api" "$ROOT/apis/marketplace" \
        "bun run start:dev" \
        "$LOG_DIR/marketplace.log"
else
    warn "Skipping marketplace-api — no package.json yet"
fi

# ── 5. Web App ───────────────────────────────────────────
start_service "web-app" "$ROOT/apps/web" \
    "bun run dev" \
    "$LOG_DIR/web.log"

# ── 6. Desktop App ───────────────────────────────────────
start_service "desktop-app" "$ROOT/apps/desktop" \
    "bun run dev" \
    "$LOG_DIR/desktop.log"

# ── 7. Mobile App ────────────────────────────────────────
start_service "mobile-app" "$ROOT/apps/mobile" \
    "bun run start" \
    "$LOG_DIR/mobile.log"

# ── 8. Summary ───────────────────────────────────────────
echo ""
ok "════════════════════════════════════════════════════"
ok "  Control API      → http://localhost:2605"
ok "  Link API         → http://localhost:2606"
ok "  Marketplace API  → http://localhost:2607"
ok "  Web App          → http://localhost:3000"
ok "  Desktop App      → Electron window"
ok "  Mobile App       → Expo http://localhost:8081"
ok "  Postgres         → localhost:5432"
ok "  Postgres-Private → localhost:5433"
ok "  Redis            → localhost:6379"
ok ""
ok "  Logs → $LOG_DIR/"
ok "  Ctrl+C to stop everything"
ok "════════════════════════════════════════════════════"
echo ""

wait -n "${PIDS[@]}" 2>/dev/null || true
warn "A process exited unexpectedly. Check logs."
