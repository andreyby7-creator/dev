# Gradual Rollout Service

## Назначение

Сервис для постепенного выкатывания новых функций по процентам пользователей с поддержкой целевой аудитории, временных условий и детальной аналитики rollout процесса.

## Основные возможности

- **Постепенное выкатывание** - выкатывание функций по процентам пользователей
- **Целевая аудитория** - фильтрация по ролям, средам, регионам
- **Временные условия** - ограничения по времени и датам
- **Метрики rollout** - отслеживание прогресса и статистики
- **Пауза/возобновление** - управление процессом rollout
- **Аналитика** - детальная статистика и прогнозы

## Ключевые интерфейсы

```typescript
interface RolloutRule {
  id: string;
  featureKey: string;
  percentage: number; // 0-100
  targetAudience: {
    userIds?: string[];
    roles?: string[];
    environments?: string[];
    regions?: string[];
    userSegments?: string[];
  };
  conditions?: {
    timeWindow?: {
      startTime: string; // формат HH:mm
      endTime: string; // формат HH:mm
      timezone: string;
    };
    dateRange?: {
      startDate: Date;
      endDate: Date;
    };
    customRules?: Record<string, unknown>;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface RolloutMetrics {
  totalUsers: number;
  enabledUsers: number;
  disabledUsers: number;
  conversionRate: number;
  errorRate: number;
  lastUpdated: Date;
}

interface RolloutEvent {
  type:
    | 'feature_enabled'
    | 'feature_disabled'
    | 'rollout_started'
    | 'rollout_completed'
    | 'rollout_paused';
  featureKey: string;
  userId?: string;
  ruleId: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}
```

## Основные методы

| Метод                                            | Описание                              |
| ------------------------------------------------ | ------------------------------------- |
| `createRolloutRule(ruleData)`                    | Создает новое правило rollout         |
| `getRolloutRule(ruleId)`                         | Получает правило rollout по ID        |
| `getActiveRolloutRules()`                        | Получает все активные правила rollout |
| `isFeatureEnabled(featureKey, userId, context?)` | Проверяет доступность функции         |
| `pauseRollout(featureKey)`                       | Приостанавливает rollout функции      |
| `resumeRollout(featureKey)`                      | Возобновляет rollout функции          |
| `updateRolloutRule(ruleId, updates)`             | Обновляет правило rollout             |
| `getRolloutMetrics(featureKey)`                  | Получает метрики rollout              |
| `getRolloutAnalytics(featureKey)`                | Получает детальную аналитику          |
| `getRolloutEvents(featureKey?, limit?)`          | Получает события rollout              |

## Примеры использования

### Создание правила rollout

```typescript
const rule = await gradualRolloutService.createRolloutRule({
  featureKey: 'new-ui-design',
  percentage: 25, // 25% пользователей
  targetAudience: {
    roles: ['premium', 'admin'],
    environments: ['production'],
  },
  conditions: {
    timeWindow: {
      startTime: '09:00',
      endTime: '18:00',
      timezone: 'Europe/Moscow',
    },
  },
  isActive: true,
});
```

### Проверка доступности функции

```typescript
const isEnabled = await gradualRolloutService.isFeatureEnabled(
  'new-ui-design',
  'user_456',
  {
    role: 'premium',
    environment: 'production',
    region: 'EU',
  }
);

if (isEnabled) {
  console.log('User has access to new UI design');
  renderNewUIDesign();
} else {
  console.log('User still sees old UI design');
  renderOldUIDesign();
}
```

### Управление rollout

```typescript
// Приостановить rollout
const paused = await gradualRolloutService.pauseRollout('new-ui-design');
if (paused) {
  console.log('Rollout paused successfully');
}

// Возобновить rollout
const resumed = await gradualRolloutService.resumeRollout('new-ui-design');
if (resumed) {
  console.log('Rollout resumed successfully');
}

// Обновить правило
const updatedRule = await gradualRolloutService.updateRolloutRule('rule_123', {
  percentage: 50, // увеличить до 50%
  conditions: {
    timeWindow: {
      startTime: '00:00',
      endTime: '23:59',
      timezone: 'UTC',
    },
  },
});
```

### Аналитика и метрики

```typescript
// Получить метрики rollout
const metrics = await gradualRolloutService.getRolloutMetrics('new-ui-design');
if (metrics) {
  console.log(`Total users: ${metrics.totalUsers}`);
  console.log(`Enabled users: ${metrics.enabledUsers}`);
  console.log(`Conversion rate: ${metrics.conversionRate.toFixed(2)}%`);
}

// Получить детальную аналитику
const analytics =
  await gradualRolloutService.getRolloutAnalytics('new-ui-design');
if (analytics) {
  console.log(`Current percentage: ${analytics.currentPercentage.toFixed(1)}%`);
  console.log(`Rollout duration: ${analytics.rolloutDuration} days`);
  console.log(
    `Estimated completion: ${analytics.estimatedCompletion.toDateString()}`
  );
  console.log(
    `Statistically significant: ${analytics.isStatisticallySignificant ? 'Yes' : 'No'}`
  );
}

// Получить события rollout
const events = await gradualRolloutService.getRolloutEvents(
  'new-ui-design',
  50
);
events.forEach(event => {
  console.log(
    `[${event.timestamp.toLocaleString()}] ${event.type}: ${event.featureKey}`
  );
});
```

## Конфигурация

### Переменные окружения

```bash
# Длительность rollout по умолчанию (дни)
GRADUAL_ROLLOUT_DEFAULT_DURATION=7

# Максимальный процент rollout
GRADUAL_ROLLOUT_MAX_PERCENTAGE=100

# Включить агрессивный rollout
GRADUAL_ROLLOUT_AGGRESSIVE=false

# Включить возможность rollback
GRADUAL_ROLLOUT_ENABLE_ROLLBACK=true

# Максимальное количество одновременных rollout
GRADUAL_ROLLOUT_MAX_CONCURRENT=10
```

