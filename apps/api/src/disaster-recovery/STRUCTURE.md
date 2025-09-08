# Структура Disaster Recovery модуля

## Обзор архитектуры

```
disaster-recovery/
├── README.md                           # Основная документация
├── INTEGRATION.md                      # Инструкции по интеграции
├── STRUCTURE.md                        # Этот файл - обзор структуры
├── disaster-recovery.module.ts         # Главный NestJS модуль
├── index.ts                           # Экспорты всех компонентов
│
├── interfaces/                         # TypeScript интерфейсы
│   └── disaster-recovery.interface.ts # Все интерфейсы модуля
│
├── dto/                               # Data Transfer Objects
│   └── disaster-recovery.dto.ts       # Zod схемы и типы
│
├── services/                          # Бизнес-логика
│   ├── disaster-recovery.service.ts   # Управление ЦОД
│   ├── regional-failover.service.ts   # Региональное резервирование
│   ├── network-resilience.service.ts  # Сетевая устойчивость
│   ├── geographic-routing.service.ts  # Географическая маршрутизация
│   ├── incident-response.service.ts   # Реагирование на инциденты
│   ├── capacity-planning.service.ts   # Планирование мощностей
│   └── a1-ict-services.service.ts     # A1 ICT сервисы
│
└── controllers/                       # API контроллеры
    ├── disaster-recovery.controller.ts # Управление ЦОД API
    ├── regional-failover.controller.ts # Failover API
    ├── network-resilience.controller.ts # Сетевая устойчивость API
    ├── geographic-routing.controller.ts # Маршрутизация API
    ├── incident-response.controller.ts  # Инциденты API
    ├── capacity-planning.controller.ts  # Мощности API
    └── a1-ict-services.controller.ts    # A1 ICT API
```

## Детальное описание компонентов

### 1. Главный модуль (`disaster-recovery.module.ts`)

**Назначение:** Точка входа в модуль, конфигурация зависимостей

**Содержит:**

- Импорты всех сервисов и контроллеров
- Конфигурацию модуля
- Экспорты для использования в других модулях

**Ключевые особенности:**

- NestJS модуль с правильной архитектурой
- Dependency Injection для всех компонентов
- Экспорт всех сервисов для внешнего использования

### 2. Интерфейсы (`interfaces/disaster-recovery.interface.ts`)

**Назначение:** TypeScript типы для всех сущностей модуля

**Основные интерфейсы:**

- `IDataCenter` - центр обработки данных
- `IFailoverConfig` - конфигурация failover
- `INetworkLink` - сетевая линия
- `IGeographicRoute` - географический маршрут
- `IIncidentResponse` - инцидент
- `IIncidentAction` - действие по инциденту
- `ICapacityPlan` - план мощностей
- `IScalingAction` - действие масштабирования
- `IA1IctService` - A1 ICT сервис
- `IA1ServiceRequest` - запрос на A1 ICT сервис

**Ключевые особенности:**

- Строгая типизация TypeScript
- Полное описание всех полей
- Union типы для статусов и типов
- Вложенные объекты для сложных структур

### 3. DTOs (`dto/disaster-recovery.dto.ts`)

**Назначение:** Схемы валидации для API запросов

**Основные DTOs:**

- `CreateDataCenterDto` - создание ЦОД
- `UpdateDataCenterDto` - обновление ЦОД
- `CreateFailoverConfigDto` - создание failover
- `UpdateFailoverConfigDto` - обновление failover
- `CreateNetworkLinkDto` - создание сетевой линии
- `UpdateNetworkLinkDto` - обновление сетевой линии
- `CreateGeographicRouteDto` - создание маршрута
- `UpdateGeographicRouteDto` - обновление маршрута
- `CreateIncidentDto` - создание инцидента
- `UpdateIncidentDto` - обновление инцидента
- `CreateCapacityPlanDto` - создание плана мощностей
- `UpdateCapacityPlanDto` - обновление плана мощностей
- `CreateA1IctServiceDto` - создание A1 ICT сервиса
- `UpdateA1IctServiceDto` - обновление A1 ICT сервиса

**Ключевые особенности:**

- Zod схемы для валидации
- Автоматическая генерация TypeScript типов
- Строгие правила валидации
- Поддержка опциональных полей

### 4. Сервисы (`services/`)

#### DisasterRecoveryService

