@echo off
chcp 65001 > nul
title SkyWatch - Stop

echo.
echo  ========================================
echo   SkyWatch Dev Server Stop
echo  ========================================
echo.

:: Stop port 8000 (backend uvicorn)
echo  [1/2] Stopping backend... (port 8000)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a > nul 2>&1
)
:: uvicorn --reload may leave parent/child processes
taskkill /F /FI "WINDOWTITLE eq SkyWatch-Backend*" > nul 2>&1
echo     done

:: Stop port 5173 (frontend vite)
echo  [2/2] Stopping frontend... (port 5173)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a > nul 2>&1
)
taskkill /F /FI "WINDOWTITLE eq SkyWatch-Frontend*" > nul 2>&1
echo     done

echo.
echo  ========================================
echo   SkyWatch Services Stopped
echo  ========================================
echo.
pause