### Инициализация

```typescript
import { GradualRolloutService } from './gradual-rollout.service';

@Injectable()
export class FeatureModule {
  constructor(private readonly gradualRollout: GradualRolloutService) {}
}
```

## Алгоритм назначения пользователей

### Консистентное хеширование

Сервис использует консистентное хеширование для назначения пользователей на варианты:

```typescript
// Алгоритм назначения
private shouldEnableFeature(rule: RolloutRule, userId: string): boolean {
  // Используем консистентное хеширование на основе userId и featureKey
  const hash = this.hashString(`${userId}_${rule.featureKey}`);
  const normalizedHash = hash % 100;

  // Пользователь получает функцию, если его хеш меньше процента
  return normalizedHash < rule.percentage;
}
```

### Преимущества

- **Консистентность**: один пользователь всегда попадает в одну группу
- **Равномерность**: равномерное распределение пользователей
- **Предсказуемость**: можно точно рассчитать, кто получит функцию

## Мониторинг и метрики

### Prometheus метрики

```typescript
// Количество активных rollout
gradual_rollout_active_total 3

// Процент rollout по функциям
gradual_rollout_percentage{feature_key="new-ui-design"} 25.0
gradual_rollout_percentage{feature_key="dark-mode"} 10.0

// Количество пользователей в rollout
gradual_rollout_users_total{feature_key="new-ui-design",status="enabled"} 1250
gradual_rollout_users_total{feature_key="new-ui-design",status="disabled"} 3750

// Время выполнения операций
gradual_rollout_operation_duration_seconds{operation="check_feature"} 0.001
gradual_rollout_operation_duration_seconds{operation="create_rule"} 0.005
```

### Health checks

```typescript
// Проверка состояния сервиса
const stats = gradualRolloutService.getServiceStats();
if (stats.activeRollouts < stats.maxConcurrentRollouts) {
  return {
    status: 'healthy',
    activeRollouts: stats.activeRollouts,
    maxRollouts: stats.maxConcurrentRollouts,
  };
} else {
  return {
    status: 'warning',
    message: 'Too many active rollouts',
    activeRollouts: stats.activeRollouts,
  };
}
```

## Безопасность

### Валидация данных

- Проверка корректности процентов (0-100)
- Валидация целевой аудитории
- Проверка временных условий

### Доступ

- Аутентификация пользователей
- Проверка прав на управление rollout
- Аудит всех операций

## Производительность

### Оптимизации

- Redis кеширование правил и метрик
- Локальный кеш активных rollout
- Асинхронная обработка метрик

### Масштабирование

- Поддержка множественных rollout
- Распределенная обработка метрик
- Автоматическая очистка старых данных

## Тестирование

### Unit тесты

```typescript
describe('GradualRolloutService', () => {
  it('should create rollout rule', async () => {
    const ruleData = createRuleData();
    const rule = await service.createRolloutRule(ruleData);

    expect(rule.featureKey).toBe(ruleData.featureKey);
    expect(rule.percentage).toBe(ruleData.percentage);
    expect(rule.isActive).toBe(true);
  });

  it('should assign user consistently', async () => {
    const result1 = await service.isFeatureEnabled('test-feature', 'user-1');
    const result2 = await service.isFeatureEnabled('test-feature', 'user-1');

    expect(result1).toBe(result2);
  });

  it('should respect percentage limits', async () => {
    const rule = await service.createRolloutRule({
      featureKey: 'test-feature',
      percentage: 0,
      targetAudience: {},
      isActive: true,
    });

    const result = await service.isFeatureEnabled('test-feature', 'user-1');
    expect(result).toBe(false);
  });
});
```

### Integration тесты

```typescript
describe('GradualRollout Integration', () => {
  it('should work with real Redis', async () => {
    const rule = await service.createRolloutRule(createRuleData());
    const isEnabled = await service.isFeatureEnabled(rule.featureKey, 'user-1');

    expect(isEnabled).toBeDefined();

    const metrics = await service.getRolloutMetrics(rule.featureKey);
    expect(metrics.totalUsers).toBeGreaterThan(0);
  });
});
```

## Troubleshooting

### Частые проблемы

1. **Пользователи не получают функции**
   - Проверить активность правила
   - Проверить целевую аудиторию
   - Проверить временные условия
   - Проверить процент rollout

2. **Неправильное распределение**
   - Проверить алгоритм хеширования
   - Проверить консистентность назначений
   - Проверить метрики

3. **Медленная работа**
   - Проверить Redis производительность
   - Оптимизировать кеширование
   - Использовать batch операции

### Логи и отладка

```typescript
// Включить debug логирование
const logger = new Logger(GradualRolloutService.name);
logger.setLogLevel('debug');

// Проверить состояние rollout
const rule = await gradualRolloutService.getRolloutRule(ruleId);
console.log('Rule status:', rule?.isActive ? 'Active' : 'Inactive');
console.log('Target audience:', rule?.targetAudience);
console.log('Conditions:', rule?.conditions);

// Проверить метрики
const metrics = await gradualRolloutService.getRolloutMetrics(featureKey);
console.log('Rollout metrics:', metrics);
```

## Заключение

`GradualRolloutService` предоставляет мощный инструмент для постепенного выкатывания новых функций с поддержкой целевой аудитории, временных условий и детальной аналитики. Сервис обеспечивает безопасное и контролируемое внедрение изменений, позволяя командам разработки минимизировать риски и максимизировать успех новых функций.
