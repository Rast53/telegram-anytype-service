param(
  [switch]$SkipInstall,
  [switch]$SkipLint,
  [switch]$SkipTypecheck,
  [switch]$SkipTest,
  [switch]$SkipBuild
)

. "$PSScriptRoot/common.ps1"

Enter-RepoRoot
Write-Step "Локальные проверки проекта"

Assert-Command -Name "node" -InstallHint "Установите Node.js 22+ и проверьте PATH."
Assert-Command -Name "npm" -InstallHint "Установите npm вместе с Node.js."

if (-not $SkipInstall) {
  if (-not (Test-Path "node_modules")) {
    Write-Step "Установка зависимостей (npm ci)"
    Invoke-External -Command "npm" -Arguments @("ci") -FailureHint "Проверьте package-lock.json и доступ к npm registry."
  }
  else {
    Write-Host "node_modules уже существует, пропускаю npm ci."
  }
}

if (-not $SkipLint) {
  Write-Step "Lint"
  Invoke-External -Command "npm" -Arguments @("run", "lint") -FailureHint "Исправьте lint ошибки через npm run lint:fix."
}

if (-not $SkipTypecheck) {
  Write-Step "Typecheck"
  Invoke-External -Command "npm" -Arguments @("run", "typecheck") -FailureHint "Проверьте TypeScript ошибки перед деплоем."
}

if (-not $SkipTest) {
  Write-Step "Tests"
  Invoke-External -Command "npm" -Arguments @("run", "test") -FailureHint "Почините тесты или временно добавьте -SkipTest с объяснением в PR."
}

if (-not $SkipBuild) {
  Write-Step "Build"
  Invoke-External -Command "npm" -Arguments @("run", "build") -FailureHint "Проверьте сборку и Prisma generate."
}

Write-Host ""
Write-Host "check.ps1 completed successfully." -ForegroundColor Green
