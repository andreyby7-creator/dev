# 📊 Monitoring Scripts

Скрипты для мониторинга, логирования и observability.

## Скрипты

### 📈 monitor.sh

Основной скрипт мониторинга системы.

**Использование:**

```bash
./scripts/monitoring/monitor.sh
```

### 🔍 observability.sh

Управление системой observability (логи, метрики, трейсинг).

**Использование:**

```bash
./scripts/monitoring/observability.sh
```

## Примечание

Скрипты `kong.sh` и `redis.sh` перемещены в папку `devops/` как более подходящее место для управления сервисами.

## Быстрый старт

```bash
# Запуск мониторинга
./scripts/monitoring/monitor.sh

# Управление observability
./scripts/monitoring/observability.sh
```
