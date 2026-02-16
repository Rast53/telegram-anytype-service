Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Enter-RepoRoot {
  Set-Location (Get-RepoRoot)
}

function Write-Step {
  param(
    [Parameter(Mandatory = $true)][string]$Message
  )
  Write-Host ""
  Write-Host "=== $Message ===" -ForegroundColor Cyan
}

function Write-Hint {
  param(
    [Parameter(Mandatory = $true)][string]$Message
  )
  Write-Host "HINT: $Message" -ForegroundColor Yellow
}

function Assert-Command {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [string]$InstallHint = ""
  )

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    if ($InstallHint) {
      Write-Hint $InstallHint
    }
    throw "Команда '$Name' не найдена."
  }
}

function Invoke-External {
  param(
    [Parameter(Mandatory = $true)][string]$Command,
    [string[]]$Arguments = @(),
    [string]$FailureHint = ""
  )

  $commandLine = "$Command $($Arguments -join ' ')".Trim()
  Write-Host ">> $commandLine"

  & $Command @Arguments
  $exitCode = $LASTEXITCODE
  if ($exitCode -ne 0) {
    if ($FailureHint) {
      Write-Hint $FailureHint
    }
    throw "Команда завершилась с кодом ${exitCode}: $commandLine"
  }
}

function Require-EnvValue {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [string]$Hint = ""
  )

  $value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($value)) {
    if ($Hint) {
      Write-Hint $Hint
    }
    throw "Не задана переменная окружения '$Name'."
  }
  return $value
}

function Import-EnvFileToProcess {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath
  )

  if (-not (Test-Path $FilePath)) {
    return $false
  }

  $lines = Get-Content -Path $FilePath -ErrorAction SilentlyContinue
  foreach ($line in $lines) {
    $trimmed = $line.Trim()
    if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith("#")) {
      continue
    }
    if ($trimmed -match '^\s*([^=]+?)\s*=\s*(.*)\s*$') {
      $key = $matches[1].Trim()
      $value = $matches[2]
      [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
  }

  return $true
}

function Import-DeployEnvFile {
  $deployEnvPath = Join-Path (Get-RepoRoot) "deploy/.env.deploy"
  $loaded = Import-EnvFileToProcess -FilePath $deployEnvPath
  if ($loaded) {
    Write-Host "Loaded deploy env: $deployEnvPath" -ForegroundColor DarkGray
  }
}

# Запуск Docker Desktop при необходимости и ожидание готовности демона (только Windows)
function Ensure-DockerRunning {
  $null = docker info 2>&1
  if ($LASTEXITCODE -eq 0) { return }
  if (-not ($env:OS -eq "Windows_NT")) {
    Write-Host "Ошибка: Docker daemon не запущен. Запустите Docker вручную и повторите." -ForegroundColor "Red"
    throw "Docker daemon не запущен."
  }
  $dockerDesktopPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
  if (-not (Test-Path $dockerDesktopPath)) {
    Write-Host "Ошибка: Docker daemon не запущен." -ForegroundColor "Red"
    Write-Host "Docker Desktop не найден по пути: $dockerDesktopPath" -ForegroundColor "Yellow"
    Write-Host "Запустите Docker Desktop вручную и повторите." -ForegroundColor "Yellow"
    throw "Docker Desktop не найден."
  }
  Write-Host "Docker daemon не запущен. Запускаю Docker Desktop..." -ForegroundColor "Yellow"
  try {
    Start-Process -FilePath $dockerDesktopPath -ErrorAction Stop
  }
  catch {
    Write-Host "Не удалось запустить Docker Desktop: $_" -ForegroundColor "Red"
    throw "Не удалось запустить Docker Desktop."
  }
  $maxWaitSeconds = 90
  $intervalSeconds = 5
  $elapsed = 0
  while ($elapsed -lt $maxWaitSeconds) {
    Write-Host "Ожидание готовности Docker ($elapsed / $maxWaitSeconds с)..." -ForegroundColor "Gray"
    Start-Sleep -Seconds $intervalSeconds
    $elapsed += $intervalSeconds
    $null = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
      Write-Host "Docker готов. Продолжаю." -ForegroundColor "Green"
      return
    }
  }
  Write-Host "Ошибка: Docker daemon не запустился за $maxWaitSeconds с." -ForegroundColor "Red"
  Write-Host "Проверьте Docker Desktop и повторите." -ForegroundColor "Yellow"
  throw "Docker daemon не запустился."
}
