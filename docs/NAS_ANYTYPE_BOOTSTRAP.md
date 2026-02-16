# NAS Anytype Bootstrap (текущий путь)

Этот документ фиксирует фактический рабочий путь для режима, когда Anytype API поднимается рядом с сервисом на NAS.

## Зачем нужен отдельный bootstrap

`telegram-anytype-service` использует `@anyproto/anytype-mcp`, которому нужен доступ к Anytype API.
Если API не запущен и не доступен по сети, MCP вызовы завершаются ошибками подключения.

## Варианты подключения Anytype API

1. **Внешний Anytype API уже есть**  
   Например, API поднят на другом хосте. Тогда достаточно корректно указать `ANYTYPE_API_BASE_URL`.

2. **Headless Anytype API на NAS (текущий self-host путь)**  
   Нужна первичная настройка `anytype-cli` на NAS.

## Проверенный self-host путь (NAS)

### 1) Установить `anytype-cli` на NAS

```bash
/usr/bin/env bash -c "$(curl -fsSL https://raw.githubusercontent.com/anyproto/anytype-cli/HEAD/install.sh)"
```

### 2) Подготовить network config для self-host сети Anytype

Источник обычно находится в стеке `any-sync`, например:

- `/volume2/docker/any-sync/any-sync-dockercompose/etc/client.yml`

Используется в командах `anytype auth create --network-config ...`.

### 3) Запустить Anytype API на NAS

```bash
anytype serve --listen-address 0.0.0.0:31012
```

Для фонового запуска используйте `nohup` или системный планировщик NAS.

### 4) Создать bot-аккаунт Anytype и API key

```bash
anytype auth create anytype-mcp-bot --network-config /path/to/client.yml --listen-address 0.0.0.0:31012 --root-path /path/to/anytype-data
anytype auth apikey create telegram-anytype-service
```

### 5) Подключить нужное пространство (invite)

```bash
anytype space join "anytype://invite/?cid=...&key=..."
anytype space list
```

### 6) Прописать env сервиса

В `deploy/.env`:

- `MCP_TRANSPORT=stdio`
- `MCP_STDIO_COMMAND=npx`
- `MCP_STDIO_ARGS=-y,@anyproto/anytype-mcp`
- `MCP_STDIO_ENV_JSON` должен содержать:
  - `ANYTYPE_API_BASE_URL` (например `http://192.168.10.55:31012`)
  - `OPENAPI_MCP_HEADERS.Authorization=Bearer <API_KEY>`
  - `OPENAPI_MCP_HEADERS.Anytype-Version`
- `ANYTYPE_SPACE_ID=<id пространства из anytype space list>`
- при использовании 2Brain: `ANYTYPE_CATALOG_OBJECT_ID` (id страницы Каталог контекста), `ANYTYPE_INBOX_COLLECTION_ID` (list_id коллекции Inbox DB из каталога)

### 7) Деплой сервиса

```powershell
npm run ops:deploy-nas
npm run ops:smoke
```

## Диагностика

- Проверка API на NAS:
  - `curl -i http://127.0.0.1:31012/v1/spaces` (ожидается `401` без токена)
- Проверка пространства:
  - `curl -H "Authorization: Bearer <API_KEY>" -H "Anytype-Version: 2025-05-20" http://127.0.0.1:31012/v1/spaces/<space_id>`
- Проверка MCP tools из контейнера:
  - `API-list-spaces`, `API-search-space` должны возвращать данные.

## Известная сложность MVP

На некоторых self-host конфигурациях `anytype auth create` может падать с `DeadlineExceeded`.
Это отдельная точка нестабильности первичной инициализации Anytype bot-аккаунта.

## План упрощения (следующий этап)

1. Сделать единый bootstrap-скрипт `setup-anytype-nas.ps1`:
   - установка `anytype-cli`
   - проверка API
   - создание bot-аккаунта/API key
   - join space
   - генерация готового блока для `deploy/.env`
2. Добавить preflight-проверку в `ops:deploy-nas`:
   - доступность `ANYTYPE_API_BASE_URL`
   - валидность API key
   - доступность `ANYTYPE_SPACE_ID`
3. Рассмотреть containerized sidecar для Anytype API, чтобы убрать ручные шаги на хосте NAS.