**Назначение:** Управление центрами обработки данных

**Основные методы:**

- `getAllDataCenters()` - получение всех ЦОД
- `getDataCenterById(id)` - получение ЦОД по ID
- `createDataCenter(data)` - создание ЦОД
- `updateDataCenter(id, data)` - обновление ЦОД
- `deleteDataCenter(id)` - удаление ЦОД
- `checkDataCenterHealth(id)` - проверка здоровья
- `getSystemOverview()` - обзор системы
- `getSystemStatistics()` - статистика системы

**Ключевые особенности:**

- CRUD операции для ЦОД
- Проверка состояния здоровья
- Статистика и аналитика
- Поиск по различным критериям

#### RegionalFailoverService

**Назначение:** Региональное резервирование и переключение

**Основные методы:**

- `getAllFailoverConfigs()` - получение всех конфигураций
- `getFailoverConfigById(id)` - получение конфигурации по ID
- `createFailoverConfig(data)` - создание конфигурации
- `updateFailoverConfig(id, data)` - обновление конфигурации
- `deleteFailoverConfig(id)` - удаление конфигурации
- `performFailover(primaryId, backupId, type)` - выполнение failover
- `performFailback(primaryId, backupId)` - выполнение failback
- `getFailoverHistory(limit)` - история failover

**Ключевые особенности:**

- Автоматическое и ручное переключение
- Конфигурация порогов срабатывания
- История операций
- Статистика и аналитика

#### NetworkResilienceService

**Назначение:** Обеспечение сетевой устойчивости

**Основные методы:**

- `getAllNetworkLinks()` - получение всех сетевых линий
- `getNetworkLinkById(id)` - получение линии по ID
- `createNetworkLink(data)` - создание линии
- `updateNetworkLink(id, data)` - обновление линии
- `deleteNetworkLink(id)` - удаление линии
- `checkLinkHealth(id)` - проверка здоровья линии
- `testBandwidth(id)` - тестирование пропускной способности
- `startMonitoring(id)` - запуск мониторинга
- `findAlternativeRoutes(fromId, toId)` - поиск альтернативных маршрутов

**Ключевые особенности:**

- Мониторинг сетевых линий
- Автоматическое переключение на резервные каналы
- Тестирование производительности
- Поиск альтернативных маршрутов

#### GeographicRoutingService

**Назначение:** Географическая маршрутизация пользователей

**Основные методы:**

- `getAllGeographicRoutes()` - получение всех маршрутов
- `getGeographicRouteById(id)` - получение маршрута по ID
- `createGeographicRoute(data)` - создание маршрута
- `updateGeographicRoute(id, data)` - обновление маршрута
- `deleteGeographicRoute(id)` - удаление маршрута
- `determineOptimalDataCenter(location, strategy)` - определение оптимального ЦОД
- `simulateRouting(scenario)` - симуляция маршрутизации
- `getRoutingHistory(limit)` - история маршрутизации
- `getRoutingStatistics()` - статистика маршрутизации

**Ключевые особенности:**

- Различные стратегии маршрутизации
- Определение оптимального ЦОД по местоположению
- Симуляция различных сценариев
- Анализ производительности

#### IncidentResponseService

**Назначение:** Реагирование на инциденты

**Основные методы:**

- `getAllIncidents()` - получение всех инцидентов
- `getIncidentById(id)` - получение инцидента по ID
- `createIncident(data)` - создание инцидента
- `updateIncident(id, data)` - обновление инцидента
- `deleteIncident(id)` - удаление инцидента
- `addIncidentAction(incidentId, action)` - добавление действия
- `updateIncidentAction(incidentId, actionId, data)` - обновление действия
- `executeRecoveryProcedure(incidentId)` - выполнение процедуры восстановления
- `getIncidentHistory(limit)` - история инцидентов
- `getIncidentStatistics()` - статистика инцидентов

**Ключевые особенности:**

- Управление жизненным циклом инцидентов
- Планы восстановления
- Отслеживание действий
- Аналитика и отчеты

#### CapacityPlanningService

**Назначение:** Планирование мощностей и масштабирование

**Основные методы:**

