@echo off
rem Runs a command with the project's own tools first on PATH and all caches inside .tools\.
rem Usage (from the project folder):  .workbench\scripts\run.cmd npm.cmd ci
setlocal
for %%i in ("%~dp0..\..") do set "ROOT=%%~fi"
set "PATH=%ROOT%\.tools\node;%ROOT%\.tools\git\cmd;%PATH%"
set "npm_config_cache=%ROOT%\.tools\npm-cache"
set "npm_config_userconfig=%ROOT%\.tools\npmrc"
set "npm_config_update_notifier=false"
set "npm_config_fund=false"
set "electron_config_cache=%ROOT%\.tools\electron-cache"
%*
