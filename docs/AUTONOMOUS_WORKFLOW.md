# Autonomous Workflow Guidelines

Практики для автономной работы агента в Cursor (Win11 + PowerShell 7).

## 1. Script-first вместо текстовых инструкций

Одинаковые цепочки действий должны быть в `.ps1` скриптах, а не только в правилах.

## 2. Логи и подсказки в stdout

Скрипт должен выводить:
- что делает сейчас;
- где произошла ошибка;
- что сделать дальше.

## 3. Self-verification обязательно

После деплоя скрипт должен запускать smoke-проверки (`/health`, `/ready`) и возвращать non-zero exit code при проблеме.

## 4. Минимум ручных шагов

Если процесс требует рестарта/проверки/запуска, это должно быть внутри скрипта.

Исключение для текущего MVP: первичная инициализация headless Anytype API на NAS (`anytype-cli`).
Путь и ограничения зафиксированы в [docs/NAS_ANYTYPE_BOOTSTRAP.md](docs/NAS_ANYTYPE_BOOTSTRAP.md).

## 5. Идемпотентные операции

Скрипты должны корректно запускаться повторно (например, `docker compose up -d --remove-orphans`).

## Рекомендуемый запуск

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/full-pipeline.ps1 -SshHost <host> -SshUser <user> -RemotePath <path> -BaseUrl https://your-domain
```
