# Система безопасности - SaleSpot BY

## Обзор

Комплексная система безопасности enterprise-уровня, обеспечивающая защиту от современных угроз с расширенным мониторингом, автоматизированными ответами и управлением соответствием требованиям.

## Основные компоненты

### 1. WAF (Web Application Firewall)

**Функциональность:**

- Защита от SQL-инъекций
- Защита от XSS (Cross-Site Scripting)
- Защита от Path Traversal
- Защита от Command Injection
- Обнаружение вредоносных файлов
- Обнаружение ботов

**Конфигурация:**

```typescript
const customRule: WafRule = {
  id: 'custom-rule',
  name: 'Пользовательское правило безопасности',
  pattern: /malicious-pattern/,
  action: 'block',
  severity: 'high',
  description: 'Пользовательское правило безопасности',
};
```

**API эндпоинты:**

- `GET /api/v1/security/waf/stats` - статистика WAF
- `GET /api/v1/security/waf/rules` - список правил
- `POST /api/v1/security/waf/rules` - добавить правило
- `DELETE /api/v1/security/waf/rules/:ruleId` - удалить правило
- `GET /api/v1/security/waf/events` - события WAF
- `POST /api/v1/security/waf/block-ip` - заблокировать IP
- `POST /api/v1/security/waf/unblock-ip` - разблокировать IP

### 2. Динамическое ограничение скорости

**Конфигурации:**

- **API:** 100 запросов в минуту
- **Auth:** 5 попыток входа за 15 минут
- **Admin:** 30 запросов в минуту
- **Public:** 1000 запросов в минуту

**Функции:**

- Динамическая конфигурация правил
- Адаптивные лимиты на основе нагрузки системы
- Фильтрация IP (белый/черный список)
- Квоты пользователей
- Географическая фильтрация
- Аналитика трафика

**API эндпоинты:**

- `GET /api/v1/security/rate-limit/stats` - статистика ограничения скорости

### 3. Управление секретами

**Функциональность:**

- Автоматическая ротация секретов
- Шифрование в покое
- Интеграция с HashiCorp Vault
- Мониторинг истечения срока действия

**API эндпоинты:**

- `GET /api/v1/security/secrets/status` - статус управления секретами

### 4. Управление сертификатами

**Функциональность:**

- Автоматическое обновление сертификатов
- Мониторинг истечения срока действия
- Интеграция с Let's Encrypt
- Конфигурация SSL/TLS

**API эндпоинты:**

- `GET /api/v1/security/certificates/status` - статус сертификатов

### 5. Оценка уязвимостей

**Функциональность:**

- Автоматическое сканирование уязвимостей
- Интеграция с Trivy/Snyk
- Отчеты об уязвимостях
- Приоритизация исправлений

**API эндпоинты:**

- `GET /api/v1/security/vulnerabilities/scan` - запустить сканирование
- `GET /api/v1/security/vulnerabilities/report` - отчет об уязвимостях

### 6. Мониторинг соответствия

**Стандарты:**

- GDPR (Общий регламент по защите данных)
- PCI DSS (Стандарт безопасности данных индустрии платежных карт)
- ISO 27001 (Информационная безопасность)
- SOC 2 Type II

**API эндпоинты:**

- `GET /api/v1/security/compliance/status` - статус соответствия

### 7. Реагирование на инциденты

**Функциональность:**

- Автоматическое обнаружение инцидентов
- Эскалация и уведомления
- План реагирования
- Анализ инцидентов

**API эндпоинты:**

- `GET /api/v1/security/incidents` - список инцидентов
- `POST /api/v1/security/incidents` - создать инцидент

### 8. Redacted Logger

**Функциональность:**

- Автоматическое скрытие конфиденциальных данных в логах
- Обнаружение секретов (API ключи, пароли, токены)
- Поддержка множественных форматов данных
- Совместимость с ESM

**Поддерживаемые типы:**

- API ключи: `sk-*`, `pk_*`, `Bearer *`
- Пароли: `password*`, `secret*`, `admin*`
- Токены: `ghp_*`, `xoxb-*`, токены Telegram
- Ключи шифрования: `-----BEGIN PRIVATE KEY-----`

### 9. Интеграция KMS

**Поддерживаемые провайдеры:**

- **AWS KMS** - Amazon Key Management Service
- **Azure Key Vault** - Microsoft Azure Key Vault
- **Google Cloud KMS** - Google Cloud Key Management Service
- **HashiCorp Vault** - HashiCorp Vault

