# Security Policy

## Supported Versions

Пока поддерживается только актуальная `main` ветка.

## Reporting a Vulnerability

1. Не публикуйте уязвимость публично до фикса.
2. Подготовьте минимальный PoC и шаги воспроизведения.
3. Укажите влияние (конфиденциальность/целостность/доступность).

## Security Baseline

- Telegram allowlist обязателен.
- Все секреты только через ENV/secret manager.
- Логи с редактированием чувствительных полей.
- MCP и OpenRouter вызовы с timeout/retry.
- Idempotency Telegram updates для защиты от дублей webhook.

## Threat Model (v1)

- Несанкционированные сообщения в бот.
- Повторная доставка update и повторные операции.
- Сбой Anytype MCP в середине операции.
- Ошибочная классификация LLM.

## Current Mitigations

- user/chat allowlist
- operation status и audit trail в Postgres
- rule-first routing + safe fallback в Inbox
- retries с bounded backoff
