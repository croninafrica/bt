@echo off
cd /d "%~dp0"
if not exist node_modules npm install
if not exist web\node_modules (cd web && npm install && cd ..)
call npm run build:web
set PORT=8787
start http://127.0.0.1:8787
node server\index.mjs
