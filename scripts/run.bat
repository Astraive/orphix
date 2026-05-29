@echo off
setlocal EnableDelayedExpansion
REM ─────────────────────────────────────────────────────────
REM  Orphix Dev Launcher (Windows)
REM  Starts: Postgres + Redis (Docker) then 3 APIs then Web
REM ─────────────────────────────────────────────────────────

set "ROOT=%~dp0.."
set "DB_COMPOSE=%ROOT%\databases\docker-compose.yml"
set "LOG_DIR=%~dp0logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

REM ── colours via prefix ──
set "INFO=[orphix]"
set "OK=[  ok  ]"
set "WARN=[ warn ]"
set "FAIL=[ fail ]"

echo %INFO% Starting Orphix dev environment…

REM ══════════════════════════════════════════════════════════
REM  1. Docker databases
REM ══════════════════════════════════════════════════════════
echo %INFO% Starting Postgres + Redis via Docker…
docker compose -f "%DB_COMPOSE%" up -d --wait 2>nul
if errorlevel 1 (
    docker-compose -f "%DB_COMPOSE%" up -d --wait 2>nul
    if errorlevel 1 (
        echo %FAIL% Could not start Docker containers. Is Docker running?
        exit /b 1
    )
)
echo %OK% Postgres (5432) + Postgres-Private (5433) + Redis (6379) ready

REM ══════════════════════════════════════════════════════════
REM  2. Install deps if missing
REM ══════════════════════════════════════════════════════════
if not exist "%ROOT%\node_modules" (
    echo %INFO% Installing dependencies…
    cd /d "%ROOT%" && call pnpm install
)

REM ══════════════════════════════════════════════════════════
REM  3. Build shared packages
REM ══════════════════════════════════════════════════════════
echo %INFO% Building shared packages…
cd /d "%ROOT%" && call pnpm turbo build --filter="@orphix/types" --filter="@orphix/config" --filter="@orphix/themes" --filter="@orphix/ui" 2>nul
echo %OK% Shared packages built

REM ══════════════════════════════════════════════════════════
REM  4. Start APIs (each in its own window)
REM ══════════════════════════════════════════════════════════

REM Control API (NestJS - :2605)
if exist "%ROOT%\apis\control" (
    echo %INFO% Starting control-api on :2605…
    start "orphix-control" /D "%ROOT%\apis\control" cmd /c "npx nest start --watch > "%LOG_DIR%\control.log" 2>&1"
    echo %OK% control-api started
) else (
    echo %WARN% Skipping control-api — directory not found
)

REM Link API (Fastify - :2606)
if exist "%ROOT%\apis\link" (
    echo %INFO% Starting link-api on :2606…
    start "orphix-link" /D "%ROOT%\apis\link" cmd /c "npx tsx watch src/index.ts > "%LOG_DIR%\link.log" 2>&1"
    echo %OK% link-api started
) else (
    echo %WARN% Skipping link-api — directory not found
)

REM Marketplace API (NestJS - :2607)
if exist "%ROOT%\apis\marketplace\package.json" (
    echo %INFO% Starting marketplace-api on :2607…
    start "orphix-marketplace" /D "%ROOT%\apis\marketplace" cmd /c "npx nest start --watch > "%LOG_DIR%\marketplace.log" 2>&1"
    echo %OK% marketplace-api started
) else (
    echo %WARN% Skipping marketplace-api — no package.json yet
)

REM ══════════════════════════════════════════════════════════
REM  5. Start Web App (Next.js - :3000)
REM ══════════════════════════════════════════════════════════
echo %INFO% Starting web-app on :3000…
start "orphix-web" /D "%ROOT%\apps\web" cmd /c "npx next dev --port 3000 > "%LOG_DIR%\web.log" 2>&1"
echo %OK% web-app started

REM ══════════════════════════════════════════════════════════
REM  6. Summary
REM ══════════════════════════════════════════════════════════
echo.
echo %OK% ═════════════════════════════════════════════════
echo %OK%   Control API      → http://localhost:2605
echo %OK%   Link API         → http://localhost:2606
echo %OK%   Marketplace API  → http://localhost:2607
echo %OK%   Web App          → http://localhost:3000
echo %OK%   Postgres         → localhost:5432
echo %OK%   Postgres-Private → localhost:5433
echo %OK%   Redis            → localhost:6379
echo %OK%
echo %OK%   Logs → scripts\logs\
echo %OK%   Close this window or Ctrl+C to stop
echo %OK% ═════════════════════════════════════════════════
echo.

REM Keep the main window open
echo Press any key to shut down all services…
pause >nul

REM ── cleanup ──
echo %INFO% Shutting down…
taskkill /FI "WindowTitle eq orphix-control*" /T /F >nul 2>&1
taskkill /FI "WindowTitle eq orphix-link*" /T /F >nul 2>&1
taskkill /FI "WindowTitle eq orphix-marketplace*" /T /F >nul 2>&1
taskkill /FI "WindowTitle eq orphix-web*" /T /F >nul 2>&1
docker compose -f "%DB_COMPOSE%" down 2>nul
echo %OK% All services stopped.
