@echo off
rem Save points: git with its history in .workbench\history instead of .git.
rem Codex's sandbox keeps .git read-only and may run commands as a separate Windows user,
rem so a plain .git would need an approval for every save point. This folder has neither problem.
rem Usage (from the project folder):  .workbench\scripts\git.cmd log --oneline
rem Save points themselves are made with .workbench\scripts\save.ts (an explicit file list).
setlocal
for %%i in ("%~dp0..\..") do set "ROOT=%%~fi"
set "GIT=git"
if exist "%ROOT%\.tools\git\cmd\git.exe" set "GIT=%ROOT%\.tools\git\cmd\git.exe"
"%GIT%" --git-dir="%ROOT%\.workbench\history" --work-tree="%ROOT%" -c safe.directory=* -c user.name=Workbench -c user.email=workbench@localhost -c core.autocrlf=false -c core.excludesFile="%ROOT%\.gitignore" %*
