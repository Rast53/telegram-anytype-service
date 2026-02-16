# AGENTS.md (telegram-anytype-service)

Инструкции для AI-агентов и разработчиков.

## Контекст

- Сервис single-tenant: один владелец/чат на один деплой.
- Основной поток: Telegram -> Intent -> MCP Anytype -> Telegram response.
- Rule-first: детерминированные правила всегда выше LLM.
- Safe fallback: непонятные сообщения всегда идут в Inbox.

## Архитектурные границы

- `src/bot/*` — transport layer Telegram.
- `src/core/*` — бизнес-правила и orchestration.
- `src/adapters/*` — внешние интеграции (MCP, Anytype, OpenRouter, DB, queue).
- Нельзя смешивать adapter и domain-логику.

## Критичные требования

1. Не ломать идемпотентность по `update_id`.
2. Не убирать allowlist в прод-конфиге.
3. Любые рискованные изменения поведения фиксировать в `docs/TELEGRAM_INTENTS.md`.
4. Любая новая интеграция — через adapter + интерфейс.

## Деплой

- По умолчанию self-host через Docker.
- Все runtime-конфиги только через ENV.
- Для автономной работы использовать script-first пайплайн из `scripts/`:
  - `check.ps1` -> `docker-build-push.ps1` -> `deploy-synology.ps1` -> `smoke.ps1`
  - или единый `full-pipeline.ps1`

## GitHub: Issues + Projects + PR

- Задачи вести через **GitHub Issues** (шаблоны: `.github/ISSUE_TEMPLATE/`).
- Ветки от `master`: `issue-N-short-name`; в коммитах и в описании PR указывать `fixes #N` или `closes #N` для автозакрытия issue при мерже.
- Полное описание workflow: `docs/GITHUB_WORKFLOW.md`.

## Документация

При изменениях обновлять:
- `README.md`
- релевантные файлы в `docs/`
- `deploy/.env.example` при изменении ENV

Оценка MVP (MCP vs REST, аналоги): `docs/MVP_ASSESSMENT.md`.
