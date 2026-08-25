#Requires -Version 5.1
<#
.SYNOPSIS
  Коммит (если есть изменения), пуш в GitHub. По желанию сразу выкладка на сервер по SSH.

.EXAMPLE
  .\scripts\push.ps1 -Message "правки баланса"
  .\scripts\push.ps1 -Message "hotfix" -DeployServer
#>
param(
  [string]$Message = "update",
  [switch]$DeployServer,
  [switch]$NoCommit
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

$configLocal = Join-Path $PWD "deploy\config.local.ps1"
$configExample = Join-Path $PWD "deploy\config.example.ps1"
if (Test-Path $configLocal) {
  . $configLocal
} elseif (Test-Path $configExample) {
  Write-Host "Нет deploy/config.local.ps1 — копирую из примера. Заполните GitHubRepo и SshHost." -ForegroundColor Yellow
  Copy-Item $configExample $configLocal
  . $configLocal
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "Git не установлен"
}

if (-not (Test-Path .git)) {
  git init -b main
}

$branch = (git rev-parse --abbrev-ref HEAD).Trim()
if ($branch -eq "HEAD") { $branch = $GitHubBranch }

$remote = git remote get-url origin 2>$null
if (-not $remote) {
  if (-not $GitHubRepo -or $GitHubRepo -match "YOUR_SERVER|USER/kelech") {
    throw "Добавьте remote: git remote add origin URL  или заполните GitHubRepo в deploy/config.local.ps1"
  }
  git remote add origin $GitHubRepo
}

if (-not $NoCommit) {
  git add -A
  $pending = git status --porcelain
  if ($pending) {
    git commit -m $Message
  } else {
    Write-Host "Нет изменений для коммита"
  }
}

git push -u origin $branch
Write-Host "GitHub: ветка $branch отправлена"

if ($DeployServer) {
  if (-not $SshHost -or $SshHost -like "*YOUR_SERVER_IP*") {
    throw "Заполните SshHost в deploy/config.local.ps1"
  }
  $cmd = "cd $RemoteDir && bash scripts/server-deploy.sh"
  ssh -p $SshPort $SshHost $cmd
  Write-Host "Сервер: деплой завершён"
} else {
  Write-Host "На сервер уйдёт GitHub Actions (push в main) либо повторите с -DeployServer"
}
