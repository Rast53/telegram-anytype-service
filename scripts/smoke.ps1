param(
  [string]$BaseUrl = "",
  [int]$Retries = 12,
  [int]$DelaySeconds = 5,
  [switch]$SkipReady,
  [switch]$SkipTlsCheck
)

. "$PSScriptRoot/common.ps1"

Enter-RepoRoot
Import-DeployEnvFile
Write-Step "Smoke checks"

if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
  $BaseUrl = [Environment]::GetEnvironmentVariable("SMOKE_BASE_URL")
}
if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
  throw "Не задан BaseUrl. Передайте -BaseUrl или SMOKE_BASE_URL."
}

function Invoke-SmokeRequest {
  param(
    [Parameter(Mandatory = $true)][string]$Url
  )

  $requestParams = @{
    Uri        = $Url
    Method     = "Get"
    TimeoutSec = 15
  }

  if ($SkipTlsCheck) {
    $requestParams["SkipCertificateCheck"] = $true
  }

  return Invoke-RestMethod @requestParams
}

function Wait-Endpoint {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][scriptblock]$Condition
  )

  for ($attempt = 1; $attempt -le $Retries; $attempt++) {
    try {
      $response = Invoke-SmokeRequest -Url $Url
      if (& $Condition $response) {
        Write-Host "$Name OK (attempt $attempt/$Retries)."
        return $response
      }
      Write-Hint "$Name ответил, но условие не выполнено: $($response | ConvertTo-Json -Depth 5 -Compress)"
    }
    catch {
      Write-Hint "$Name попытка $attempt/$($Retries): $($_.Exception.Message)"
    }

    if ($attempt -lt $Retries) {
      Start-Sleep -Seconds $DelaySeconds
    }
  }

  throw "$Name не прошел smoke-проверку после $Retries попыток."
}

$healthUrl = "$($BaseUrl.TrimEnd('/'))/health"
$readyUrl = "$($BaseUrl.TrimEnd('/'))/ready"

Write-Step "Check /health"
$healthResponse = Wait-Endpoint -Name "/health" -Url $healthUrl -Condition {
  param($response)
  return $response.status -eq "ok"
}
Write-Host "health response: $($healthResponse | ConvertTo-Json -Depth 5 -Compress)"

if (-not $SkipReady) {
  Write-Step "Check /ready"
  $readyResponse = Wait-Endpoint -Name "/ready" -Url $readyUrl -Condition {
    param($response)
    return $response.status -eq "ready"
  }
  Write-Host "ready response: $($readyResponse | ConvertTo-Json -Depth 5 -Compress)"
}

Write-Host ""
Write-Host "smoke.ps1 completed successfully." -ForegroundColor Green
