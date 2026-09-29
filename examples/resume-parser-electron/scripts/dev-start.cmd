@echo off
call "%~dp0env.cmd"
cd /d "%~dp0.."
set RESUME_PARSER_DEBUG_FILES=%CD%\samples\resume-1-sofia-alvarez.pdf;%CD%\samples\resume-2-daniel-okafor.docx;%CD%\samples\resume-3-priya-raman.txt;%CD%\samples\scanned-example.pdf
set RESUME_PARSER_DATA_DIR=%TEMP%\resume-parser-electron-dev-data
npm start -- -- --remote-debugging-port=9333
