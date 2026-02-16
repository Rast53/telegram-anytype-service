# SSH-ключ для Synology NAS

Скрипты деплоя (`sync-deploy`, `deploy-synology`, `deploy-nas`) используют `ssh` и `scp`. Без ключа при каждом запуске будет запрашиваться пароль — это неудобно для автоматизации.

**Рекомендация:** настроить вход по SSH-ключу один раз. Пароль в env не поддерживается (OpenSSH на Windows не умеет брать пароль из переменной; `sshpass`/`plink -pw` — небезопасно).

---

## Шаг 1. Включить User Home на Synology

1. Панель управления → **Пользователь и группа** → **Дополнительно**
2. Включить **Служба домашней папки пользователя**
3. Выбрать том (например, volume1) → **Применить**

## Шаг 2. Включить SSH

1. Панель управления → **Терминал и SNMP**
2. Включить **Служба SSH**
3. Порт (если меняли): 7022

## Шаг 3. Сгенерировать ключ на Windows

В PowerShell:

```powershell
# Ключ в ~/.ssh/id_ed25519 (или id_rsa)
ssh-keygen -t ed25519 -f $env:USERPROFILE\.ssh\id_ed25519 -N ""
```

С `-N ""` ключ создается без passphrase (для полностью неинтерактивного деплоя).

## Шаг 4. Скопировать ключ на NAS

**Вариант A — вручную (если ssh-copy-id недоступен):**

```powershell
# Показать публичный ключ (скопировать вывод)
Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub
```

Затем на NAS по SSH (пароль ввести один раз):

```powershell
ssh -p 7022 root@192.168.10.55
```

В сессии на NAS:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~
# Вставить содержимое id_ed25519.pub в authorized_keys (ваш реальный публичный ключ):
echo "<your_public_key_here>" >> ~/.ssh/authorized_keys
exit
```

**Вариант B — ssh-copy-id (если установлен в Git Bash / WSL):**

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub -p 7022 admin@192.168.10.55
```

## Шаг 5. Проверить вход без пароля

```powershell
ssh -p 7022 root@192.168.10.55 "echo OK"
```

Если выводится `OK` без запроса пароля — ключ настроен.

## Шаг 6. Добавить ключ в ssh-agent (если «Agent admitted failure»)

```powershell
# Запустить ssh-agent и добавить ключ
Start-Service ssh-agent
ssh-add $env:USERPROFILE\.ssh\id_ed25519
```

## Шаг 7. Привязать ключ к деплой-скриптам

В `deploy/.env.deploy` задайте путь к ключу:

```dotenv
DEPLOY_SSH_KEY_PATH=C:/Users/Ra/.ssh/id_ed25519_nas_deploy
```

Скрипты `sync-deploy`, `deploy-synology`, `deploy-nas`, `full-pipeline` автоматически используют этот ключ через `-i`.

---

## Если ключ не работает

- Проверить права на NAS: `~/.ssh` = 700, `~/.ssh/authorized_keys` = 600, `~` = 700
- Перезапустить SSH на Synology: Панель управления → Терминал и SNMP → выключить/включить SSH
- Убедиться, что в `authorized_keys` одна строка на ключ, без переносов

---

## Пароль в env (не рекомендуется)

На Windows OpenSSH не поддерживает передачу пароля из переменной. Варианты:

- **plink** (PuTTY): `plink -pw $env:DEPLOY_SSH_PASSWORD -P 7022 admin@192.168.10.55 "command"` — пароль в plaintext, небезопасно
- **sshpass** — только Linux/macOS

В скриптах проекта пароль из env не используется. Рекомендуется настроить SSH-ключ.
