@echo off
chcp 65001 >nul
title La Central - menu y caja (deja esta ventana abierta)
cd /d "%~dp0"
set "NODE=node"
if exist "%ProgramFiles%\nodejs\node.exe" set "NODE=%ProgramFiles%\nodejs\node.exe"
"%NODE%" -e "process.exit(+process.versions.node.split(\".\")[0]>=22?0:1)"
if errorlevel 1 (
  echo.
  echo  Se necesita Node 22 o mas nuevo. Descargalo en https://nodejs.org
  pause
  exit /b 1
)
start "" cmd /c "timeout /t 2 >nul & start http://localhost:3000/ & start http://localhost:3000/caja/"
"%NODE%" app\server.mjs
echo.
echo  El servidor se detuvo. Revisa el mensaje de arriba.
pause
