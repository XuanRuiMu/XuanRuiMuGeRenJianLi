@echo off
title 小堃的简历网站 — 启动总控
chcp 65001 >nul

echo ===========================================
echo   小堃的简历网站 — 启动总控
echo   将自动启动：MySQL ^(如未运行^) + Python AI 后端 + Astro 前端
echo ===========================================
echo.
echo   访问地址：
echo   - 简历首页：  http://localhost:4321/
echo   - AI 助手：    http://localhost:4321/agent
echo   - 游戏世界：   http://localhost:4321/game
echo.
echo   注意：任一服务启动失败或运行中退出，全部服务会立即停止。
echo   停止方式：按 Ctrl+C 或关闭本窗口。
echo.

pushd "%~dp0"

"C:\Users\17475\.workbuddy\binaries\python\versions\3.13.12\python.exe" "启动总控.py"

popd
echo.
pause
