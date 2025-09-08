# 📁 Scripts - SaleSpot BY

Организованная коллекция скриптов для разработки, тестирования, развертывания и обслуживания платформы SaleSpot BY.

## 🏗️ Структура скриптов

### 🚀 [Development](./development/)

Скрипты для разработки и локального запуска

- **[start-dev.sh](./development/start-dev.sh)** - Быстрый запуск API и Web серверов
- **[start-all.sh](./development/start-all.sh)** - Запуск всех сервисов с проверкой портов
- **[stop-all.sh](./development/stop-all.sh)** - Остановка всех сервисов
- **[restart-all.sh](./development/restart-all.sh)** - Перезапуск всех сервисов

### 🧪 [Testing](./testing/)

Скрипты для тестирования и проверки качества

- **[check-errors.sh](./testing/check-errors.sh)** - Проверка TypeScript и ESLint ошибок
- **[check-quality.sh](./testing/check-quality.sh)** - Анализ качества кода с детальной статистикой
- **[quality-gates.sh](./testing/quality-gates.sh)** - Проверка качества перед развертыванием
- **[test-docker.sh](./testing/test-docker.sh)** - Тестирование Docker контейнеров

### 🔧 [Maintenance](./maintenance/)

Скрипты для обслуживания и очистки

- **[docker-cleanup.sh](./maintenance/docker-cleanup.sh)** - Очистка Docker ресурсов
- **[performance-check.sh](./maintenance/performance-check.sh)** - Проверка производительности
- **[stop-ports.sh](./maintenance/stop-ports.sh)** - Освобождение портов 3000 и 3001

### 🚀 [Deployment](./deployment/)

Скрипты для развертывания

- **[blue-green-deploy.sh](./deployment/blue-green-deploy.sh)** - Blue-green развертывание
- **[environment-parity.sh](./deployment/environment-parity.sh)** - Проверка соответствия окружений
- **[rollback.sh](./deployment/rollback.sh)** - Откат развертывания

### 🔒 [Security](./security/)

Скрипты для безопасности

- **[security-scan.sh](./security/security-scan.sh)** - Сканирование уязвимостей и проверка зависимостей

### 📊 [Monitoring](./monitoring/)

Скрипты для мониторинга

- **[monitor.sh](./monitoring/monitor.sh)** - Системный мониторинг
- **[observability.sh](./monitoring/observability.sh)** - Наблюдаемость системы
- **[redis.sh](./monitoring/redis.sh)** - Мониторинг Redis

### 🛠️ [DevOps](./devops/)

Скрипты для DevOps операций

- **[kong.sh](./devops/kong.sh)** - Управление Kong Gateway
- **[redis.sh](./devops/redis.sh)** - Управление Redis
- **[status.sh](./devops/status.sh)** - Статус сервисов
- **[terraform-apply.sh](./devops/terraform-apply.sh)** - Применение Terraform
- **[terraform-init.sh](./devops/terraform-init.sh)** - Инициализация Terraform

### 💾 [Backup](./backup/)

Скрипты для резервного копирования

- **[automated-backup.sh](./backup/automated-backup.sh)** - Автоматическое резервное копирование
- **[create-backup.sh](./backup/create-backup.sh)** - Создание резервной копии
- **[create-clean-backup.sh](./backup/create-clean-backup.sh)** - Создание чистой резервной копии
- **[restore-from-backup.sh](./backup/restore-from-backup.sh)** - Восстановление из резервной копии

### 🚨 [Disaster Recovery](./disaster-recovery/)

Скрипты для аварийного восстановления

- **[auto-failover.sh](./disaster-recovery/auto-failover.sh)** - Автоматический failover
- **[restore-database.sh](./disaster-recovery/restore-database.sh)** - Восстановление базы данных
- **[restore-files.sh](./disaster-recovery/restore-files.sh)** - Восстановление файлов
- **[restore-volumes.sh](./disaster-recovery/restore-volumes.sh)** - Восстановление томов
- **[test-dr-plan.sh](./disaster-recovery/test-dr-plan.sh)** - Тестирование плана DR

### 🎯 [Quality](./quality/)

Скрипты для обеспечения качества кода

- **[bundle-optimizer.sh](./quality/bundle-optimizer.sh)** - Оптимизация бандла
- **[clean-code.sh](./quality/clean-code.sh)** - Очистка кода
- **[code-captain.sh](./quality/code-captain.sh)** - Главный скрипт качества
- **[fix-eslint-warnings.sh](./quality/fix-eslint-warnings.sh)** - Исправление ESLint предупреждений
- **[import-optimizer.sh](./quality/import-optimizer.sh)** - Оптимизация импортов

### 🔄 [Codemods](./codemods/)

Скрипты для массовых изменений кода

