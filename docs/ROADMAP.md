# Roadmap

## v1 (реализовано)

- single-tenant self-hosted mode
- capture/retrieve сценарии для Inbox и планов дня
- Anytype via MCP (`stdio` / `http`)
- совместимость legacy и API-prefixed MCP tool names (`search-space`/`API-search-space` и т.д.)
- rules-first intent routing (понятные запросы без LLM)
- OpenRouter classifier как fallback при неочевидных запросах
- базовая production-надежность и документация

## v1.1 (ближайшие улучшения)

- richer parsing планов (дедлайны, приоритеты, теги)
- подтверждение перед risky update
- admin-команда статуса очереди и последних ошибок
- preflight-check перед деплоем: проверка Anytype API key + `ANYTYPE_SPACE_ID`

## v1.2 (упрощение self-host bootstrap)

- единый скрипт `setup-anytype-nas.ps1` (install + auth + apikey + space join + env hints)
- автопроверка headless Anytype API после reboot NAS
- минимизация ручных шагов по `anytype-cli` и network config
- документированный recovery-путь для `DeadlineExceeded` на `anytype auth create`

## v2 (agent layer)

- tool-calling агент поверх MCP:
  - plan -> call tool -> observe -> next step
  - работа по "карте контекста" в Anytype
  - управляемые guardrails (budget, max steps, safe write zones)
- multi-tenant архитектура
- pluggable storage providers (другие MCP хранилища)
- event-sourcing и расширенная аналитика

## Open-source readiness

- англоязычный docs-pack
- шаблоны issue/PR
- пример деплоя в Docker Swarm и Kubernetes
- интеграция с issue-трекером, где агент может:
  - заводить задачу
  - ссылаться на номер задачи в коммите/PR
  - синхронизировать статус задачи по PR lifecycle
