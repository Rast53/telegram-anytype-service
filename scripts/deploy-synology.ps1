param(
  [string]$SshHost = "",
  [int]$SshPort = 0,
  [string]$SshKeyPath = "",
  [string]$SshUser = "",
  [string]$RemotePath = "",
  [string]$ComposeFile = "docker-compose.selfhost.yml",
  [string]$ServiceName = "app",
  [int]$TailLines = 120,
  [switch]$SkipMigrations,
  [switch]$SkipPull,
  [switch]$SkipLogs
)

. "$PSScriptRoot/common.ps1"

Enter-RepoRoot
Import-DeployEnvFile
Write-Step "Deploy to Synology NAS"

Assert-Command -Name "ssh" -InstallHint "Установите OpenSSH client и проверьте, что ssh доступен в PATH."

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

$target = if ([string]::IsNullOrWhiteSpace($SshUser)) { $SshHost } else { "$SshUser@$SshHost" }
$sshArgs = @($target)
if ($SshPort -ne 22) {
  $sshArgs = @("-p", $SshPort) + $sshArgs
  Write-Host "Deploy target: $target (port $SshPort)"
} else {
  Write-Host "Deploy target: $target"
}
Write-Host "Remote path: $RemotePath"
if (-not [string]::IsNullOrWhiteSpace($SshKeyPath)) {
  Write-Host "SSH key: $SshKeyPath"
}

$remoteCommands = @(
  "set -e",
  "export PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:`$PATH",
  "cd '$RemotePath'"
)

if (-not $SkipPull) {
  $remoteCommands += "docker compose -f '$ComposeFile' pull"
}

$remoteCommands += "docker compose -f '$ComposeFile' up -d postgres redis"

if (-not $SkipMigrations) {
  $remoteCommands += "until docker compose -f '$ComposeFile' exec -T postgres pg_isready -U telegram_anytype -d telegram_anytype >/dev/null 2>&1; do echo 'Waiting for postgres...'; sleep 2; done"
  $migrationScript = "if [ -d prisma/migrations ] && ls -A prisma/migrations 2>/dev/null | grep -q .; then npx -y prisma migrate deploy; else npx -y prisma db push; fi"
  $remoteCommands += "docker compose -f '$ComposeFile' run --rm --no-deps app sh -lc '$migrationScript'"
}

$remoteCommands += "docker compose -f '$ComposeFile' up -d --remove-orphans"
$remoteCommands += "docker compose -f '$ComposeFile' ps"

if (-not $SkipLogs) {
  $remoteCommands += "docker compose -f '$ComposeFile' logs --tail $TailLines '$ServiceName'"
}

$remoteScript = $remoteCommands -join " && "

$sshCmdArgs = @()
if ($SshPort -ne 22) {
  $sshCmdArgs += @("-p", $SshPort)
}
if (-not [string]::IsNullOrWhiteSpace($SshKeyPath)) {
  $sshCmdArgs += @("-i", $SshKeyPath, "-o", "IdentitiesOnly=yes")
}
$sshCmdArgs += @($target, $remoteScript)
Invoke-External -Command "ssh" -Arguments $sshCmdArgs -FailureHint "Проверьте SSH ключи (-p $SshPort), путь к compose и доступность docker compose на NAS."

Write-Host ""
Write-Host "deploy-synology.ps1 completed successfully." -ForegroundColor Green
