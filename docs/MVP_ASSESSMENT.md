# Оценка MVP: проще ли без MCP и аналоги

## Можно ли было сделать проще (REST API вместо MCP)

### Факты

- **Anytype предоставляет REST HTTP API** с Bearer-аутентификацией: [developers.anytype.io](https://developers.anytype.io/). Эндпоинты покрывают всё, что мы делаем через MCP:
  - `POST /v1/spaces/:space_id/objects` — создание объекта (страницы)
  - `POST /v1/spaces/:space_id/lists/:list_id/objects` — добавление в коллекцию
  - `GET /v1/spaces/:space_id/lists/:list_id/views/:view_id/objects` — объекты в коллекции (с view)
  - `GET /v1/spaces/:space_id/objects/search` (или аналог) — поиск по пространству
- **Anytype MCP** ([anyproto/anytype-mcp](https://github.com/anyproto/anytype-mcp)) — это по сути **OpenAPI→MCP обёртка**: те же REST-вызовы, но в формате MCP tools (stdio/HTTP для AI-клиентов). Один и тот же API key, тот же base URL.

### Вывод по сложности

| Подход | Плюсы | Минусы |
|--------|--------|--------|
| **REST API напрямую** (axios/fetch) | Меньше движущихся частей: один HTTP-клиент, нет stdio-процесса, нет подбора имён tool (add-list-objects vs add_objects_to_list), нет багов вида view_id=undefined из-за обёртки. Проще отлаживать и деплой. | При появлении AI-агента (v2) пришлось бы либо дублировать вызовы (агент через MCP, бот через REST), либо переводить бота на MCP. |
| **MCP (как сейчас)** | Единый канал для бота и будущего агента: агент в Cursor/Claude сможет вызывать те же tools. Не нужно переписывать интеграцию с Anytype при добавлении agent layer. | Сложнее: отдельный процесс (npx anytype-mcp), совместимость имён tools, особенности обёртки (обязательный view_id и т.д.). |

**Для текущего MVP** (только Telegram → Inbox/план, без агента) **да, можно было сделать проще на прямом REST**: один адаптер `AnytypeHttpClient` с методами createObject, addToList, getListViews, getListObjects — без MCP, без stdio. Оценка: на 20–30% меньше кода и проще эксплуатация.

**Имеет смысл оставить MCP**, если приоритет — быстрый выход в v2 с агентом (один протокол, один набор tools). Имеет смысл рассмотреть **переход на REST** в v1.1/v1.2, если хочется упростить стек и отложить агента.

---

## Аналоги сервиса (Telegram → хранилище / second brain)

### Прямые аналоги (Telegram → Anytype)

- **AnytypeCapture** ([ebanDev/AnytypeCapture](https://github.com/ebanDev/AnytypeCapture)) — быстрый захват мыслей в Anytype через **gRPC (protobuf)** API Anytype. Локальный запуск, shortcut/alias, **не Telegram**. ~13 stars.
- **Наш сервис** (telegram-anytype-service) — судя по поиску, отдельного open-source «Telegram-бот → Anytype Inbox» с таким сценарием (Inbox + планы, 2Brain, self-host) в явном виде не найдено. Ближайший по идее — AnytypeCapture (захват в Anytype), но без Telegram и без MCP.

### Близкие по идее (Telegram → другое хранилище)

| Сервис / репо | Хранилище | Описание |
|---------------|-----------|----------|
| **NotedBot** (notedbot.com) | Notion | Сохранение сообщений, ссылок, медиа из Telegram в Notion. SaaS. |
| **Gramtion** (gramtion.com) | Notion | Синхронизация чатов/групп с Notion. Платный ($25/мес за группу). |
| **telegram-notion-saver** (GitHub) | Notion | Open-source бот для сохранения в Notion. |
| **obsidian-telegram-inbox** (GitHub) | Obsidian | Плагин: сообщения от бота попадают в daily notes. |
| **tg2obsidian** (GitHub) | Obsidian | Бот: сообщения из чатов/групп → локальный vault Obsidian. |
| **mcp-telegram** (GitHub) | — | MCP-сервер для работы с Telegram из AI (отправка и т.д.), не захват в базу знаний. |

Итого: аналоги есть в связке **Telegram → Notion/Obsidian**; для **Telegram → Anytype** с Inbox/2Brain и self-host готового аналога в поиске не видно — наш MVP закрывает эту нишу.

---

## Рекомендации

1. **Документировать решение «MCP vs REST»** в архитектуре (этот файл + ссылка из ARCHITECTURE.md или ROADMAP).
2. При желании **упростить стек до v1.2**: рассмотреть адаптер «Anytype REST» рядом с MCP (или вместо него) только для бота; MCP оставить для будущего агента.
3. **Не менять текущий MVP на REST только ради упрощения**, если в ближайшее время планируется agent layer (v2): один протокол и один набор операций с Anytype уменьшают дублирование и риски рассинхрона.
