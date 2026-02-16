<#
.SYNOPSIS
  Копирует файлы deploy/ на NAS по SSH (scp).
  Выполнять перед первым деплоем или при изменении .env / docker-compose.
#>
param(
  [string]$SshHost = "",
  [int]$SshPort = 0,
  [string]$SshKeyPath = "",
  [string]$SshUser = "",
  [string]$RemotePath = "",
  [switch]$SkipEnv
)

. "$PSScriptRoot/common.ps1"

Enter-RepoRoot
Import-DeployEnvFile
Write-Step "Sync deploy files to NAS"

Assert-Command -Name "scp" -InstallHint "Установите OpenSSH client (scp входит в комплект)."

if ([string]::IsNullOrWhiteSpace($SshHost)) {
  $SshHost = [Environment]::GetEnvironmentVariable("DEPLOY_SSH_HOST")
}
if ($SshPort -eq 0) {
  $portEnv = [Environment]::GetEnvironmentVariable("DEPLOY_SSH_PORT")
  $SshPort = if ([string]::IsNullOrWhiteSpace($portEnv)) { 22 } else { [int]::Parse($portEnv) }
}
if ([string]::IsNullOrWhiteSpace($SshKeyPath)) {
  $SshKeyPath = [Environment]::GetEnvironmentVariable("DEPLOY_SSH_KEY_PATH")
}
if ([string]::IsNullOrWhiteSpace($SshUser)) {
  $SshUser = [Environment]::GetEnvironmentVariable("DEPLOY_SSH_USER")
}
if ([string]::IsNullOrWhiteSpace($RemotePath)) {
  $RemotePath = [Environment]::GetEnvironmentVariable("DEPLOY_REMOTE_PATH")
}

if ([string]::IsNullOrWhiteSpace($SshHost)) {
  throw "Не задан SSH host. Передайте -SshHost или DEPLOY_SSH_HOST."
}
if ([string]::IsNullOrWhiteSpace($RemotePath)) {
  throw "Не задан RemotePath. Передайте -RemotePath или DEPLOY_REMOTE_PATH."
}
if (-not [string]::IsNullOrWhiteSpace($SshKeyPath) -and -not (Test-Path $SshKeyPath)) {
  throw "SSH key не найден: $SshKeyPath"
}

$scpDest = if ([string]::IsNullOrWhiteSpace($SshUser)) { "$SshHost`:$RemotePath" } else { "$SshUser@${SshHost}:$RemotePath" }
$sshTarget = if ([string]::IsNullOrWhiteSpace($SshUser)) { $SshHost } else { "$SshUser@$SshHost" }
$scpPortArgs = if ($SshPort -ne 22) { @("-P", $SshPort) } else { @() }
$sshPortArgs = if ($SshPort -ne 22) { @("-p", $SshPort) } else { @() }
if (-not [string]::IsNullOrWhiteSpace($SshKeyPath)) {
  $scpPortArgs += @("-i", $SshKeyPath, "-o", "IdentitiesOnly=yes")
  $sshPortArgs += @("-i", $SshKeyPath, "-o", "IdentitiesOnly=yes")
}

$deployDir = Join-Path (Get-RepoRoot) "deploy"
if (-not (Test-Path $deployDir)) {
  throw "Папка deploy/ не найдена: $deployDir"
}

Write-Host "Sync target: $scpDest" -ForegroundColor Cyan
if ($SshPort -ne 22) {
  Write-Host "SSH port: $SshPort"
}
if (-not [string]::IsNullOrWhiteSpace($SshKeyPath)) {
  Write-Host "SSH key: $SshKeyPath"
}

# Создать RemotePath на NAS, если не существует
$ensureDirScript = "mkdir -p '$RemotePath'"
Write-Host ">> ssh ... mkdir -p $RemotePath"
$allSshArgs = $sshPortArgs + @($sshTarget, $ensureDirScript)
& ssh @allSshArgs
if ($LASTEXITCODE -ne 0) {
  throw "Не удалось создать каталог на NAS. Проверьте SSH доступ."
}

# Копировать docker-compose
$composeFile = Join-Path $deployDir "docker-compose.selfhost.yml"
if (-not (Test-Path $composeFile)) {
  throw "Файл не найден: $composeFile"
}
Write-Host ">> scp docker-compose.selfhost.yml"
$scpArgs = $scpPortArgs + @($composeFile, "$scpDest/")
& scp @scpArgs
if ($LASTEXITCODE -ne 0) {
  throw "scp docker-compose не выполнен."
}

# Копировать .env (если не SkipEnv)
if (-not $SkipEnv) {
  $envFile = Join-Path $deployDir ".env"
  if (Test-Path $envFile) {
    Write-Host ">> scp .env"
    $scpArgs = $scpPortArgs + @($envFile, "$scpDest/")
    & scp @scpArgs
    if ($LASTEXITCODE -ne 0) {
      throw "scp .env не выполнен."
    }
  }
  else {
    Write-Hint "Файл deploy/.env не найден. Создайте его из .env.example и заполните."
  }
}
else {
  Write-Hint "SkipEnv=true: .env не копируется."
}

Write-Host ""
Write-Host "sync-deploy.ps1 completed successfully." -ForegroundColor Green
