# 一键启动：构建前端 + 单端口后端（8787）
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

if (-not (Test-Path "node_modules")) { npm.cmd install }
if (-not (Test-Path "web\node_modules")) {
    Set-Location web; npm.cmd install; Set-Location $root
}

npm.cmd run build:web
$env:PORT = "8787"
Write-Host ""
Write-Host "正在启动磁力搜 → http://127.0.0.1:8787"
Write-Host "数据源检测 → http://127.0.0.1:8787/api/diag"
Write-Host ""

Start-Process "http://127.0.0.1:8787"
node server/index.mjs
