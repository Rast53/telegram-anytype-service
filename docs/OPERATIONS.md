# Operations Runbook

## Health checks

- `GET /health` — liveness.
- `GET /ready` — readiness (Postgres + Redis).

## Автоматизированный пайплайн

Базовые команды для Win11 + PowerShell 7:

1. `pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/check.ps1`
2. `pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/docker-build-push.ps1 -Tag test-001`
3. `pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/deploy-synology.ps1 -SshHost <host> -SshUser <user> -RemotePath <path>`
4. `pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/smoke.ps1 -BaseUrl https://your-domain`

Полный запуск одной командой:

- `pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/full-pipeline.ps1 -SshHost <host> -SshUser <user> -RemotePath <path> -BaseUrl https://your-domain`

Принципы:
- не использовать интерактивные TUI-сценарии в агенте;
- вся цепочка действий должна быть зафиксирована в скриптах;
- критичные логи и подсказки обязаны выводиться в stdout.

## Основные метрики для мониторинга

- количество `completed/failed` операций;
- latency обработки jobs;
- доля fallback-to-inbox;
- доступность MCP и OpenRouter.

## Troubleshooting

### 1. Бот не отвечает
- проверить `BOT_TOKEN`
- проверить allowlist: `TELEGRAM_ALLOWED_USER_IDS`, `TELEGRAM_ALLOWED_CHAT_IDS`
- проверить режим (`TELEGRAM_USE_WEBHOOK`) и webhook URL

### 2. Ошибки Anytype/MCP
- проверить `MCP_TRANSPORT` и endpoint/command
- проверить доступные MCP tools:
  - legacy: `search-space`, `get-object`, `create-object`, `update-object`, `add-list-objects`, `get-list-objects`
  - API-prefixed: `API-search-space`, `API-get-object`, `API-create-object`, `API-update-object`, `API-add-list-objects`, `API-get-list-objects`
- проверить `ANYTYPE_SPACE_ID`
- при использовании Inbox как коллекции 2Brain: проверить `ANYTYPE_INBOX_COLLECTION_ID` (list_id из Каталога контекста)
- для NAS headless Anytype API: свериться с [docs/NAS_ANYTYPE_BOOTSTRAP.md](docs/NAS_ANYTYPE_BOOTSTRAP.md)

### 3. Дубли задач
- убедиться, что таблица `ProcessedUpdate` доступна
- проверить, что update_id сохраняется без ошибок в БД

### 4. Ошибки LLM-классификатора
- проверить `OPENROUTER_API_KEY`
- временно выключить `LLM_CLASSIFIER_ENABLED`
- убедиться, что сервис корректно уходит в rule/fallback режим

## Безопасный рестарт

1. Остановить входящий трафик (при необходимости).
2. Отправить `SIGTERM` контейнеру.
3. Дождаться graceful shutdown (worker/queue/db/redis/mcp).
4. Запустить новую версию.
