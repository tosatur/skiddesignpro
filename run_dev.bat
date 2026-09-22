@echo off
setlocal
set "SPN_ENABLE_TEST_TOOLS=true"
call "%~dp0run_web.cmd"
exit /b %errorlevel%
