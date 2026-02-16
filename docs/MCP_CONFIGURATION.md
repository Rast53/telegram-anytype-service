# MCP Configuration

Сервис поддерживает два режима MCP клиента.

## 1) HTTP transport (рекомендуется для NAS/VPS)

```env
MCP_TRANSPORT=http
MCP_HTTP_URL=http://your-mcp-host:port/mcp
MCP_HTTP_HEADERS_JSON={"Authorization":"Bearer <token-if-needed>"}
```

## 2) stdio transport (локальный процесс)

```env
MCP_TRANSPORT=stdio
MCP_STDIO_COMMAND=node
MCP_STDIO_ARGS=path/to/mcp-server.js,--arg1,--arg2
MCP_STDIO_ENV_JSON={"ANYTYPE_TOKEN":"..."}
```

Для Anytype через `@anyproto/anytype-mcp` обычно используется:

```env
MCP_TRANSPORT=stdio
MCP_STDIO_COMMAND=npx
MCP_STDIO_ARGS=-y,@anyproto/anytype-mcp
MCP_STDIO_ENV_JSON={"ANYTYPE_API_BASE_URL":"http://<host>:31012","OPENAPI_MCP_HEADERS":"{\"Authorization\":\"Bearer <api_key>\",\"Anytype-Version\":\"2025-05-20\"}"}
```

## MCP tools, которые ожидает сервис

- Legacy имена:
  - `search-space`
  - `get-object`
  - `create-object`
  - `update-object`
  - `add-list-objects`, `get-list-objects`, `get-list-views` (для Inbox как коллекции 2Brain)
- API-prefixed имена:
  - `API-search-space`
  - `API-get-object`
  - `API-create-object`
  - `API-update-object`
  - `API-add-list-objects`, `API-get-list-objects`, `API-get-list-views`

Сервис поддерживает оба варианта (legacy и `API-*`).

## Минимальный профиль Anytype

```env
ANYTYPE_SPACE_ID=<space_id>
ANYTYPE_CATALOG_OBJECT_ID=<optional_catalog_object_id>
ANYTYPE_INBOX_PAGE_TITLE=01 Inbox
ANYTYPE_DAY_PLAN_TITLE_PREFIX=План
ANYTYPE_INBOX_NOTE_TITLE_PREFIX=Inbox
```

Для **2Brain / Inbox как коллекции** (рекомендуется при использовании Каталога контекста):

```env
ANYTYPE_INBOX_COLLECTION_ID=<list_id коллекции Inbox DB>
```

Значение берётся из Каталога контекста в Anytype (блок «Inbox: как кидать и разбирать», list_id Inbox DB). Если задано: запись в Inbox дополнительно добавляет страницу в коллекцию; запрос «что в inbox» сначала получает представление коллекции (get-list-views), затем объекты (get-list-objects с view_id). Без view_id Anytype API возвращает 500 (views/undefined).

## Проверка подключения

Сервис на старте не падает без каталога, но для лучшей маршрутизации рекомендуется заполненный `Каталог контекста`.

Если MCP недоступен:
- операции перейдут в `failed`;
- пользователь получит ошибку в Telegram;
- детали будут в логах.

Практическая проверка для Anytype API:

- `curl http://<host>:31012/v1/spaces` возвращает `401` без токена (API живой).
- `API-list-spaces` через MCP возвращает хотя бы одно пространство.
