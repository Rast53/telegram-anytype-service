param(
  [string]$Image = "rast53/telegram-anytype-service",
  [string]$Tag = "dev",
  [switch]$NoPush,
  [switch]$NoLogin
)

. "$PSScriptRoot/common.ps1"

Enter-RepoRoot
Import-DeployEnvFile
Write-Step "Docker build/push"

Assert-Command -Name "docker" -InstallHint "Установите Docker Desktop или docker engine."
Ensure-DockerRunning

$fullTag = "$Image`:$Tag"
Write-Host "Target image: $fullTag"

Write-Step "Docker build"
Invoke-External -Command "docker" -Arguments @("build", "-t", $fullTag, "-f", "Dockerfile", ".") -FailureHint "Проверьте Dockerfile и доступ к build context."

if ($NoPush) {
  Write-Host "NoPush=true, push пропущен."
  Write-Host "docker-build-push.ps1 completed successfully." -ForegroundColor Green
  return
}

if (-not $NoLogin) {
  $dockerUser = [Environment]::GetEnvironmentVariable("DOCKERHUB_USERNAME")
  $dockerToken = [Environment]::GetEnvironmentVariable("DOCKERHUB_TOKEN")

  if (-not [string]::IsNullOrWhiteSpace($dockerUser) -and -not [string]::IsNullOrWhiteSpace($dockerToken)) {
    Write-Step "Docker login via environment variables"
    $dockerToken | docker login -u $dockerUser --password-stdin
    if ($LASTEXITCODE -ne 0) {
      Write-Hint "Проверьте DOCKERHUB_USERNAME / DOCKERHUB_TOKEN."
      throw "Docker login не выполнен."
    }
  }
  else {
    Write-Hint "DOCKERHUB_USERNAME или DOCKERHUB_TOKEN не заданы. Использую текущую docker-сессию."
  }
}

Write-Step "Docker push"
Invoke-External -Command "docker" -Arguments @("push", $fullTag) -FailureHint "Выполните docker login и проверьте права на репозиторий в Docker Hub."

Write-Host ""
Write-Host "docker-build-push.ps1 completed successfully." -ForegroundColor Green