**Функциональность:**

- Управление жизненным циклом криптографических ключей
- Шифрование/дешифрование данных
- Цифровая подпись и проверка
- Автоматическая ротация ключей
- Мониторинг и аудит операций

### 10. ИИ-анализ безопасности

**Возможности:**

- Автоматический анализ безопасности
- Обнаружение уязвимостей (SQL-инъекции, XSS, CSRF)
- Анализ зависимостей
- Проверка конфигурации
- Аудит кода
- Мониторинг в реальном времени

**Типы анализа:**

- Статический анализ - анализ исходного кода
- Динамический анализ - анализ во время выполнения
- Анализ зависимостей - проверка внешних библиотек
- Анализ конфигурации - проверка настроек
- Анализ инфраструктуры - проверка инфраструктуры

## Конфигурация

### Переменные окружения

```bash
# Конфигурация безопасности
SECURITY_WAF_ENABLED=true
SECURITY_RATE_LIMIT_ENABLED=true
SECURITY_SECRETS_VAULT_URL=https://vault.example.com
SECURITY_CERTIFICATES_AUTO_RENEWAL=true
SECURITY_VULNERABILITY_SCAN_INTERVAL=24h
SECURITY_COMPLIANCE_ENABLED=true
SECURITY_INCIDENT_RESPONSE_ENABLED=true

# Логирование
REDACTED_LOGGING_ENABLED=true
LOG_SECRETS=true

# WAF
WAF_ENABLED=true
WAF_MODE=block

# Ротация секретов
SECRET_ROTATION_ENABLED=true
SECRET_ROTATION_INTERVAL=86400

# Ограничение скорости
RATE_LIMIT_ENABLED=true
RATE_LIMIT_DEFAULT_WINDOW=60000
RATE_LIMIT_MAX_RULES=1000
RATE_LIMIT_USE_REDIS=true

# Провайдеры KMS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_KEY_VAULT_URL=https://your-vault.vault.azure.net/
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_KMS_KEY_RING=your-key-ring
GOOGLE_KMS_LOCATION=global
VAULT_URL=https://your-vault.com
VAULT_TOKEN=your-token
VAULT_NAMESPACE=your-namespace
```

### Конфигурация middleware

WAF middleware автоматически применяется ко всем запросам:

```typescript
// app.module.ts
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(WafMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
```

## Правила безопасности

### Обнаружение SQL-инъекций

```typescript
// Проблемный код
const query = `SELECT * FROM users WHERE id = ${userId}`;

// Безопасный код
const query = 'SELECT * FROM users WHERE id = ?';
const result = await db.query(query, [userId]);
```

**Правила обнаружения:**

- Использование `${}` в SQL-запросах
- Отсутствие параметризованных запросов
- Прямая конкатенация строк в SQL

### Обнаружение XSS (Cross-Site Scripting)

```typescript
// Проблемный код
element.innerHTML = userInput;

// Безопасный код
element.textContent = userInput;
// или
element.innerHTML = sanitizeHtml(userInput);
```

**Правила обнаружения:**

- Использование `innerHTML` с пользовательским вводом
- Отсутствие санитизации HTML
- Прямая вставка данных в DOM

### Обнаружение CSRF (Cross-Site Request Forgery)

```typescript
// Проблемный код
@Post('/api/users')
async createUser(@Body() userData: CreateUserDto) {
  // Нет защиты от CSRF
}

// Безопасный код
@Post('/api/users')
@UseGuards(CsrfGuard)
async createUser(@Body() userData: CreateUserDto) {
  // Защита от CSRF включена
}
```

### Обнаружение жестко закодированных секретов

```typescript
// Проблемный код
const apiKey = 'sk-1234567890abcdef';
const password = 'admin123';

// Безопасный код
const apiKey = process.env.API_KEY;
const password = process.env.ADMIN_PASSWORD;
```

**Правила обнаружения:**

- Пароли, ключи, токены в коде
- API ключи в исходном коде
- Секреты в файлах конфигурации

### Обнаружение небезопасных криптографических функций

```typescript
// Проблемный код
const hash = crypto.createHash('md5').update(password).digest('hex');
const random = Math.random();

// Безопасный код
const hash = await bcrypt.hash(password, 10);
const random = crypto.randomBytes(32);
```

**Правила обнаружения:**

