# Disaster Recovery Module

Модуль для управления системой аварийного восстановления и обеспечения устойчивости инфраструктуры.

## Обзор

Модуль Disaster Recovery предоставляет комплексное решение для:

- Управления центрами обработки данных (ЦОД)
- Регионального резервирования и переключения
- Обеспечения сетевой устойчивости
- Географической маршрутизации
- Реагирования на инциденты
- Планирования мощностей
- Интеграции с A1 ICT сервисами

## Архитектура

```
disaster-recovery/
├── controllers/          # API контроллеры
├── services/            # Бизнес-логика
├── interfaces/          # TypeScript интерфейсы
├── dto/                 # Data Transfer Objects
├── disaster-recovery.module.ts  # Главный модуль
└── index.ts             # Экспорты
```

## Основные компоненты

### 1. DisasterRecoveryService

Управление центрами обработки данных:

- CRUD операции с ЦОД
- Проверка состояния здоровья
- Статистика и обзор системы

### 2. RegionalFailoverService

Региональное резервирование:

- Конфигурация failover
- Автоматическое и ручное переключение
- История failover операций

### 3. NetworkResilienceService

Сетевая устойчивость:

- Управление сетевыми линиями
- Мониторинг и проверка здоровья
- Альтернативные маршруты

### 4. GeographicRoutingService

Географическая маршрутизация:

- Определение оптимальных ЦОД
- Стратегии маршрутизации
- Анализ производительности

### 5. IncidentResponseService

Реагирование на инциденты:

- Управление инцидентами
- Планы восстановления
- Отслеживание действий

### 6. CapacityPlanningService

Планирование мощностей:

- Анализ потребностей
- Планы масштабирования
- Стресс-тестирование

### 7. A1IctServicesService

Интеграция с A1 ICT:

- DRaaS, BaaS, Tier III DC
- Управление запросами
- Расчет стоимости

## API Endpoints

### Data Centers

- `GET /disaster-recovery/data-centers` - Список всех ЦОД
- `GET /disaster-recovery/data-centers/:id` - ЦОД по ID
- `POST /disaster-recovery/data-centers` - Создание ЦОД
- `PUT /disaster-recovery/data-centers/:id` - Обновление ЦОД
- `DELETE /disaster-recovery/data-centers/:id` - Удаление ЦОД

### Regional Failover

- `GET /regional-failover/configs` - Конфигурации failover
- `POST /regional-failover/failover` - Запуск failover
- `POST /regional-failover/failback` - Запуск failback

### Network Resilience

- `GET /network-resilience/links` - Сетевые линии
- `POST /network-resilience/links/:id/health-check` - Проверка здоровья
- `POST /network-resilience/links/:id/monitor` - Запуск мониторинга

### Geographic Routing

- `POST /geographic-routing/optimal-dc` - Оптимальный ЦОД
- `GET /geographic-routing/routes` - Маршруты
- `POST /geographic-routing/simulate` - Симуляция маршрутизации

### Incident Response

- `GET /incident-response/incidents` - Инциденты
- `POST /incident-response/incidents` - Создание инцидента
- `PUT /incident-response/incidents/:id/actions` - Добавление действий

### Capacity Planning

- `GET /capacity-planning/plans` - Планы мощностей
- `POST /capacity-planning/analyze` - Анализ потребностей
- `POST /capacity-planning/stress-test` - Стресс-тест

### A1 ICT Services

- `GET /a1-ict-services/services` - Сервисы A1 ICT
- `POST /a1-ict-services/services/:id/requests` - Запросы на сервис
- `POST /a1-ict-services/services/:id/calculate-cost` - Расчет стоимости

## Использование

### Импорт модуля

```typescript
import { DisasterRecoveryModule } from './disaster-recovery';

@Module({
  imports: [DisasterRecoveryModule],
})
export class AppModule {}
```

### Использование сервиса

```typescript
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

## Конфигурация

Модуль использует `ConfigModule` для получения конфигурации. Основные параметры:

- `DR_DATA_CENTERS` - Конфигурация ЦОД по умолчанию
- `DR_FAILOVER_CONFIG` - Настройки failover
- `DR_NETWORK_LINKS` - Сетевые линии
- `DR_A1_ICT_SERVICES` - Сервисы A1 ICT

## Мониторинг

Все сервисы включают:

- Логирование операций
- Метрики производительности
- Проверки состояния здоровья
- Статистику использования

## Безопасность

- Валидация входных данных через Zod
- Типизация TypeScript
- Логирование всех операций
- Проверка прав доступа (требует реализации)

## Тестирование

Для тестирования доступны эндпоинты симуляции:

- `POST /disaster-recovery/simulate-failover`
- `POST /geographic-routing/simulate`
- `POST /incident-response/simulate-incident`
- `POST /capacity-planning/simulate-planning`
- `POST /a1-ict-services/simulate-service-request`

## Разработка

### Добавление нового сервиса

1. Создать интерфейс в `interfaces/`
2. Создать DTO в `dto/`
3. Создать сервис в `services/`
4. Создать контроллер в `controllers/`
5. Добавить в `disaster-recovery.module.ts`
6. Обновить `index.ts`

### Структура сервиса

```typescript
@Injectable()
export class ExampleService {
  private readonly logger = new Logger(ExampleService.name);

  async create(data: CreateExampleDto): Promise<IExample> {
    this.logger.log('Creating example');
    // Реализация
  }

  // Другие методы
}
```

## Лицензия

Внутренний модуль проекта.
