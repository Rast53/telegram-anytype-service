# Telegram Anytype Service

Self-hosted сервис, который принимает сообщения из Telegram, определяет намерение (rules-first + LLM fallback), работает с Anytype через MCP и отправляет результат обратно в Telegram.

## Возможности v1

- Понятные команды обрабатываются без LLM (rules-first).
- Для неочевидных запросов используется LLM-классификатор (опционально).
- Запись планов дня по дате (`Планы на сегодня`, `План на DD.MM.YYYY`).
- Запись свободных заметок в Inbox.
- Чтение планов на дату.
- Чтение последних записей Inbox.
- Статус выполнения каждой операции (`queued -> processing -> completed/failed`).
- Надежность: idempotency Telegram updates, retry/backoff, allowlist.

## Архитектура (кратко)

`Telegram -> Bot -> Queue -> IntentRouter -> CommandExecutor -> Anytype via MCP -> Telegram response`

Подробно: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Технологии

- Node.js 22, TypeScript 5
- grammY + runner
- Fastify
- BullMQ + Redis
- PostgreSQL + Prisma
- MCP TypeScript Client
- OpenRouter (опционально для классификации)
- Zod, Pino, Vitest

## Быстрый старт (self-host)

1. Заполните `deploy/.env` и `deploy/.env.deploy`.
2. Заполните обязательные переменные:
   - `BOT_TOKEN`
   - `TELEGRAM_ALLOWED_USER_IDS`
   - `ANYTYPE_SPACE_ID`
   - MCP-конфиг (`MCP_TRANSPORT=stdio` для встроенного `anytype-mcp` или `MCP_TRANSPORT=http`)
3. Если Anytype API уже доступен в вашей сети — задайте `ANYTYPE_API_BASE_URL` в `MCP_STDIO_ENV_JSON`.
4. Если Anytype API нужно поднимать на NAS отдельно (headless) — используйте пошаговый путь:
   - [docs/NAS_ANYTYPE_BOOTSTRAP.md](docs/NAS_ANYTYPE_BOOTSTRAP.md)
5. Деплой на NAS:
   - `npm run ops:deploy-nas`
6. Проверка:
   - `npm run ops:smoke`

## Текущий режим ИИ (MVP)

- OpenRouter сейчас используется как **классификатор intent**, а не как агент с tool-calling.
- MCP tools вызывает код сервиса (`CommandExecutor`/`AnytypeRepository`) по фиксированной логике.
- Агентный слой (планирование шагов + самостоятельные вызовы tools) запланирован в roadmap.

## Автономный workflow (Win11 + PowerShell 7)

Для Cursor-агента и ручной работы используйте script-first подход:

- `npm run ops:check`
- `npm run ops:build-push -- -Tag test-001`
- `npm run ops:deploy -- -SshHost <host> -SshUser <user> -RemotePath <path>`
- `npm run ops:smoke -- -BaseUrl https://your-domain`
- `npm run ops:pipeline -- -SshHost <host> -SshUser <user> -RemotePath <path> -BaseUrl https://your-domain`

Скрипты расположены в `scripts/` и печатают в stdout пошаговые подсказки при ошибках.

## Примеры пользовательских сообщений

- `Планы на сегодня: помыть машину, съездить в сервис`
- `План на 23.02.2026: провести встречу с коллегами`
- `Запиши, что нужно подумать про подарок жене`
- `Какие есть планы на 23.02.2026`
- `Что есть в inbox`

Если инструкция не распознана однозначно, сервис отправит запись в Inbox.

## Конфигурация MCP

Сервис поддерживает:

- `MCP_TRANSPORT=http` (remote MCP endpoint)
- `MCP_TRANSPORT=stdio` (локальный процесс MCP)

Подробно: [docs/MCP_CONFIGURATION.md](docs/MCP_CONFIGURATION.md)

## Безопасность

- allowlist по `user_id` (+ опционально `chat_id`)
- скрытие чувствительных полей в логах
- idempotency по `update_id`
- retry/backoff для MCP/LLM

Подробно: [SECURITY.md](SECURITY.md)

## Разработка

Задачи ведутся через **GitHub Issues**, ветки — `issue-N-name`, в коммитах и PR — `fixes #N` для автозакрытия. Подробно: [docs/GITHUB_WORKFLOW.md](docs/GITHUB_WORKFLOW.md).

## Документация

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/GITHUB_WORKFLOW.md](docs/GITHUB_WORKFLOW.md)
- [docs/TELEGRAM_INTENTS.md](docs/TELEGRAM_INTENTS.md)
- [docs/MCP_CONFIGURATION.md](docs/MCP_CONFIGURATION.md)
- [docs/NAS_ANYTYPE_BOOTSTRAP.md](docs/NAS_ANYTYPE_BOOTSTRAP.md)
- [docs/OPERATIONS.md](docs/OPERATIONS.md)
- [docs/ROADMAP.md](docs/ROADMAP.md)
- [docs/ACCEPTANCE_CRITERIA.md](docs/ACCEPTANCE_CRITERIA.md)
- [docs/AUTONOMOUS_WORKFLOW.md](docs/AUTONOMOUS_WORKFLOW.md)
- [scripts/README.md](scripts/README.md)

## Лицензия

Apache-2.0 — см. [LICENSE](LICENSE).
