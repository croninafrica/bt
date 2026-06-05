# 推送到 GitHub（先在本机创建空仓库）
# 用法: .\push-github.ps1 -Repo "你的用户名/magnet-search"
param(
    [Parameter(Mandatory = $true)]
    [string]$Repo
)

$remote = "https://github.com/$Repo.git"
Set-Location $PSScriptRoot

if (-not (git rev-parse HEAD 2>$null)) {
    Write-Host "请先运行 git commit" -ForegroundColor Red
    exit 1
}

$exists = git remote get-url origin 2>$null
if ($LASTEXITCODE -ne 0) {
    git remote add origin $remote
} else {
    git remote set-url origin $remote
}

Write-Host "推送到 $remote ..."
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "完成! 下一步:" -ForegroundColor Green
    Write-Host "  1. 打开 https://render.com"
    Write-Host "  2. New + -> Blueprint -> 选择仓库 $Repo"
    Write-Host "  3. 部署完成后访问 Render 提供的 URL"
}
