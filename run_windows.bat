@echo off
TITLE Industrial Nexus Dashboard Launcher
SETLOCAL EnableDelayedExpansion

echo ============================================================
echo      INDUSTRIAL NEXUS - WINDOWS DASHBOARD LAUNCHER
echo ============================================================
echo.

:: 1. Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed on this system.
    echo.
    echo Please download and install Node.js (LTS version recommended) from:
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo [SUCCESS] Node.js is installed.

:: 2. Check if pnpm is installed, install if missing
where pnpm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [INFO] pnpm package manager not found. Installing globally...
    call npm install -g pnpm
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] Failed to install pnpm globally. Check your network connection.
        pause
        exit /b 1
    )
)
echo [SUCCESS] pnpm package manager is active.

:: 3. Install project dependencies if node_modules is missing
if not exist node_modules (
    echo [INFO] Installing project dependencies (this may take a minute)...
    call pnpm install
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
) else (
    echo [SUCCESS] Dependencies already installed.
)

:: 4. Build the production React bundle if dist directory is missing
if not exist dist (
    echo [INFO] Compiled frontend assets not found. Compiling dashboard...
    call pnpm build
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] Failed to compile React assets.
        pause
        exit /b 1
    )
) else (
    echo [INFO] Production bundle is ready. If you want to force recompile, delete the 'dist' folder and run this script again.
)

:: 5. Open browser automatically to the dashboard after a short delay
echo.
echo [INFO] Starting Industrial Nexus Local Express Server...
echo [INFO] Access the dashboard at: http://localhost:3001
echo.
start "" "http://localhost:3001"

:: 6. Launch server
call pnpm server
pause
