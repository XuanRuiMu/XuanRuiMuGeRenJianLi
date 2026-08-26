@echo off
title YuXiangKun Resume Site

echo Starting resume site on http://localhost:4321 ...
echo (This opens a new window running "npm run dev". Do not close it.)
echo.

pushd "%~dp0"
start "AstroSite-4321" cmd /k "npm run dev"
popd

timeout /t 6 /nobreak >nul

echo Opening browser ...
start "" http://localhost:4321/

echo.
echo ============ Service URLs ============
echo Resume home:  http://localhost:4321/
echo Game world:   http://localhost:4321/game
echo AI assistant: http://localhost:4321/agent
echo ---------------------------------------
echo Close the "AstroSite-4321" window to stop the server.
echo.
pause
