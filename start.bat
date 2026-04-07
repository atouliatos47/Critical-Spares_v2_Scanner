@echo off
cd /d "%~dp0"
echo ========================================
echo   Critical Spares Tracker
echo ========================================
echo.

echo Current folder: %CD%
echo.

REM Check both possible locations for node.exe
if exist "node-v24.14.0-win-x64\node.exe" (
    set NODE_PATH=node-v24.14.0-win-x64
) else if exist "node-v24.14.0-win-x64\node-v24.14.0-win-x64\node.exe" (
    set NODE_PATH=node-v24.14.0-win-x64\node-v24.14.0-win-x64
) else (
    echo ❌ Node.exe not found!
    echo.
    echo Please check your Node.js installation.
    echo.
    pause
    exit /b
)

echo ✅ Found Node.js in: %NODE_PATH%
echo.
echo Starting server...
echo.
echo Server will be available at:
echo   http://localhost:3000
echo.
echo Network access (for phones):
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address" ^| findstr /v "127.0.0.1"') do (
    echo   http://%%a:3000
)
echo.
echo ========================================
echo.

"%NODE_PATH%\node.exe" server.js

