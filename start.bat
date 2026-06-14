@echo off
title DBD Overlay Server
cd /d "%~dp0"
echo ============================================
echo  DBD Overlay Server
echo ============================================
echo.

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm not found. Please install Node.js or fix your PATH.
  echo.
  pause
  exit /b 1
)

echo Starting dev server...
echo Open http://localhost:5173/ in your browser.
echo Press Ctrl+C to stop, or close this window.
echo ============================================
echo.

call npm.cmd run dev

echo.
echo ============================================
echo Server stopped. Press any key to close.
echo ============================================
pause