- MD5, SHA1 для хеширования
- `Math.random()` для криптографии
- Слабые алгоритмы шифрования

## Проверки безопасности CI/CD

### Pre-commit хуки

```bash
pnpm type-check    # Проверка TypeScript
pnpm lint          # Проверка ESLint
pnpm security:check # Проверка безопасности
pnpm format        # Форматирование кода
```

### Проверки Pull Request

```yaml
# .github/workflows/pr-checks.yml
name: PR Security Checks
on: [pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: pnpm install
      - name: TypeScript check
        run: pnpm type-check
      - name: ESLint check
        run: pnpm lint
      - name: Security audit
        run: pnpm audit
      - name: Run security tests
        run: pnpm test:security
      - name: Check for secrets
        run: pnpm security:scan
```

### Автоматические проверки

```bash
# Проверки зависимостей
pnpm audit                    # Проверка уязвимостей
pnpm licenses:check          # Проверка лицензий
pnpm update:security         # Обновление зависимостей

# Сканирование кода
pnpm security:scan           # Поиск секретов в коде
pnpm security:vulnerabilities # Проверка уязвимостей
pnpm security:dependencies   # Анализ зависимостей

# Тестирование безопасности
pnpm test:security           # Тесты безопасности
pnpm test redacted-logger    # Тестирование RedactedLogger
pnpm test secret-rotation    # Тестирование SecretRotationService
pnpm test security-integration # Интеграционные тесты
```

## Мониторинг и метрики

### Дашборд безопасности

Общий статус безопасности доступен через:

- `GET /api/v1/security/status` - общий статус безопасности

**Метрики:**

- Общий балл безопасности (0-100)
- Статус компонентов (здоровый/предупреждение/критический)
- Количество активных инцидентов
- Статистика событий WAF
- Статистика ограничения скорости

### Ключевые метрики

- **Частота запросов** - запросы в секунду
- **Частота блокировки** - процент заблокированных запросов
- **Частота регулирования** - процент регулируемых запросов
- **Время ответа** - среднее время ответа
- **Частота ошибок** - процент ошибок
- **Распределение IP** - распределение запросов по IP
- **Балл безопасности** - общий балл безопасности
- **Количество уязвимостей** - количество уязвимостей по серьезности
- **Статус соответствия** - соответствие стандартам

### Оповещения

Система автоматически генерирует оповещения для:

- Критических событий WAF
- Высокого уровня ограничения скорости
- Истечения секретов
- Истечения сертификатов
- Обнаружения критических уязвимостей
- Нарушений соответствия
- Новых инцидентов
- Подозрительной активности
- Неудачных попыток доступа
- Сбоев операций KMS

### Контроль качества

Настроены пороги безопасности:

- **Критические уязвимости**: 0
- **Высокие уязвимости**: ≤ 2
- **Средние уязвимости**: ≤ 10
- **Балл безопасности**: ≥ 80

## Тестирование

### Модульные тесты

```bash
# Тесты безопасности
pnpm test apps/api/src/security/
```

### Тесты безопасности

```bash
# Тестирование WAF
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM users"}'

# Ожидается: 403 Forbidden

# Тестирование ограничения скорости
for i in {1..101}; do
  curl http://localhost:3001/api/health
done

# Ожидается: 429 Too Many Requests после 100 запросов
```

### Нагрузочное тестирование

```typescript
// Пример нагрузочного теста
describe('Load Testing', () => {
  it('должен обрабатывать высокую нагрузку', async () => {
    const promises = [];

    // Создать 1000 одновременных запросов
    for (let i = 0; i < 1000; i++) {
      promises.push(
        service.checkRateLimit('/api/test', `192.168.1.${i % 254}`)
      );
    }

    const results = await Promise.all(promises);
    const blocked = results.filter(r => !r.allowed).length;

    expect(blocked).toBeGreaterThan(0);
    expect(blocked).toBeLessThan(1000);
  });
});
```

## Лучшие практики

### Регулярные проверки

- Ежедневный мониторинг балла безопасности
- Еженедельное сканирование уязвимостей
- Ежемесячная ротация секретов
- Ежеквартальная оценка соответствия

### Обновления

- Регулярные обновления правил WAF
- Мониторинг новых угроз
- Обновления политик безопасности
- Обучение команды

### Документация

- Ведение журнала инцидентов
- Документирование процедур безопасности
- Обновление руководств
- Регулярные обзоры безопасности

## Реагирование на инциденты

