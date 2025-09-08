# AI Code Assistant

## Назначение

Система автоматической генерации кода для создания boilerplate кода, типов, интерфейсов и компонентов с использованием AI.

## Основные возможности

### Генерация кода

- **Boilerplate код** - автоматическое создание шаблонов
- **Типы и интерфейсы** - генерация TypeScript типов
- **DTO классы** - создание Data Transfer Objects
- **Сервисы** - генерация NestJS сервисов
- **Контроллеры** - создание API контроллеров
- **Модули** - генерация NestJS модулей
- **Тесты** - автоматическое создание тестов

### Поддерживаемые фреймворки

- **NestJS** - полная поддержка
- **Express** - базовые шаблоны
- **React** - компоненты и хуки
- **Next.js** - страницы и API routes
- **Vue** - компоненты и composables

## Архитектура

### AiCodeAssistantService

```typescript
interface ICodeGenerationRequest {
  type: CodeGenerationType;
  language: CodeLanguage;
  framework?: Framework;
  entityName: string;
  description: string;
  properties?: Record<string, string>;
  methods?: string[];
  dependencies?: string[];
  customRules?: string[];
}
```

### Шаблоны кода

- **NestJS Service** - CRUD сервис с интерфейсом
- **NestJS Controller** - REST API контроллер
- **NestJS DTO** - валидация с class-validator
- **NestJS Module** - модульная структура
- **NestJS Test** - comprehensive тесты

## Примеры генерации

### Сервис

```typescript
@Injectable()
export class EntityService {
  private readonly logger = new Logger(EntityService.name);

  async create(
    data: Omit<IEntity, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<IEntity> {
    // Implementation
  }

  async findAll(): Promise<IEntity[]> {
    // Implementation
  }

  async findOne(id: string): Promise<IEntity | null> {
    // Implementation
  }

  async update(id: string, data: Partial<IEntity>): Promise<IEntity | null> {
    // Implementation
  }

  async delete(id: string): Promise<boolean> {
    // Implementation
  }
}
```

### Контроллер

```typescript
@ApiTags('Entities')
@Controller('entities')
export class EntityController {
  constructor(private readonly entityService: EntityService) {}

  @Post()
  @ApiOperation({ summary: 'Create Entity' })
  @ApiResponse({ status: 201, description: 'Entity created successfully' })
  async create(@Body() createDto: CreateEntityDto): Promise<IEntity> {
    return this.entityService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all Entities' })
  async findAll(@Query() query: unknown): Promise<IEntity[]> {
    return this.entityService.findAll();
  }
}
```

### DTO

```typescript
export class CreateEntityDto {
  @ApiProperty({ description: 'Name field' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Age field' })
  @IsNumber()
  age: number;

  @ApiPropertyOptional({ description: 'Email field' })
  @IsOptional()
  @IsString()
  email?: string;
}
```

## Использование

### Генерация кода

```typescript
const request: ICodeGenerationRequest = {
  type: 'SERVICE',
  language: 'typescript',
  framework: 'nestjs',
  entityName: 'User',
  description: 'User management service',
  properties: {
    name: 'string',
    email: 'string',
    age: 'number',
  },
  methods: ['findByEmail', 'updateProfile'],
};

const result = await aiCodeAssistant.generateCode(request);
```

### Получение шаблонов

```typescript
const templates = aiCodeAssistant.getAvailableTemplates();
```

### Добавление пользовательских шаблонов

```typescript
const customTemplate: ICodeTemplate = {
  id: 'custom-service',
  name: 'Custom Service',
  type: 'SERVICE',
  framework: 'nestjs',
  template: '// Custom template code',
  variables: ['entityName'],
  description: 'Custom service template',
};

aiCodeAssistant.addCustomTemplate(customTemplate);
```

## Интеграция с IDE

### VSCode Extension

- **Command Palette** - быстрая генерация кода
- **Context Menu** - генерация из файлов
- **Snippets** - готовые фрагменты кода
- **Auto-completion** - подсказки при вводе

### Команды

- `AI: Generate Service` - генерация сервиса
- `AI: Generate Controller` - генерация контроллера
- `AI: Generate DTO` - генерация DTO
- `AI: Generate Module` - генерация модуля
- `AI: Generate Tests` - генерация тестов

## API Endpoints

### POST /ai/code-assistant/generate

```json
{
  "type": "SERVICE",
  "language": "typescript",
  "framework": "nestjs",
  "entityName": "User",
  "description": "User management service",
  "properties": {
    "name": "string",
    "email": "string"
  }
}
```

### GET /ai/code-assistant/templates

```json
[
  {
    "id": "nestjs-service",
    "name": "NestJS Service",
    "type": "SERVICE",
    "framework": "nestjs",
    "description": "Генерирует NestJS сервис с CRUD операциями"
  }
]
```

## Конфигурация

### Настройки генерации

```typescript
interface IGenerationConfig {
  defaultFramework: Framework;
  includeTests: boolean;
  includeValidation: boolean;
  includeSwagger: boolean;
  codeStyle: 'prettier' | 'eslint';
  outputDirectory: string;
}
```

## Анализ качества кода

### Метрики

- **Complexity** - цикломатическая сложность
- **Maintainability** - индекс поддерживаемости
- **Testability** - тестируемость кода
- **Performance** - оценка производительности
- **Security** - оценка безопасности

### Предложения по улучшению

- Разбиение сложных функций
- Добавление комментариев
- Улучшение dependency injection
- Добавление валидации входных данных

## Лучшие практики

### Именование

- Используйте PascalCase для имен сущностей
- Следуйте конвенциям фреймворка
- Избегайте сокращений в именах

### Структура

- Группируйте связанные файлы
- Используйте модульную архитектуру
- Следуйте принципам SOLID

### Валидация

- Всегда добавляйте валидацию входных данных
- Используйте class-validator для DTO
- Проверяйте типы на runtime

### Тестирование

- Покрывайте тестами все публичные методы
- Используйте моки для зависимостей
- Тестируйте edge cases

## Мониторинг

### Метрики использования

- Количество генераций по типам
- Популярные шаблоны
- Время генерации кода
- Успешность генерации

### Качество генерируемого кода

- Анализ качества сгенерированного кода
- Статистика по метрикам
- Тренды улучшения качества
