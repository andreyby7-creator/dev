# A/B Testing Service

## Назначение

Сервис для проведения A/B тестов с поддержкой вариантов, метрик, статистической значимости и аналитики результатов.

## Основные возможности

- **Создание тестов** - настройка вариантов и целевой аудитории
- **Назначение пользователей** - консистентное распределение по вариантам
- **Запись метрик** - impressions, конверсии, revenue
- **Статистическая значимость** - анализ результатов тестов
- **Аналитика** - детальная статистика и отчеты
- **Автоматическая оптимизация** - настройка весов вариантов

## Ключевые интерфейсы

```typescript
interface ABTestVariant {
  id: string;
  name: string;
  weight: number; // процент от 0 до 100
  config: Record<string, unknown>;
  isActive: boolean;
}

interface ABTest {
  id: string;
  name: string;
  description?: string;
  variants: ABTestVariant[];
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  targetAudience?: {
    userIds?: string[];
    roles?: string[];
    environments?: string[];
    percentage?: number;
  };
  metrics: {
    impressions: number;
    conversions: number;
    revenue: number;
  };
}

interface ABTestResult {
  variantId: string;
  variantName: string;
  impressions: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  revenuePerUser: number;
  statisticalSignificance: number;
}
```

## Основные методы

| Метод                                                   | Описание                          |
| ------------------------------------------------------- | --------------------------------- |
| `createTest(testData)`                                  | Создает новый A/B тест            |
| `getTest(testId)`                                       | Получает тест по ID               |
| `getActiveTests()`                                      | Получает все активные тесты       |
| `assignUserToVariant(testId, userId, context?)`         | Назначает пользователя на вариант |
| `recordConversion(testId, variantId, userId, revenue?)` | Записывает конверсию              |
| `getTestResults(testId)`                                | Получает результаты теста         |
| `getTestAnalytics(testId)`                              | Получает детальную аналитику      |
| `stopTest(testId)`                                      | Останавливает тест                |
| `updateTest(testId, updates)`                           | Обновляет конфигурацию теста      |

## Примеры использования

### Создание A/B теста

```typescript
const test = await abTestingService.createTest({
  name: 'Button Color Test',
  description: 'Testing different button colors for conversion',
  variants: [
    {
      name: 'Blue Button',
      weight: 50,
      config: { color: 'blue' },
      isActive: true,
    },
    {
      name: 'Green Button',
      weight: 50,
      config: { color: 'green' },
      isActive: true,
    },
  ],
  targetAudience: {
    roles: ['user', 'premium'],
    percentage: 20, // 20% пользователей
  },
  isActive: true,
});
```

### Назначение пользователя на вариант

```typescript
const variant = await abTestingService.assignUserToVariant(
  'test_123',
  'user_456',
  { role: 'premium', environment: 'production' }
);

if (variant) {
  console.log(`User assigned to variant: ${variant.name}`);
  // Применить конфигурацию варианта
  applyVariantConfig(variant.config);
}
```

### Запись конверсии

```typescript
await abTestingService.recordConversion(
  'test_123',
  'variant_a',
  'user_456',
  29.99 // revenue
);
```

### Анализ результатов

```typescript
const results = await abTestingService.getTestResults('test_123');
results.forEach(result => {
  console.log(
    `${result.variantName}: ${result.conversionRate.toFixed(2)}% conversion`
  );
});

// Анализируем статистическую значимость
const significantResults = results.filter(
  result => result.statisticalSignificance > 0.95
);

if (significantResults.length > 0) {
  const winner = significantResults.reduce((best, current) =>
    current.conversionRate > best.conversionRate ? current : best
  );

  console.log(
    `Winner: ${winner.variantName} with ${winner.conversionRate.toFixed(2)}% conversion`
  );

  // Останавливаем тест и применяем победителя
  await abTestingService.stopTest('test_123');
  await applyWinningVariant(winner.config);
}
```

## Конфигурация

### Переменные окружения

```bash
# Длительность теста по умолчанию (дни)
AB_TEST_DEFAULT_DURATION=30

# Минимальный размер выборки
AB_TEST_MIN_SAMPLE_SIZE=100

# Уровень доверия (95%)
AB_TEST_CONFIDENCE_LEVEL=0.95

# Включить автооптимизацию
AB_TEST_AUTO_OPTIMIZATION=true
```

### Инициализация

```typescript
import { ABTestingService } from './ab-testing.service';

@Injectable()
export class FeatureModule {
  constructor(private readonly abTesting: ABTestingService) {}
}
```

