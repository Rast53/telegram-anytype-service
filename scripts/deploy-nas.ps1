<#
.SYNOPSIS
  Деплой на NAS (Synology) с предустановленными параметрами.
  NAS: 192.168.10.55, SSH порт 7022.
  Передайте -SshUser и -RemotePath или задайте DEPLOY_SSH_USER, DEPLOY_REMOTE_PATH.
.EXAMPLE
  .\deploy-nas.ps1 -SshUser admin -RemotePath /volume1/docker/telegram-anytype-service
  .\deploy-nas.ps1 -SyncFirst -SshUser admin -RemotePath /volume1/docker/telegram-anytype-service
#>
param(
  [string]$SshHost = "192.168.10.55",
  [int]$SshPort = 7022,
  [string]$SshKeyPath = "",
  [string]$SshUser = "",
  [string]$RemotePath = "",
  [switch]$SyncFirst,
  [switch]$SkipSync,
  [switch]$SkipMigrations,
  [switch]$SkipPull,
  [switch]$SkipLogs,
  [string]$ComposeFile = "docker-compose.selfhost.yml",
  [string]$ServiceName = "app"
)

. "$PSScriptRoot/common.ps1"

Enter-RepoRoot
Import-DeployEnvFile
Write-Step "Deploy to NAS (192.168.10.55:7022)"

# Переопределение из ENV
if ([string]::IsNullOrWhiteSpace($SshUser)) {
  $SshUser = [Environment]::GetEnvironmentVariable("DEPLOY_SSH_USER")
}
if ([string]::IsNullOrWhiteSpace($SshKeyPath)) {
  $SshKeyPath = [Environment]::GetEnvironmentVariable("DEPLOY_SSH_KEY_PATH")
}
if ([string]::IsNullOrWhiteSpace($RemotePath)) {
  $RemotePath = [Environment]::GetEnvironmentVariable("DEPLOY_REMOTE_PATH")
}
if ([string]::IsNullOrWhiteSpace($RemotePath)) {
  $RemotePath = "/volume1/docker/telegram-anytype-service"
  Write-Hint "RemotePath не задан, используется по умолчанию: $RemotePath"
}
if ([string]::IsNullOrWhiteSpace($SshUser)) {
  throw "Задайте -SshUser или DEPLOY_SSH_USER (например admin)."
}

# Синхронизация deploy-файлов
if ($SyncFirst -or (-not $SkipSync)) {
  Write-Step "Sync deploy files"
  $syncArgs = @{
    SshHost = $SshHost
    SshPort = $SshPort
    SshUser = $SshUser
    RemotePath = $RemotePath
  }
  if (-not [string]::IsNullOrWhiteSpace($SshKeyPath)) {
    $syncArgs["SshKeyPath"] = $SshKeyPath
  }
  & "$PSScriptRoot/sync-deploy.ps1" @syncArgs
}

# Деплой compose
Write-Step "Deploy docker compose"
$deployArgs = @{
  SshHost = $SshHost
  SshPort = $SshPort
  SshUser = $SshUser
  RemotePath = $RemotePath
  ComposeFile = $ComposeFile
  ServiceName = $ServiceName
}
if (-not [string]::IsNullOrWhiteSpace($SshKeyPath)) {
  $deployArgs["SshKeyPath"] = $SshKeyPath
}
if ($SkipPull) {
  $deployArgs["SkipPull"] = $true
}
if ($SkipMigrations) {
  $deployArgs["SkipMigrations"] = $true
}
if ($SkipLogs) {
  $deployArgs["SkipLogs"] = $true
}
& "$PSScriptRoot/deploy-synology.ps1" @deployArgs

Write-Host ""
Write-Host "deploy-nas.ps1 completed successfully." -ForegroundColor Green
