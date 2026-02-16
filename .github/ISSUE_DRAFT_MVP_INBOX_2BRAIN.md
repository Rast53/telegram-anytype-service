# Черновик issue: вставить в GitHub → Issues → New issue

**Title:** MVP: Inbox 2Brain (коллекция), чтение по view_id, оценка и аналоги

**Labels:** enhancement, documentation

---

## Описание

Завершение MVP сценариев Inbox в связке с 2Brain в Anytype: запись в коллекцию Inbox DB, чтение из неё (с учётом обязательного view_id в API), обновление документации и оценка «можно ли было проще» (REST vs MCP) и аналоги сервиса.

## Сделано

- **Inbox как коллекция 2Brain:** при `ANYTYPE_INBOX_COLLECTION_ID` запись в Inbox = create-object + add-list-objects; fallback по именам tool (add-list-objects / add_objects_to_list).
- **Чтение Inbox:** get-list-views → первый view_id → get-list-objects с view_id (без view_id Anytype API возвращает 500). При ошибке — fallback на поиск по префиксу заголовка.
- **Конфиг и доки:** `ANYTYPE_INBOX_COLLECTION_ID` в env и .env.example; обновлены ROADMAP, TELEGRAM_INTENTS, MCP_CONFIGURATION, ACCEPTANCE_CRITERIA, OPERATIONS, ARCHITECTURE, NAS_ANYTYPE_BOOTSTRAP; добавлен MVP_ASSESSMENT.md (оценка REST vs MCP, аналоги).
- **Оценка MVP:** документ MVP_ASSESSMENT.md — можно ли было проще (да, прямой REST), аналоги (Telegram→Notion/Obsidian есть, Telegram→Anytype прямых аналогов не найдено).

## Приёмка

- [x] Запись в Inbox добавляет страницу в коллекцию Inbox DB при заданном ANYTYPE_INBOX_COLLECTION_ID.
- [x] Запрос «что в inbox» возвращает объекты из коллекции (через get-list-views + get-list-objects с view_id).
- [x] Документация обновлена (ROADMAP, MCP, intents, оценка и аналоги).
- [x] Изменения закоммичены.

## Контекст

- ROADMAP v1.1, docs/MVP_ASSESSMENT.md, docs/MCP_CONFIGURATION.md.
