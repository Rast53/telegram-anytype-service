# GitHub Issues + Projects + PR workflow

Как вести задачи, коммиты и код в репозитории так, чтобы агент и человек могли работать по одной схеме: задача → ветка → коммит с номером → PR → мерж.

## 1. Заводим задачу (Issue)

- **GitHub → Issues → New issue** (или шаблон: Bug report / Feature request).
- Пишем название и описание, при необходимости — чек-лист приёмки.
- Issue получает номер, например `#3`.

Использование:
- Ты создаёшь issue вручную и даёшь агенту: «сделай по #3».
- Агент может описать задачу и попросить тебя создать issue, либо ты создаёшь issue сам и указываешь номер.

## 2. Ветка от задачи

- От `master` создаётся ветка. Рекомендуемый формат: `issue-3-short-name` или `3-short-name`.
- В Cursor/терминале:
  ```bash
  git fetch origin
  git checkout -b issue-3-setup-anytype-nas origin/master
  ```

## 3. Коммиты со ссылкой на issue

В сообщении коммита или в описании PR пишем:
- `fixes #3` или `closes #3` — тогда при мерже PR в `master` issue автоматически закроется.
- `refs #3`, `see #3` — просто ссылка, без автозакрытия.

Пример:
```
feat(scripts): add setup-anytype-nas bootstrap script

Ref: docs/NAS_ANYTYPE_BOOTSTRAP.md
fixes #3
```

## 4. Pull Request

- Пушим ветку: `git push -u origin issue-3-setup-anytype-nas`.
- В GitHub: **Pull requests → New pull request**, база `master`, compare — наша ветка.
- В описании PR указываем `fixes #3` (или `closes #3`), чтобы при мерже закрылся issue.
- После ревью (или сразу, если один разработчик) — **Merge pull request**.

## 5. Projects (канбан, опционально)

- **GitHub → Projects → New project** → выбрать шаблон (Board или Table).
- В настройках проекта включить связь с репозиторием и полем **Status** (или свои поля).
- В настройках колонок можно привязать статус к issue: например, **Todo** / **In Progress** / **Done**.
- Когда создаётся issue, его можно добавить на доску; при закрытии issue карточка переходит в Done (если настроено).

Так ты в GUI видишь задачи, а агент может ориентироваться по номерам issue в коммитах и PR.

## 6. Как с этим работать тебе

| Действие | Где |
|----------|-----|
| Завести задачу | Issues → New issue (или шаблон Bug/Feature) |
| Посмотреть открытые задачи | Issues (фильтр open), при наличии — Projects |
| Взять задачу в работу | Создать ветку `issue-N-title`, в коммитах писать `fixes #N` |
| Смержить и закрыть задачу | PR в `master` с `fixes #N` → Merge → issue закроется |
| Найти коммиты по задаче | В issue внизу видны связанные коммиты и PR |

## 7. Как с этим работать агенту

- Ты даёшь задачу текстом или номером issue: «сделай #5» или «реализуй то, что в #5».
- Агент создаёт ветку от `master`, делает коммиты с `fixes #5` в сообщении, пушит и может предложить тебе открыть PR (или открыть его сам, если есть права).
- В PR в описании указать `fixes #5`, чтобы при мерже issue закрылся.
- Для трекинга: в начале ответа агент может написать «Working on #5» и в конце — «Ready for PR, branch `issue-5-...`, fixes #5».

## 8. Краткий чек-лист на задачу

1. Создать issue (или взять существующий).
2. `git checkout -b issue-N-korotkoe-imya origin/master`.
3. Разработка, коммиты с `fixes #N` в сообщении.
4. `git push -u origin issue-N-korotkoe-imya`.
5. Создать PR в `master`, в описании — `fixes #N`.
6. После мержа — issue закроется, ветку можно удалить.

Репозиторий: [Rast53/telegram-anytype-service](https://github.com/Rast53/telegram-anytype-service).
