# Интеграция Disaster Recovery модуля

## Быстрый старт

### 1. Импорт модуля

```typescript
// app.module.ts
import { DisasterRecoveryModule } from './disaster-recovery';

@Module({
  imports: [
    // ... другие модули
    DisasterRecoveryModule,
  ],
})
export class AppModule {}
```

### 2. Использование сервисов

```typescript
// example.controller.ts
import { DisasterRecoveryService } from './disaster-recovery';

@Controller('example')
export class ExampleController {
  constructor(
    private readonly disasterRecoveryService: DisasterRecoveryService
  ) {}

  @Get('data-centers')
  async getDataCenters() {
    return this.disasterRecoveryService.getAllDataCenters();
  }
}
```

## Доступные сервисы

### Основные сервисы

- `DisasterRecoveryService` - управление ЦОД
- `RegionalFailoverService` - региональное резервирование
- `NetworkResilienceService` - сетевая устойчивость
- `GeographicRoutingService` - географическая маршрутизация
- `IncidentResponseService` - реагирование на инциденты
- `CapacityPlanningService` - планирование мощностей
- `A1IctServicesService` - A1 ICT сервисы

### Импорт всех сервисов

```typescript
import {
  DisasterRecoveryService,
  RegionalFailoverService,
  NetworkResilienceService,
  GeographicRoutingService,
  IncidentResponseService,
  CapacityPlanningService,
  A1IctServicesService,
} from './disaster-recovery';
```

## API Endpoints

После интеграции модуля будут доступны следующие эндпоинты:

### Data Centers

- `GET /disaster-recovery/data-centers` - список всех ЦОД
- `GET /disaster-recovery/data-centers/:id` - ЦОД по ID
- `POST /disaster-recovery/data-centers` - создание ЦОД
- `PUT /disaster-recovery/data-centers/:id` - обновление ЦОД
- `DELETE /disaster-recovery/data-centers/:id` - удаление ЦОД

### Regional Failover

- `GET /regional-failover/configs` - конфигурации failover
- `POST /regional-failover/failover` - запуск failover
- `POST /regional-failover/failback` - запуск failback

### Network Resilience

- `GET /network-resilience/links` - сетевые линии
- `POST /network-resilience/links/:id/health-check` - проверка здоровья
- `POST /network-resilience/links/:id/monitor` - запуск мониторинга

### Geographic Routing

- `POST /geographic-routing/optimal-dc` - оптимальный ЦОД
- `GET /geographic-routing/routes` - маршруты
- `POST /geographic-routing/simulate` - симуляция маршрутизации

### Incident Response

- `GET /incident-response/incidents` - инциденты
- `POST /incident-response/incidents` - создание инцидента
- `PUT /incident-response/incidents/:id/actions` - добавление действий

### Capacity Planning

- `GET /capacity-planning/plans` - планы мощностей
- `POST /capacity-planning/analyze` - анализ потребностей
- `POST /capacity-planning/stress-test` - стресс-тест

### A1 ICT Services

- `GET /a1-ict-services/services` - сервисы A1 ICT
- `POST /a1-ict-services/services/:id/requests` - запросы на сервис
- `POST /a1-ict-services/services/:id/calculate-cost` - расчет стоимости

## Конфигурация

### Переменные окружения

```bash
# .env
DR_DATA_CENTERS=default
DR_FAILOVER_CONFIG=auto
DR_NETWORK_LINKS=primary
DR_A1_ICT_SERVICES=enabled
```

### Настройки по умолчанию

Модуль автоматически инициализирует:

- 3 ЦОД (Минск, Москва, Санкт-Петербург)
- Конфигурации failover
- Сетевые линии
- A1 ICT сервисы

## Тестирование

### Swagger документация

После запуска приложения доступна Swagger документация:

```
http://localhost:3000/api/docs
```

### Тестовые эндпоинты

Для тестирования доступны эндпоинты симуляции:

- `POST /disaster-recovery/simulate-failover`
- `POST /geographic-routing/simulate`
- `POST /incident-response/simulate-incident`
- `POST /capacity-planning/simulate-planning`
- `POST /a1-ict-services/simulate-service-request`

## Примеры использования

### Создание ЦОД

```typescript
const newDataCenter = await this.disasterRecoveryService.createDataCenter({
  name: 'Новый ЦОД',
  region: 'Европа',
  country: 'BY',
  coordinates: { latitude: 53.9, longitude: 27.6 },
  capacity: {
    cpu: 1000,
    memory: 2000,
    storage: 5000,
    network: 1000,
  },
});
```

### Запуск failover

```typescript
const failoverResult = await this.regionalFailoverService.performFailover(
  'primary-dc-id',
  'backup-dc-id',
  'automatic'
);
```

### Определение оптимального ЦОД

```typescript
const optimalDC =
  await this.geographicRoutingService.determineOptimalDataCenter(
    { latitude: 55.7558, longitude: 37.6176 },
    'nearest'
  );
```

### Создание инцидента

```typescript
const incident = await this.incidentResponseService.createIncident({
  title: 'Сбой сети',
  description: 'Потеря связи с основным ЦОД',
  severity: 'high',
  type: 'network',
});
```

## Мониторинг

### Health Checks

```typescript
// Проверка состояния системы
const health = await this.disasterRecoveryService.getSystemHealth();
```

### Статистика

```typescript
// Получение статистики
const stats = await this.disasterRecoveryService.getSystemStatistics();
```

## Обработка ошибок

Все сервисы включают обработку ошибок:

```typescript
try {
  const result =
    await this.disasterRecoveryService.getDataCenterById('invalid-id');
} catch (error) {
  // Обработка ошибки
  console.error('Data center not found:', error.message);
}
```

## Производительность

### Кеширование

Модуль использует встроенное кеширование NestJS для:

- Часто запрашиваемых данных
- Результатов вычислений
- Конфигураций

### Оптимизация

- Ленивая загрузка сервисов
- Асинхронные операции
- Пакетная обработка данных

## Безопасность

### Валидация

Все входные данные валидируются через Zod схемы:

- Автоматическая проверка типов
- Валидация бизнес-правил
- Защита от инъекций

### Логирование

Все операции логируются:

- Создание/обновление/удаление
- Выполнение критических операций
- Ошибки и исключения

## Поддержка

### Документация

- `README.md` - общая документация
- `interfaces/` - TypeScript интерфейсы
- `dto/` - схемы валидации
- Swagger API документация

### Примеры

Все сервисы включают примеры использования в комментариях и документации.

---

**Готово к использованию!** 🚀

Модуль полностью интегрирован и готов к работе в продакшен среде.
