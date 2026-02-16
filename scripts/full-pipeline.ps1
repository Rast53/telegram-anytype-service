param(
  [string]$Image = "rast53/telegram-anytype-service",
  [string]$Tag = "",
  [switch]$SkipCheck,
  [switch]$SkipPush,
  [switch]$SkipDeploy,
  [switch]$SkipSmoke,
  [switch]$SkipTests,
  [switch]$SkipMigrations,
  [switch]$SyncBeforeDeploy,
  [string]$SshHost = "",
  [int]$SshPort = 0,
  [string]$SshKeyPath = "",
  [string]$SshUser = "",
  [string]$RemotePath = "",
  [string]$ComposeFile = "docker-compose.selfhost.yml",
  [string]$ServiceName = "app",
  [string]$BaseUrl = ""
)

. "$PSScriptRoot/common.ps1"

Enter-RepoRoot
Import-DeployEnvFile
Write-Step "Full pipeline"

if ([string]::IsNullOrWhiteSpace($Tag)) {
  # По умолчанию используем dev, т.к. compose файл на NAS тянет image:...:dev
  $Tag = "dev"
}
if ($SshPort -eq 0) {
  $portEnv = [Environment]::GetEnvironmentVariable("DEPLOY_SSH_PORT")
  if (-not [string]::IsNullOrWhiteSpace($portEnv)) { $SshPort = [int]::Parse($portEnv) }
}
if ([string]::IsNullOrWhiteSpace($SshKeyPath)) {
  $SshKeyPath = [Environment]::GetEnvironmentVariable("DEPLOY_SSH_KEY_PATH")
}
if ([string]::IsNullOrWhiteSpace($SshHost)) {
  $SshHost = [Environment]::GetEnvironmentVariable("DEPLOY_SSH_HOST")
}
if ([string]::IsNullOrWhiteSpace($SshUser)) {
  $SshUser = [Environment]::GetEnvironmentVariable("DEPLOY_SSH_USER")
}
if ([string]::IsNullOrWhiteSpace($RemotePath)) {
  $RemotePath = [Environment]::GetEnvironmentVariable("DEPLOY_REMOTE_PATH")
}

Write-Host "Pipeline tag: $Tag"

if (-not $SkipCheck) {
  Write-Step "Step 1/4: check"
  $checkArgs = @{}
  if ($SkipTests) {
    $checkArgs["SkipTest"] = $true
  }
  & "$PSScriptRoot/check.ps1" @checkArgs
}
else {
  Write-Hint "Step check пропущен (SkipCheck=true)."
}

Write-Step "Step 2/4: docker build/push"
$buildArgs = @{
  Image = $Image
  Tag = $Tag
}
if ($SkipPush) {
  $buildArgs["NoPush"] = $true
}
& "$PSScriptRoot/docker-build-push.ps1" @buildArgs

if (-not $SkipDeploy) {
  if ($SyncBeforeDeploy) {
    Write-Step "Step 3a/4: sync deploy files"
    $syncArgs = @{
      SshHost = $SshHost
      SshUser = $SshUser
      RemotePath = $RemotePath
    }
    if ($SshPort -ne 0) { $syncArgs["SshPort"] = $SshPort }
    if (-not [string]::IsNullOrWhiteSpace($SshKeyPath)) { $syncArgs["SshKeyPath"] = $SshKeyPath }
    & "$PSScriptRoot/sync-deploy.ps1" @syncArgs
  }
  Write-Step "Step 3/4: deploy"
  $deployArgs = @{
    SshHost = $SshHost
    SshUser = $SshUser
    RemotePath = $RemotePath
    ComposeFile = $ComposeFile
    ServiceName = $ServiceName
  }
  if ($SshPort -ne 0) { $deployArgs["SshPort"] = $SshPort }
  if (-not [string]::IsNullOrWhiteSpace($SshKeyPath)) { $deployArgs["SshKeyPath"] = $SshKeyPath }
  if ($SkipMigrations) { $deployArgs["SkipMigrations"] = $true }
  & "$PSScriptRoot/deploy-synology.ps1" @deployArgs
}
else {
  Write-Hint "Step deploy пропущен (SkipDeploy=true)."
}

if (-not $SkipSmoke) {
  Write-Step "Step 4/4: smoke"
  $smokeArgs = @{}
  if (-not [string]::IsNullOrWhiteSpace($BaseUrl)) {
    $smokeArgs["BaseUrl"] = $BaseUrl
  }
  & "$PSScriptRoot/smoke.ps1" @smokeArgs
}
else {
  Write-Hint "Step smoke пропущен (SkipSmoke=true)."
}

Write-Host ""
Write-Host "full-pipeline.ps1 completed successfully." -ForegroundColor Green
