@echo off
setlocal
REM ─────────────────────────────────────────────────────────
REM  Orphix Mobile Dev Launcher (Expo)
REM ─────────────────────────────────────────────────────────

set "ROOT=%~dp0.."
set "MOBILE_DIR=%ROOT%\apps\mobile"

if not exist "%MOBILE_DIR%" (
    echo [ fail ] apps\mobile not found
    exit /b 1
)

REM Install deps if needed
if not exist "%ROOT%\node_modules" (
    echo [orphix] Installing dependencies…
    cd /d "%ROOT%" && call pnpm install
)

echo [orphix] Starting mobile app (Expo)…
echo [  ok  ] Expo DevTools → http://localhost:8081
echo [  ok  ] Scan QR code with Expo Go on your phone
echo.

cd /d "%MOBILE_DIR%" && call npx expo start %*