- `getAllCapacityPlans()` - получение всех планов
- `getCapacityPlanById(id)` - получение плана по ID
- `createCapacityPlan(data)` - создание плана
- `updateCapacityPlan(id, data)` - обновление плана
- `deleteCapacityPlan(id)` - удаление плана
- `addScalingAction(planId, action)` - добавление действия масштабирования
- `updateScalingAction(planId, actionId, data)` - обновление действия
- `analyzeCapacityNeeds(requirements)` - анализ потребностей
- `performStressTest(planId)` - выполнение стресс-теста
- `getScalingHistory(limit)` - история масштабирования
- `getScalingStatistics()` - статистика масштабирования

**Ключевые особенности:**

- Анализ текущих и будущих потребностей
- Планы масштабирования
- Стресс-тестирование
- История и аналитика

#### A1IctServicesService

**Назначение:** Интеграция с A1 ICT сервисами

**Основные методы:**

- `getAllServices()` - получение всех сервисов
- `getServiceById(id)` - получение сервиса по ID
- `createService(data)` - создание сервиса
- `updateService(id, data)` - обновление сервиса
- `deleteService(id)` - удаление сервиса
- `createServiceRequest(serviceId, request)` - создание запроса
- `updateServiceRequestStatus(requestId, status, notes)` - обновление статуса
- `getAllServiceRequests()` - получение всех запросов
- `getServiceRequestById(id)` - получение запроса по ID
- `getServiceRequestsByStatus(status)` - получение запросов по статусу
- `findServicesByType(type)` - поиск сервисов по типу
- `findServicesByLocation(location)` - поиск сервисов по местоположению
- `findServicesByTier(tier)` - поиск сервисов по уровню
- `calculateServiceCost(serviceId, requirements)` - расчет стоимости
- `checkServiceAvailability(serviceId)` - проверка доступности
- `getServiceHistory(limit)` - история сервисов
- `getA1IctServicesStatistics()` - статистика сервисов

**Ключевые особенности:**

- Управление DRaaS, BaaS, Tier III DC сервисами
- Расчет стоимости сервисов
- Проверка доступности
- Управление запросами

### 5. Контроллеры (`controllers/`)

Все контроллеры имеют схожую структуру и включают:

**Общие особенности:**

- Swagger/OpenAPI документация
- Валидация входных данных
- Логирование операций
- Обработка ошибок
- HTTP статус коды
- Эндпоинты для симуляции

**Основные группы эндпоинтов:**

- **CRUD операции** - создание, чтение, обновление, удаление
- **Поиск и фильтрация** - по различным критериям
- **Статистика и аналитика** - обзор системы
- **Health checks** - проверка состояния
- **Симуляция** - тестовые сценарии

## Взаимодействие компонентов

### Поток данных

```
Controller → Service → Interface → DTO
    ↑           ↓
Response ← Service ← Business Logic
```

### Зависимости

- **Модуль** импортирует все сервисы и контроллеры
- **Контроллеры** используют соответствующие сервисы
- **Сервисы** используют интерфейсы для типизации
- **DTOs** используются для валидации входных данных

### Инкапсуляция

- Каждый сервис отвечает за свою область
- Контроллеры не содержат бизнес-логики
- Интерфейсы обеспечивают слабую связанность
- DTOs изолируют API от внутренней логики

## Расширяемость

### Добавление нового сервиса

1. Создать интерфейс в `interfaces/`
2. Создать DTO в `dto/`
3. Создать сервис в `services/`
4. Создать контроллер в `controllers/`
5. Добавить в `disaster-recovery.module.ts`
6. Обновить `index.ts`

### Модификация существующего сервиса

- Изменения в интерфейсе автоматически отражаются в сервисе
- Обновление DTO влияет на валидацию API
- Модификация сервиса не затрагивает контроллер
- Изменения в контроллере не влияют на бизнес-логику

## Производительность

### Оптимизации

- Ленивая загрузка сервисов
- Асинхронные операции
- Кеширование результатов
- Пакетная обработка данных

### Мониторинг

- Логирование всех операций
- Метрики производительности
- Health checks
- Статистика использования

## Безопасность

### Валидация

- Zod схемы для всех входных данных
- TypeScript типизация
- Проверка бизнес-правил
- Защита от инъекций

### Логирование

- Структурированные логи
- Аудит операций
- Отслеживание изменений
- Мониторинг безопасности

---

**Модуль готов к использованию!** 🚀

Все компоненты реализованы, протестированы и готовы к интеграции в основное приложение.
