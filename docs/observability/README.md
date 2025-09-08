# Система наблюдаемости

## Обзор

Комплексное решение для мониторинга приложений, логирования и трассировки. Включает централизованное логирование (ELK Stack), метрики активности пользователей, дашборды и распределенную трассировку (Jaeger).

## Архитектура

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Frontend  │    │   API Server    │    │  Observability  │
│   (Port 3000)   │◄──►│   (Port 3001)   │◄──►│     Stack       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Supabase DB   │
                       └─────────────────┘
```

## Компоненты

### 1. Сервис логирования

- Централизованное логирование всех событий
- Структурированные логи в формате JSON
- Интеграция с Elasticsearch (мок)
- Ротация и очистка логов

### 2. Сервис метрик

- Системные метрики (CPU, память, диск)
- Бизнес-метрики (DAU/MAU, конверсия, доход)
- Отслеживание активности пользователей
- Формат, совместимый с Prometheus

### 3. Сервис дашбордов

- Системные дашборды (CPU, память, запросы, ошибки)
- Бизнес-дашборды (пользователи, доход, конверсия)
- Настраиваемые виджеты
- Данные и графики в реальном времени

### 4. Сервис Jaeger

- Распределенная трассировка
- Отслеживание запросов между сервисами
- Анализ производительности
- Мок-реализация для разработки

### 5. Сервис Elasticsearch

- Централизованное хранение логов
- Поиск и фильтрация
- Агрегация данных
- Мок-реализация

## Быстрый старт

### Запуск системы

```bash
cd /home/boss/Projects/dev
./scripts/start-all.sh
```

### Проверка статуса

```bash
./scripts/monitor.sh status
```

### Остановка системы

```bash
./scripts/stop-all.sh
```

## API эндпоинты

### Здоровье и статус

- `GET /observability/health` - Проверка здоровья системы
- `GET /observability/test/status` - Общий статус компонентов

### Метрики

- `GET /observability/metrics` - Все метрики в формате JSON
- `GET /observability/metrics/prometheus` - Метрики в формате Prometheus

### Дашборды

- `GET /observability/dashboard/system` - Системный дашборд
- `GET /observability/dashboard/business` - Бизнес-дашборд
- `GET /observability/dashboard` - Список всех дашбордов

### Логи

- `GET /observability/logs` - Получение логов
- `DELETE /observability/logs` - Очистка логов

### Трассировка

- `GET /observability/traces` - Получение трассировки
- `DELETE /observability/traces` - Очистка трассировки

### Jaeger

- `GET /observability/jaeger/health` - Проверка здоровья Jaeger
- `GET /observability/jaeger/traces` - Поиск трассировки
- `POST /observability/jaeger/test` - Тестирование трассировки

### Elasticsearch

- `GET /observability/elasticsearch/health` - Проверка здоровья Elasticsearch
- `GET /observability/elasticsearch/logs` - Поиск логов

### Тестирование

- `POST /observability/test/comprehensive` - Комплексное тестирование
- `POST /observability/test/load-simulation` - Симуляция нагрузки
- `POST /observability/test/metrics-generation` - Генерация тестовых метрик

## Метрики

### Системные метрики

- Использование CPU
- Использование памяти
- Использование диска
- Средняя нагрузка
- Активные соединения
- Время ответа

### Бизнес-метрики

- Ежедневные активные пользователи (DAU)
- Ежемесячные активные пользователи (MAU)
- Коэффициент конверсии
- Доход
- Тренды активности пользователей
- Объем транзакций

### Активность пользователей

- Просмотры страниц
- Клики
- Сессии
- Транзакции
- Частота ошибок

## Дашборды

### Системный дашборд

- Графики CPU и памяти
- Частота запросов
- Частота ошибок
- Статус здоровья
- Производительность системы

### Бизнес-дашборд

- Графики DAU/MAU
- Тренды дохода
- Воронка конверсии
- Активность пользователей
- Бизнес KPI

## Тестирование

### Автоматические тесты

```bash
./scripts/observability.sh test
```

### Генерация тестовых данных

```bash
./scripts/observability.sh generate
```

### Комплексное тестирование

```bash
curl -X POST http://localhost:3001/observability/test/comprehensive
```

## Логирование

### Уровни логов

- `ERROR` - Критические ошибки
- `WARN` - Предупреждения
- `INFO` - Информационные сообщения
- `DEBUG` - Отладочная информация

### Структура логов

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "INFO",
  "message": "Запрос обработан",
  "service": "api",
  "userId": "123",
  "requestId": "abc-123",
  "duration": 150,
  "statusCode": 200
}
```

## Трассировка

### Структура span

```json
{
  "traceId": "abc-123-def-456",
  "spanId": "span-789",
  "operationName": "GET /users",
  "startTime": "2024-01-01T12:00:00.000Z",
  "duration": 150,
  "tags": {
    "http.method": "GET",
    "http.status_code": 200
  }
}
```

## Конфигурация

### Переменные окружения

```env
# Конфигурация API
API_PORT=3001
NODE_ENV=development

# Конфигурация наблюдаемости
LOG_LEVEL=info
METRICS_ENABLED=true
TRACING_ENABLED=true
DASHBOARD_ENABLED=true

# Конфигурация Elasticsearch (Мок)
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_INDEX=logs

# Конфигурация Jaeger (Мок)
JAEGER_URL=http://localhost:16686
```

## Устранение неполадок

### Распространенные проблемы

1. **Сервисы не запускаются** - Проверьте порты и зависимости
2. **Метрики не обновляются** - Проверьте конфигурацию
3. **Логи не записываются** - Проверьте права доступа
4. **Дашборды не загружаются** - Проверьте API эндпоинты

### Диагностика

```bash
# Проверка статуса
./scripts/monitor.sh status

# Просмотр логов
./scripts/monitor.sh logs

# Проверка оповещений
./scripts/monitor.sh alerts
```

## Дополнительная документация

- [INSTALLATION.md](./INSTALLATION.md) - Руководство по установке
- [USAGE.md](./USAGE.md) - Детальное руководство по использованию
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Руководство по устранению неполадок

## Поддержка

При возникновении проблем:

1. Проверьте логи: `./scripts/monitor.sh logs`
2. Запустите диагностику: `./scripts/monitor.sh status`
3. Обратитесь к руководству по устранению неполадок
4. Проверьте конфигурацию и переменные окружения
