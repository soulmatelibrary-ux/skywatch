@echo off
chcp 65001 > nul 2>&1
title SkyWatch

for %%I in ("%~dp0..\.venv") do set "ROOT_VENV=%%~fI"
REM Fallback for a standalone clone: use skywatch\.venv when the parent .venv is missing
if not exist "%ROOT_VENV%\Scripts\python.exe" if exist "%~dp0.venv\Scripts\python.exe" set "ROOT_VENV=%~dp0.venv"

echo.
echo  ========================================
echo   SkyWatch Service Start
echo  ========================================
echo.

echo  [Setup] Cleanup existing processes...

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /F /PID %%a > nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173 " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /F /PID %%a > nul 2>&1
)

taskkill /F /FI "WINDOWTITLE eq SkyWatch-Backend*" > nul 2>&1
taskkill /F /FI "WINDOWTITLE eq SkyWatch-Frontend*" > nul 2>&1

timeout /t 2 /nobreak > nul
echo   OK
echo.

REM ========== Backend Setup ==========
echo  [Backend] Checking environment...

if not exist "%ROOT_VENV%" (
    echo  [ERROR] .venv not found - looked in %ROOT_VENV% and %~dp0.venv
    echo  [INFO] Create one:  py -3.13 -m venv .venv  then  .venv\Scripts\pip install -r backend\requirements.txt
    pause
    exit /b 1
)

if not exist "%~dp0backend\.env" (
    echo    - Creating .env from .env.example...
    copy "%~dp0backend\.env.example" "%~dp0backend\.env" > nul
)

REM ========== Deploy patches (offline wheels / db_patch SQL) ==========
REM Runs ..\wheels\*.whl and db_patch\*.sql only if present; applied SQL is renamed to *.sql.applied
echo  [Patch] Checking deploy patches (wheels, db_patch)...
pushd "%~dp0backend"
"%ROOT_VENV%\Scripts\python.exe" scripts\apply_deploy_patches.py
if errorlevel 1 (
    echo.
    echo  [WARN] Deploy patch failed. Check the messages above.
    echo         Press any key to start the service anyway, or close this window to stop.
    pause > nul
)
popd
echo.

echo  [1/2] Starting backend...  (port 8000)
start "SkyWatch-Backend" /D "%~dp0backend" cmd /k "%ROOT_VENV%\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000"
timeout /t 3 /nobreak > nul

echo  [2/2] Starting frontend dev server...  (port 5173)
start "SkyWatch-Frontend" /D "%~dp0frontend" cmd /k "npm run dev -- --host"
timeout /t 2 /nobreak > nul

echo  [3/3] Opening UI on port 5173...
start "" "http://localhost:5173"

echo.
echo  ========================================
echo   Service URLs
echo     - Frontend/UI : http://localhost:5173
echo     - API/Swagger : http://localhost:8000/docs
echo     - Backend     : http://localhost:8000
echo.
echo     - Other PCs: Use server IPv4 address
echo       Example UI   : http://192.168.0.100:5173
echo       Example API  : http://192.168.0.100:8000/docs
echo  ========================================
echo.
echo   Run stop.bat to stop services
echo.
