@echo off
setlocal
set "SPN_ENABLE_TEST_TOOLS=true"
call "%~dp0start-web.cmd"
exit /b %errorlevel%
