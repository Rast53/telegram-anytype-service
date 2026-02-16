# Contributing

## Branching

- Рабочая ветка на каждую задачу: `feature/<name>` или `fix/<name>`.
- Маленькие PR с четким scope.

## Commit style

- `feat: ...` для новой функциональности
- `fix: ...` для багфиксов
- `docs: ...` для документации
- `refactor: ...` для рефакторинга без изменения поведения
- `test: ...` для тестов

## Quality gate

Перед PR:

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`
4. Обновить релевантную документацию в `docs/`

## Architecture rules

- Rule-first intent routing всегда выше LLM-классификации.
- При неоднозначности действие по умолчанию: Inbox.
- Любые внешние интеграции через adapter layer.
- Не смешивать Telegram transport и бизнес-логику в одном модуле.

## Security

- Никогда не коммитить `.env`, токены и креды.
- Не логировать полный текст приватных сообщений при ошибках.
- Изменения безопасности описывать в `SECURITY.md`.
