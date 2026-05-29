@echo off
setlocal
REM ─────────────────────────────────────────────────────────
REM  Orphix Desktop Dev Launcher (Electron)
REM ─────────────────────────────────────────────────────────

set "ROOT=%~dp0.."
set "DESKTOP_DIR=%ROOT%\apps\desktop"

if not exist "%DESKTOP_DIR%" (
    echo [ fail ] apps\desktop not found
    exit /b 1
)

REM Install deps if needed
if not exist "%ROOT%\node_modules" (
    echo [orphix] Installing dependencies…
    cd /d "%ROOT%" && call pnpm install
)

REM Build shared packages
echo [orphix] Building shared packages…
cd /d "%ROOT%" && call pnpm turbo build --filter="@orphix/types" --filter="@orphix/config" --filter="@orphix/themes" --filter="@orphix/ui" 2>nul

echo [orphix] Starting desktop app (Electron)…
cd /d "%DESKTOP_DIR%" && call npx electron-vite dev %*