### Процедура реагирования

1. **Обнаружение** - автоматическое или ручное
2. **Классификация** - определение серьезности
3. **Сдерживание** - блокировка угрозы
4. **Расследование** - анализ причин
5. **Устранение** - исправление уязвимости
6. **Восстановление** - возврат к нормальной работе
7. **Анализ** - извлеченные уроки

### Контакты

- **Команда безопасности:** security@salespot.by
- **Экстренная связь:** +375-XX-XXX-XXXX
- **Slack:** #security-incidents

## Метрики производительности

### Целевые показатели

- **Балл безопасности:** > 90%
- **Частота блокировки WAF:** < 5%
- **Частота блокировки ограничения скорости:** < 10%
- **Время устранения уязвимостей:** < 24ч
- **Время реагирования на инциденты:** < 1ч
- **Оповещения об истечении сертификатов:** > 30 дней
- **Ротация секретов:** < 90 дней

### Мониторинг

- Дашборд в реальном времени
- Ежедневные отчеты
- Еженедельные обзоры
- Ежемесячные метрики

## Устранение неполадок

### Распространенные проблемы

1. **Высокая задержка**
   - Проверить провайдера CDN и расположение edge
   - Оптимизировать запросы
   - Использовать операции pipeline

2. **Ошибки платежей**
   - Проверить соответствие PCI DSS и местным законам
   - Проверить конфигурацию платежной системы

3. **Проблемы маршрутизации**
   - Проверить конфигурацию географических правил
   - Проверить настройки фильтрации IP

4. **Высокая частота блокировки**
   - Проверить настройки лимитов
   - Проанализировать паттерны трафика
   - Настроить адаптивное масштабирование

5. **Проблемы производительности**
   - Оптимизировать регулярные выражения
   - Использовать Redis для счетчиков
   - Настроить запланированную очистку

6. **Ложные срабатывания**
   - Проверить приоритеты правил
   - Проанализировать условия приложения
   - Настроить белый список для доверенных IP

### Отладка

Включить детальное логирование:

```typescript
// В конфигурации
const securityService = new SecurityService();
securityService.setLogLevel('debug');
securityService.enableDetailedLogging();
```

## Стандарты соответствия

### OWASP Top 10 2021

✅ Все 10 категорий уязвимостей покрыты

### Соответствие GDPR

✅ Право на забвение, доступ, безопасность данных, уведомления

### SOC 2 Type II

✅ Все 5 категорий контроля реализованы

### PCI DSS

✅ Соответствие стандарту безопасности данных индустрии платежных карт

### ISO 27001

✅ Система управления информационной безопасностью

## Интеграция с внешними системами

### OWASP ZAP

Интеграция с OWASP ZAP для динамического тестирования:

```typescript
interface IZapScanResult {
  alerts: IZapAlert[];
  summary: IZapSummary;
  recommendations: string[];
}
```

### Snyk

Интеграция с Snyk для анализа зависимостей:

```typescript
interface ISnykResult {
  vulnerabilities: ISnykVulnerability[];
  licenses: ISnykLicense[];
  recommendations: string[];
}
```

### SonarQube

Интеграция с SonarQube для анализа качества кода:

```typescript
interface ISonarResult {
  issues: ISonarIssue[];
  measures: ISonarMeasure[];
  qualityGate: ISonarQualityGate;
}
```

## Заключение

Система безопасности обеспечивает комплексную защиту от современных угроз с функциями enterprise-уровня, включая WAF, ограничение скорости, управление секретами, оценку уязвимостей, мониторинг соответствия и реагирование на инциденты. Все компоненты интегрированы в единую архитектуру безопасности с мониторингом в реальном времени и автоматизированными ответами.

### Ключевые преимущества

- **Защита enterprise-уровня** - комплексное покрытие безопасности
- **Мониторинг в реальном времени** - непрерывное обнаружение угроз
- **Автоматизированные ответы** - быстрое реагирование на инциденты
- **Управление соответствием** - соблюдение регулятивных требований
- **Оптимизация производительности** - минимальное влияние на производительность системы

### Рекомендации по разработке

- **Регулярные аудиты безопасности** - периодическая оценка системы
- **Обучение команды** - осведомленность о безопасности и лучшие практики
- **Разведка угроз** - отслеживание новых угроз
- **Симуляция инцидентов** - регулярное тестирование реагирования
- **Непрерывное улучшение** - постоянное повышение безопасности
