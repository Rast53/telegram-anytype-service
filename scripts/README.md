# Scripts (PowerShell 7, Win11)

Script-first workflow для автономной работы агента в Cursor.

## Рекомендуемая последовательность

1. `check.ps1` — валидация кода.
2. `docker-build-push.ps1` — сборка и push образа (по умолчанию `rast53/telegram-anytype-service:dev`).
3. `sync-deploy.ps1` — копирование deploy/ на NAS (перед первым деплоем или при изменении .env).
4. `deploy-synology.ps1` — деплой compose на NAS.
5. `deploy-nas.ps1` — обёртка для NAS 192.168.10.55:7022 (sync + deploy).
6. `smoke.ps1` — health/ready проверка.
7. `full-pipeline.ps1` — оркестратор всех шагов.

## NAS (192.168.10.55:7022)

Для деплоя на NAS с нестандартным SSH-портом 7022:

```powershell
# Один раз: создать deploy-ключ без passphrase и установить на NAS
pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/setup-nas-deploy-key.ps1 -SshHost 192.168.10.55 -SshPort 7022 -SshUser root -SshKeyPath C:/Users/<user>/.ssh/id_ed25519_nas_deploy

# Первый раз: синхронизация deploy/ + деплой
pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/deploy-nas.ps1 -SshUser root -RemotePath /volume2/docker/telegram-anytype-service

# Только синхронизация (при изменении .env или compose)
pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/sync-deploy.ps1 -SshHost 192.168.10.55 -SshPort 7022 -SshUser root -RemotePath /volume2/docker/telegram-anytype-service

# Только деплой (pull + up)
pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/deploy-synology.ps1 -SshHost 192.168.10.55 -SshPort 7022 -SshUser root -RemotePath /volume2/docker/telegram-anytype-service
```

По умолчанию `deploy-synology.ps1` также выполняет миграцию БД:

- если есть `prisma/migrations/*` → `prisma migrate deploy`
- если миграций пока нет → `prisma db push`

Отключить можно флагом `-SkipMigrations`.

## Примеры (общие)

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/check.ps1
pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/docker-build-push.ps1
pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/docker-build-push.ps1 -Tag test-001
pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/deploy-synology.ps1 -SshHost 192.168.1.10 -SshUser root -RemotePath /volume2/docker/telegram-anytype-service
pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/smoke.ps1 -BaseUrl http://192.168.10.55:3000
pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/full-pipeline.ps1 -SshHost 192.168.10.55 -SshPort 7022 -SshUser root -RemotePath /volume2/docker/telegram-anytype-service -BaseUrl http://192.168.10.55:3000 -SyncBeforeDeploy
```

## Важные ENV для автономного запуска

- `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`
- `DEPLOY_SSH_HOST`, `DEPLOY_SSH_PORT` (7022 для NAS), `DEPLOY_SSH_KEY_PATH`, `DEPLOY_SSH_USER`, `DEPLOY_REMOTE_PATH`
- `SMOKE_BASE_URL` (например `http://192.168.10.55:3000` для NAS в локальной сети)

Если `DEPLOY_SSH_KEY_PATH` указывает на ключ с passphrase, `ssh/scp` будут запрашивать ввод. Для полностью неинтерактивного деплоя используйте отдельный ключ без passphrase (`id_ed25519_nas_deploy`).

Скрипты деплоя (`setup-nas-deploy-key`, `sync-deploy`, `deploy-synology`, `deploy-nas`, `full-pipeline`) автоматически подгружают `deploy/.env.deploy`, если файл существует.

## SSH без пароля

Скрипты используют `ssh`/`scp`. Без SSH-ключа при каждом запуске будет запрос пароля. Настройка ключа для Synology: [docs/SSH_SYNOLOGY.md](../docs/SSH_SYNOLOGY.md).

Скрипты печатают подсказки в stdout при ошибках, чтобы агент не останавливался на неясных шагах.
