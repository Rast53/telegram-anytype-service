---
name: service-development
description: Рекомендации для разработки Telegram Anytype Service
---

# Service Development Skill

## Цели

- Удерживать стабильный поток `Telegram -> Intent -> MCP -> Response`.
- Сохранять совместимость с single-tenant self-host.
- Минимизировать риск потери сообщений и дублей.

## Правила

1. Сначала deterministic rules, потом LLM.
2. Все интеграционные вызовы (MCP/LLM/DB/Redis) делать с timeout/retry.
3. Ошибки пользователя формулировать просто; тех-детали только в логи.
4. Для любого нового intent — обновлять `docs/TELEGRAM_INTENTS.md`.
5. Для любых новых ENV — обновлять `deploy/.env.example`.
6. Для повторяемых операций использовать script-first (`scripts/*.ps1`), а не разрозненные команды.

## Definition of Done для изменений

- Код покрыт unit-тестами для новой логики.
- Документация обновлена.
- Нет секретов и чувствительных данных в diff.