## Статистическая значимость

### Расчет значимости

Сервис автоматически рассчитывает статистическую значимость для каждого варианта:

```typescript
// Статистическая значимость основана на:
// - Размере выборки
// - Разнице в конверсиях
// - Уровне доверия (по умолчанию 95%)

const significance = result.statisticalSignificance;
if (significance > 0.95) {
  console.log('Result is statistically significant');
} else if (significance > 0.8) {
  console.log('Result shows trend but needs more data');
} else {
  console.log('Result is not statistically significant');
}
```

### Минимальный размер выборки

```typescript
// Настройка минимального размера выборки
const config = {
  minSampleSize: 100, // Минимум 100 пользователей на вариант
  confidenceLevel: 0.95, // 95% уровень доверия
};
```

## Мониторинг и метрики

### Prometheus метрики

```typescript
// Количество активных тестов
ab_tests_active_total 5

// Количество пользователей в тестах
ab_tests_users_total{test_id="test_123"} 1500

// Конверсии по вариантам
ab_tests_conversions_total{test_id="test_123",variant_id="variant_a"} 45
ab_tests_conversions_total{test_id="test_123",variant_id="variant_b"} 52

// Время выполнения операций
ab_tests_operation_duration_seconds{operation="assign_user"} 0.001
ab_tests_operation_duration_seconds{operation="record_conversion"} 0.002
```

### Health checks

```typescript
// Проверка состояния сервиса
const stats = abTestingService.getServiceStats();
if (stats.activeRollouts < stats.maxConcurrentRollouts) {
  return { status: 'healthy', activeTests: stats.activeRollouts };
} else {
  return { status: 'warning', message: 'Too many active tests' };
}
```

## Безопасность

### Валидация данных

- Проверка корректности весов вариантов
- Валидация целевой аудитории
- Санитизация пользовательских данных

### Доступ

- Аутентификация пользователей
- Проверка прав доступа к тестам
- Аудит всех операций

## Производительность

### Оптимизации

- Redis кеширование тестов и метрик
- Batch операции для массовых обновлений
- Асинхронная обработка метрик

### Масштабирование

- Поддержка множественных тестов
- Распределенная обработка метрик
- Автоматическая очистка старых данных

## Тестирование

### Unit тесты

```typescript
describe('ABTestingService', () => {
  it('should create test with correct variants', async () => {
    const testData = createTestData();
    const test = await service.createTest(testData);

    expect(test.variants).toHaveLength(2);
    expect(test.variants[0].weight).toBe(50);
    expect(test.variants[1].weight).toBe(50);
  });

  it('should assign user to variant consistently', async () => {
    const variant1 = await service.assignUserToVariant('test_1', 'user_1');
    const variant2 = await service.assignUserToVariant('test_1', 'user_1');

    expect(variant1?.id).toBe(variant2?.id);
  });
});
```

### Integration тесты

```typescript
describe('ABTesting Integration', () => {
  it('should work with real Redis', async () => {
    const test = await service.createTest(createTestData());
    const variant = await service.assignUserToVariant(test.id, 'user_1');

    expect(variant).toBeDefined();

    await service.recordConversion(test.id, variant.id, 'user_1');

    const results = await service.getTestResults(test.id);
    expect(results[0].conversions).toBe(1);
  });
});
```

## Troubleshooting

### Частые проблемы

1. **Пользователи не назначаются на варианты**
   - Проверить активность теста
   - Проверить целевую аудиторию
   - Проверить веса вариантов

2. **Низкая статистическая значимость**
   - Увеличить размер выборки
   - Увеличить длительность теста
   - Проверить равномерность распределения

3. **Медленная работа**
   - Проверить Redis производительность
   - Оптимизировать запросы метрик
   - Использовать batch операции

### Логи и отладка

```typescript
// Включить debug логирование
const logger = new Logger(ABTestingService.name);
logger.setLogLevel('debug');

// Проверить состояние теста
const test = await abTestingService.getTest('test_123');
console.log('Test status:', test?.isActive ? 'Active' : 'Inactive');
console.log(
  'Variants:',
  test?.variants.map(v => `${v.name}: ${v.weight}%`)
);
```

## Заключение

`ABTestingService` предоставляет мощный инструмент для проведения A/B тестов с поддержкой статистической значимости, детальной аналитики и автоматической оптимизации. Сервис интегрируется с существующей системой feature flags и обеспечивает надежное тестирование гипотез для улучшения пользовательского опыта.
