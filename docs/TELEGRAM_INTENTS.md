# Telegram Intents

## Rule-first матрица

1. `get_inbox`
   - паттерны: `что есть в inbox`, `что в инбокс`, `покажи инбокс`
   - реализация: при `ANYTYPE_INBOX_COLLECTION_ID` — `get-list-objects` по коллекции Inbox DB; иначе поиск по префиксу заголовка.
2. `get_day_plan`
   - паттерн: `какие планы на <дата|сегодня>`
3. `create_day_plan`
   - паттерн: `планы на сегодня: ...` или `план на DD.MM.YYYY: ...`
4. `add_inbox_note`
   - паттерн: `запиши ...` / `заметка ...`
   - реализация: создание страницы (create-object) + при заданном `ANYTYPE_INBOX_COLLECTION_ID` — добавление в коллекцию Inbox DB (add-list-objects), см. Каталог контекста 2Brain.
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
