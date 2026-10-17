@echo off
setlocal
cd /d "%~dp0"
title Jacob: Frontline Launcher

where node >nul 2>nul
if errorlevel 1 goto no_node
where npm >nul 2>nul
if errorlevel 1 goto no_node

if not exist "node_modules\vite\bin\vite.js" (
  echo Ini-install ang kailangan ng laro. Kailangan ng internet sa unang install.
  call npm install
  if errorlevel 1 goto failed
)

node scripts/wait-for-server.js --check >nul 2>&1
if errorlevel 1 (
  echo Sinisimulan ang local game server...
  start "Jacob Frontline Server" /D "%~dp0" cmd /k npm run start
)

node scripts/wait-for-server.js
if errorlevel 1 goto server_failed

start "" "http://localhost:3000/"
echo Handa na ang laro. Panatilihing bukas ang Jacob Frontline Server window habang naglalaro.
exit /b 0

:no_node
echo Kailangan ang Node.js para mabuksan ang laro. I-install ang Node.js at patakbuhin muli ang file na ito.
pause
exit /b 1

:server_failed
echo Hindi sumagot ang game server. Tingnan ang Jacob Frontline Server window para sa error.
pause
exit /b 1

:failed
echo Hindi naihanda ang laro. Tingnan ang error sa itaas at subukan muli.
pause
exit /b 1
