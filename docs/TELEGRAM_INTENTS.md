# Telegram Intents

## Rule-first матрица

1. `get_inbox`
   - паттерны: `что есть в inbox`, `что в инбокс`, `покажи инбокс`
2. `get_day_plan`
   - паттерн: `какие планы на <дата|сегодня>`
3. `create_day_plan`
   - паттерн: `планы на сегодня: ...` или `план на DD.MM.YYYY: ...`
4. `add_inbox_note`
   - паттерн: `запиши ...` / `заметка ...`
5. fallback
   - всё остальное -> Inbox

## Примеры

- `Планы на сегодня: помыть машину, съездить в сервис`
  - intent: `create_day_plan`
- `План на 23.02.2026: провести встречу с коллегами`
  - intent: `create_day_plan`
- `Какие есть планы на 23.02.2026`
  - intent: `get_day_plan`
- `Что есть в inbox`
  - intent: `get_inbox`
- `Запиши, что нужно подумать про подарок жене`
  - intent: `add_inbox_note`

## LLM-классификация

LLM используется только когда rules не дали результата и включен `LLM_CLASSIFIER_ENABLED=true`.
LLM в MVP не вызывает MCP tools напрямую: он только выбирает intent.

Ограничения:
- если confidence ниже `LLM_CLASSIFIER_MIN_CONFIDENCE`, результат LLM игнорируется;
- при неоднозначности всегда fallback в Inbox.
