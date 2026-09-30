@echo off
rem Runs a command with the project's own tools first on PATH and all caches inside .tools\.
rem Usage (from the project folder):  .workbench\scripts\run.cmd npm.cmd ci
rem                                   .workbench\scripts\run.cmd bun .workbench\scripts\save.ts "..."
setlocal
for %%i in ("%~dp0..\..") do set "ROOT=%%~fi"
if /i "%~1"=="bun" if not exist "%ROOT%\.tools\bun\bun.exe" (
  echo NEEDS_BOOTSTRAP: Bun isn't in this project yet. Run .workbench\scripts\bootstrap.ps1 first ^(with approval: it downloads^).
  exit /b 9
)
set "PATH=%ROOT%\.tools\bun;%ROOT%\.tools\node;%ROOT%\.tools\git\cmd;%PATH%"
rem Bun: no crash reports sent anywhere, caches in .tools.
set "DO_NOT_TRACK=1"
set "BUN_INSTALL_CACHE_DIR=%ROOT%\.tools\bun-cache"
set "npm_config_cache=%ROOT%\.tools\npm-cache"
set "npm_config_userconfig=%ROOT%\.tools\npmrc"
set "npm_config_update_notifier=false"
set "npm_config_fund=false"
rem Packages never run their own install scripts (they'd run with the user's permissions).
rem `npm test` / `npm run package` still run the project's own named scripts.
set "npm_config_ignore_scripts=true"
set "electron_config_cache=%ROOT%\.tools\electron-cache"
%*
