@echo off
rem Per-process environment for the build scripts. Nothing machine-wide is changed.
rem The `npm` on PATH is a proto shim that fails here; use Node's own npm instead.
set PATH=C:\Users\AmirHossein\AppData\Local\pi-node\current;%PATH%
set DO_NOT_TRACK=1
set npm_config_update_notifier=false
set npm_config_audit=false
set npm_config_fund=false