- **[codemods.sh](./codemods.sh)** - Главный скрипт codemods
- **[add-types.js](./codemods/add-types.js)** - Добавление типов
- **[any-to-unknown.js](./codemods/any-to-unknown.js)** - Замена any на unknown
- **[import-optimization.js](./codemods/import-optimization.js)** - Оптимизация импортов

## 🚀 Быстрый старт

### Разработка

```bash
# Запуск всех сервисов для разработки
./development/start-dev.sh

# Проверка качества кода
./testing/check-quality.sh

# Остановка всех сервисов
./development/stop-all.sh
```

### Тестирование

```bash
# Проверка ошибок TypeScript и ESLint
./testing/check-errors.sh

# Полный анализ качества
./testing/check-quality.sh

# Проверка качества перед развертыванием
./testing/quality-gates.sh
```

### Обслуживание

```bash
# Очистка Docker ресурсов
./maintenance/docker-cleanup.sh

# Проверка производительности
./maintenance/performance-check.sh

# Освобождение портов
./maintenance/stop-ports.sh
```

### Мониторинг

```bash
# Системный мониторинг
./monitoring/monitor.sh status

# Наблюдаемость
./monitoring/observability.sh

# Мониторинг Redis
./monitoring/redis.sh
```

### Безопасность

```bash
# Сканирование уязвимостей
./security/security-scan.sh
```

## 📋 Основные команды

### Development

- `./development/start-dev.sh` - Запуск разработки
- `./development/stop-all.sh` - Остановка сервисов
- `./development/restart-all.sh` - Перезапуск

### Testing

- `./testing/check-errors.sh` - Проверка ошибок
- `./testing/check-quality.sh` - Анализ качества
- `./testing/quality-gates.sh` - Quality gates

### Maintenance

- `./maintenance/docker-cleanup.sh` - Очистка Docker
- `./maintenance/performance-check.sh` - Проверка производительности
- `./maintenance/stop-ports.sh` - Освобождение портов

### Monitoring

- `./monitoring/monitor.sh status` - Статус системы
- `./monitoring/monitor.sh metrics` - Метрики
- `./monitoring/monitor.sh watch` - Непрерывный мониторинг

## 🔧 Настройка

### Права доступа

Все скрипты имеют права на выполнение:

```bash
chmod +x development/*.sh
chmod +x testing/*.sh
chmod +x maintenance/*.sh
```

### Зависимости

Некоторые скрипты требуют дополнительных инструментов:

- `jscodeshift` - для codemods
- `trivy` - для сканирования уязвимостей
- `depcheck` - для проверки зависимостей

## 📊 Статус скриптов

### ✅ Рабочие скрипты

- Все скрипты development
- Все скрипты testing
- Все скрипты maintenance
- Все скрипты monitoring
- Все скрипты security
- Все скрипты backup
- Все скрипты disaster-recovery

### 🔧 Требуют настройки

- Некоторые скрипты deployment (требуют настройки окружения)
- Некоторые скрипты devops (требуют настройки инфраструктуры)

## 🚨 Устранение неполадок

### Проблемы с портами

```bash
# Освобождение портов
./maintenance/stop-ports.sh

# Проверка занятых портов
lsof -i :3000
lsof -i :3001
```

### Проблемы с Docker

```bash
# Очистка Docker
./maintenance/docker-cleanup.sh

# Проверка контейнеров
docker ps -a
```

### Проблемы с качеством кода

```bash
# Проверка ошибок
./testing/check-errors.sh

# Исправление ESLint
./quality/fix-eslint-warnings.sh

# Очистка кода
./quality/clean-code.sh
```

## 📝 Логи

### Логи разработки

- API: `/tmp/api.log`
- Web: `/tmp/web.log`

### Логи мониторинга

- Системные метрики: `./monitoring/monitor.sh metrics`
- Логи приложения: `./monitoring/monitor.sh logs`

## 🔄 Обновления

Скрипты обновляются по мере развития проекта. Основные изменения:

- **Сентябрь 2025**: Реорганизация структуры скриптов
- **Сентябрь 2025**: Удаление дублей и оптимизация
- **Сентябрь 2025**: Исправление путей и улучшение работоспособности

## 🤝 Участие в разработке

### Добавление новых скриптов

1. Выберите подходящую категорию
2. Следуйте существующим соглашениям именования
3. Добавьте права на выполнение: `chmod +x script.sh`
4. Обновите этот README

### Стандарты скриптов

- Используйте `#!/bin/bash` и `set -e`
- Добавляйте цветной вывод для лучшего UX
- Включайте справку с `--help`
- Обрабатывайте ошибки gracefully

---

**Статус**: ✅ Все скрипты протестированы и работают  
**Последнее обновление**: Сентябрь 2025  
**Следующий этап**: Автоматизация и CI/CD интеграция
