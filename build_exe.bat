@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto missing_node
where npm.cmd >nul 2>nul
if errorlevel 1 goto missing_node
node -e "if (Number(process.versions.node.split('.')[0]) < 24) process.exit(1)"
if errorlevel 1 goto missing_node

echo Installing the locked dependencies...
call npm.cmd ci
if errorlevel 1 goto failed

echo Building SPN Skid Designer...
call npm.cmd run build:exe
if errorlevel 1 goto failed

echo.
echo The EXE is ready.
echo EXE folder: "%~dp0release"
echo Use the Dev Mode switch on the home page to enable developer tools.
if /i not "%~1"=="--no-pause" pause
exit /b 0

:missing_node
echo Install Node.js 24 or later with npm, then run this file again.
if /i not "%~1"=="--no-pause" pause
exit /b 1

:failed
echo The EXE build failed. See the error above.
if /i not "%~1"=="--no-pause" pause
exit /b 1
