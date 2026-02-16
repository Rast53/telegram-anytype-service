param(
  [string]$SshHost = "",
  [int]$SshPort = 0,
  [string]$SshUser = "",
  [string]$SshKeyPath = "",
  [switch]$ForceNew
)

. "$PSScriptRoot/common.ps1"

Enter-RepoRoot
Import-DeployEnvFile
Write-Step "Setup NAS deploy SSH key"

Assert-Command -Name "ssh" -InstallHint "Установите OpenSSH client и проверьте, что ssh доступен в PATH."
Assert-Command -Name "ssh-keygen" -InstallHint "OpenSSH client должен включать ssh-keygen."

if ([string]::IsNullOrWhiteSpace($SshHost)) {
  $SshHost = [Environment]::GetEnvironmentVariable("DEPLOY_SSH_HOST")
}
if ($SshPort -eq 0) {
  $portEnv = [Environment]::GetEnvironmentVariable("DEPLOY_SSH_PORT")
  $SshPort = if ([string]::IsNullOrWhiteSpace($portEnv)) { 22 } else { [int]::Parse($portEnv) }
}
if ([string]::IsNullOrWhiteSpace($SshUser)) {
  $SshUser = [Environment]::GetEnvironmentVariable("DEPLOY_SSH_USER")
}
if ([string]::IsNullOrWhiteSpace($SshKeyPath)) {
  $SshKeyPath = [Environment]::GetEnvironmentVariable("DEPLOY_SSH_KEY_PATH")
}
if ([string]::IsNullOrWhiteSpace($SshKeyPath)) {
  $SshKeyPath = "$env:USERPROFILE/.ssh/id_ed25519_nas_deploy"
}

if ([string]::IsNullOrWhiteSpace($SshHost)) {
  throw "Не задан SSH host. Передайте -SshHost или DEPLOY_SSH_HOST."
}
if ([string]::IsNullOrWhiteSpace($SshUser)) {
  throw "Не задан SSH user. Передайте -SshUser или DEPLOY_SSH_USER."
}

$pubKeyPath = "$SshKeyPath.pub"
if ($ForceNew -and (Test-Path $SshKeyPath)) {
  Remove-Item -Path $SshKeyPath -Force
}
if ($ForceNew -and (Test-Path $pubKeyPath)) {
  Remove-Item -Path $pubKeyPath -Force
}

if (-not (Test-Path $SshKeyPath)) {
  Write-Step "Generate deploy key without passphrase"
  Invoke-External -Command "ssh-keygen" -Arguments @("-t", "ed25519", "-f", $SshKeyPath, "-N", "") -FailureHint "Проверьте права на папку ~/.ssh."
}
else {
  Write-Hint "Ключ уже существует: $SshKeyPath"
}

if (-not (Test-Path $pubKeyPath)) {
  throw "Публичный ключ не найден: $pubKeyPath"
}

$pubKey = (Get-Content -Path $pubKeyPath -Raw).Trim()
if ([string]::IsNullOrWhiteSpace($pubKey)) {
  throw "Публичный ключ пустой: $pubKeyPath"
}

Write-Step "Install public key on NAS"
$target = "$SshUser@$SshHost"
$installScript = "mkdir -p ~/.ssh && chmod 700 ~/.ssh && touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && grep -qxF '$pubKey' ~/.ssh/authorized_keys || echo '$pubKey' >> ~/.ssh/authorized_keys"
$sshArgs = @("-p", $SshPort, $target, $installScript)
Invoke-External -Command "ssh" -Arguments $sshArgs -FailureHint "Проверьте SSH доступ к NAS. Допустим один ручной ввод пароля на этом шаге."

Write-Step "Verify passwordless key login"
$verifyArgs = @("-p", $SshPort, "-i", $SshKeyPath, "-o", "IdentitiesOnly=yes", $target, "echo OK")
Invoke-External -Command "ssh" -Arguments $verifyArgs -FailureHint "Проверьте, что ключ добавлен в ~/.ssh/authorized_keys на NAS."

Write-Host ""
Write-Host "setup-nas-deploy-key.ps1 completed successfully." -ForegroundColor Green
