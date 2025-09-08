# Dynamic Type Checks

## Назначение

Система автоматической генерации DTO и контрактов API с динамическим определением типов на основе данных и автоматической генерацией валидации.

## Основные возможности

### Автоматическое определение типов

- **Анализ данных** - определение типов на основе реальных данных
- **Паттерн-анализ** - распознавание типов по именам свойств
- **Валидация** - автоматическая генерация правил валидации
- **Swagger документация** - генерация OpenAPI схем

### Поддерживаемые типы

- **string** - строковые значения
- **number** - числовые значения
- **boolean** - логические значения
- **date** - даты и время
- **array** - массивы
- **object** - объекты
- **enum** - перечисления
- **uuid** - UUID идентификаторы
- **email** - email адреса
- **url** - URL ссылки

## Архитектура

### DynamicTypeChecksService

```typescript
interface ITypeDefinition {
  name: string;
  type: ValidationType;
  required: boolean;
  description?: string;
  defaultValue?: unknown;
  validationRules?: IValidationRule[];
  swaggerType?: SwaggerType;
  format?: string;
  example?: unknown;
}

interface IDtoGenerationRequest {
  name: string;
  properties: Record<string, ITypeDefinition>;
  description?: string;
  isCreate?: boolean;
  isUpdate?: boolean;
  isResponse?: boolean;
  extends?: string[];
  implements?: string[];
}
```

### Автоматическое определение типов

```typescript
interface ITypeInferenceResult {
  type: ValidationType;
  confidence: number;
  suggestions: string[];
  validationRules: IValidationRule[];
}
```

## Определение типов по паттернам

### Email

```typescript
// Автоматическое определение по имени свойства
if (propertyName.includes('email') || propertyName.includes('mail')) {
  result.type = 'email';
  result.confidence = 0.95;
  result.validationRules.push({
    type: 'pattern',
    value: 'email',
    message: 'Invalid email format',
  });
}
```

### URL

```typescript
// Определение URL по имени свойства
if (propertyName.includes('url') || propertyName.includes('link')) {
  result.type = 'url';
  result.confidence = 0.9;
  result.validationRules.push({
    type: 'pattern',
    value: 'url',
    message: 'Invalid URL format',
  });
}
```

### UUID

```typescript
// Определение UUID по имени свойства
if (propertyName.includes('id') && propertyName.includes('uuid')) {
  result.type = 'uuid';
  result.confidence = 0.9;
  result.validationRules.push({
    type: 'pattern',
    value: 'uuid',
    message: 'Invalid UUID format',
  });
}
```

### Date

```typescript
// Определение даты по имени свойства
if (propertyName.includes('date') || propertyName.includes('time')) {
  result.type = 'date';
  result.confidence = 0.85;
  result.validationRules.push({
    type: 'pattern',
    value: 'date',
    message: 'Invalid date format',
  });
}
```

### Boolean

```typescript
// Определение boolean по имени свойства
if (propertyName.startsWith('is') || propertyName.startsWith('has')) {
  result.type = 'boolean';
  result.confidence = 0.8;
}
```

### Number

```typescript
// Определение числа по имени свойства
if (propertyName.includes('count') || propertyName.includes('amount')) {
  result.type = 'number';
  result.confidence = 0.75;
  result.validationRules.push({
    type: 'min',
    value: 0,
    message: 'Value must be positive',
  });
}
```

## Генерация DTO

### Create DTO

```typescript
export class CreateUserDto {
  @ApiProperty({ description: 'User name field' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'User email field' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User age field' })
  @IsNumber()
  @Min(0, { message: 'Value must be positive' })
  age: number;

  @ApiPropertyOptional({ description: 'User phone field' })
  @IsOptional()
  @IsString()
  phone?: string;
}
```

### Update DTO

```typescript
export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'User name field' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'User email field' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'User age field' })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Value must be positive' })
  age?: number;
}
```

### Response DTO

```typescript
export class UserResponseDto {
  @ApiProperty({ description: 'User ID field' })
  @IsUUID()
  id: string;

  @ApiProperty({ description: 'User name field' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'User email field' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User age field' })
  @IsNumber()
  age: number;

  @ApiProperty({ description: 'Created at field' })
  @IsDate()
  createdAt: Date;

  @ApiProperty({ description: 'Updated at field' })
  @IsDate()
  updatedAt: Date;
}
```

## Генерация API контрактов

### API Contract

```typescript
interface IApiContract {
  path: string;
  method: ApiMethod;
  summary: string;
  description?: string;
  tags: string[];
  requestBody?: IDtoGenerationRequest;
  responseBody?: IDtoGenerationRequest;
  parameters?: IApiParameter[];
  security?: string[];
  deprecated?: boolean;
}
```

### Генерируемый контроллер

```typescript
@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create User' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  async create(@Body() createDto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all Users' })
  @ApiResponse({ status: 200, description: 'Return all users' })
  async findAll(@Query() query: unknown): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get User by id' })
  @ApiResponse({ status: 200, description: 'Return user by id' })
  async findOne(@Param('id') id: string): Promise<UserResponseDto | null> {
    return this.usersService.findOne(id);
  }
}
```

## Валидационные правила

### Базовые валидаторы

```typescript
const validationTemplates = new Map([
  ['string', '@IsString()'],
  ['number', '@IsNumber()'],
  ['boolean', '@IsBoolean()'],
  ['date', '@IsDate()'],
  ['array', '@IsArray()'],
  ['object', '@IsObject()'],
  ['enum', '@IsEnum()'],
  ['uuid', '@IsUUID()'],
  ['email', '@IsEmail()'],
  ['url', '@IsUrl()'],
]);
```

### Дополнительные правила

```typescript
// Минимальное значение
@Min(0, { message: 'Value must be positive' })

// Максимальное значение
@Max(100, { message: 'Value too large' })

// Длина строки
@Length(1, 100, { message: 'Length must be between 1 and 100' })

// Регулярное выражение
@Matches(/^[a-zA-Z0-9]+$/, { message: 'Invalid format' })

// Перечисление
@IsEnum(['active', 'inactive'], { message: 'Invalid status' })
```

## Swagger документация

### Базовые типы

```typescript
const swaggerTemplates = new Map([
  ['string', "@ApiProperty({ type: 'string' })"],
  ['number', "@ApiProperty({ type: 'number' })"],
  ['boolean', "@ApiProperty({ type: 'boolean' })"],
  ['date', "@ApiProperty({ type: 'string', format: 'date-time' })"],
  ['array', "@ApiProperty({ type: 'array' })"],
  ['object', "@ApiProperty({ type: 'object' })"],
  ['uuid', "@ApiProperty({ type: 'string', format: 'uuid' })"],
  ['email', "@ApiProperty({ type: 'string', format: 'email' })"],
  ['url', "@ApiProperty({ type: 'string', format: 'uri' })"],
]);
```

### Расширенные свойства

```typescript
@ApiProperty({
  type: 'string',
  description: 'User email address',
  example: 'user@example.com',
  format: 'email'
})
@IsEmail()
email: string;
```

## Использование

### Генерация DTO

```typescript
const request: IDtoGenerationRequest = {
  name: 'User',
  properties: {
    name: {
      name: 'name',
      type: 'string',
      required: true,
      description: 'User name',
      validationRules: [
        {
          type: 'length',
          value: { min: 1, max: 100 },
          message: 'Name must be between 1 and 100 characters',
        },
      ],
    },
    email: {
      name: 'email',
      type: 'email',
      required: true,
      description: 'User email address',
    },
    age: {
      name: 'age',
      type: 'number',
      required: true,
      description: 'User age',
      validationRules: [
        { type: 'min', value: 0, message: 'Age must be positive' },
        { type: 'max', value: 120, message: 'Age must be less than 120' },
      ],
    },
  },
  isCreate: true,
};

const dto = await dynamicTypeChecksService.generateDto(request);
```

### Генерация API контракта

```typescript
const contract: IApiContract = {
  path: '/users',
  method: 'POST',
  summary: 'Create User',
  description: 'Create a new user',
  tags: ['Users'],
  requestBody: {
    name: 'User',
    properties: {
      name: { name: 'name', type: 'string', required: true },
      email: { name: 'email', type: 'email', required: true },
    },
    isCreate: true,
  },
  responseBody: {
    name: 'User',
    properties: {
      id: { name: 'id', type: 'uuid', required: true },
      name: { name: 'name', type: 'string', required: true },
      email: { name: 'email', type: 'email', required: true },
    },
    isResponse: true,
  },
};

const apiContract =
  await dynamicTypeChecksService.generateApiContract(contract);
```

### Определение типа из данных

```typescript
const data = {
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
  isActive: true,
};

const typeInference = dynamicTypeChecksService.inferTypeFromData(
  data.name,
  'name'
);
// Результат: { type: 'string', confidence: 0.7, suggestions: [], validationRules: [] }

const emailInference = dynamicTypeChecksService.inferTypeFromData(
  data.email,
  'email'
);
// Результат: { type: 'email', confidence: 0.95, suggestions: [], validationRules: [...] }
```

## API Endpoints

### POST /ai/code-assistant/generate-dto

```json
{
  "name": "User",
  "properties": {
    "name": {
      "name": "name",
      "type": "string",
      "required": true,
      "description": "User name"
    },
    "email": {
      "name": "email",
      "type": "email",
      "required": true,
      "description": "User email"
    }
  },
  "isCreate": true
}
```

### POST /ai/code-assistant/generate-api-contract

```json
{
  "path": "/users",
  "method": "POST",
  "summary": "Create User",
  "tags": ["Users"],
  "requestBody": {
    "name": "User",
    "properties": {
      "name": { "name": "name", "type": "string", "required": true },
      "email": { "name": "email", "type": "email", "required": true }
    },
    "isCreate": true
  }
}
```

### POST /ai/code-assistant/infer-type

```json
{
  "data": "john@example.com",
  "propertyName": "email"
}
```

### GET /ai/code-assistant/validation-types

```json
{
  "types": [
    "string",
    "number",
    "boolean",
    "date",
    "array",
    "object",
    "enum",
    "uuid",
    "email",
    "url"
  ],
  "validationTemplates": {
    "string": "@IsString()",
    "number": "@IsNumber()",
    "email": "@IsEmail()"
  },
  "swaggerTemplates": {
    "string": "@ApiProperty({ type: 'string' })",
    "number": "@ApiProperty({ type: 'number' })",
    "email": "@ApiProperty({ type: 'string', format: 'email' })"
  }
}
```

## Интеграция с NestJS

### Автоматическая регистрация

```typescript
@Module({
  imports: [DynamicTypeChecksModule],
  providers: [DynamicTypeChecksService],
  exports: [DynamicTypeChecksService],
})
export class DynamicTypeChecksModule {}
```

### Использование в контроллерах

```typescript
@Controller('api')
export class ApiController {
  constructor(
    private readonly dynamicTypeChecksService: DynamicTypeChecksService
  ) {}

  @Post('generate-dto')
  async generateDto(@Body() request: IDtoGenerationRequest) {
    return this.dynamicTypeChecksService.generateDto(request);
  }
}
```

## Лучшие практики

### Определение типов

- Используйте описательные имена свойств
- Следуйте конвенциям именования (camelCase)
- Добавляйте примеры данных для лучшего определения типов
- Проверяйте confidence score для надежности

### Валидация

- Добавляйте соответствующие правила валидации
- Используйте понятные сообщения об ошибках
- Проверяйте граничные значения
- Тестируйте валидацию с различными данными

### Документация

- Добавляйте описания для всех свойств
- Используйте примеры в Swagger документации
- Документируйте бизнес-правила
- Обновляйте документацию при изменениях

## Мониторинг и аналитика

### Статистика использования

- Количество сгенерированных DTO
- Популярные типы валидации
- Частота использования различных паттернов
- Успешность определения типов

### Качество генерации

- Точность определения типов
- Количество ошибок валидации
- Удовлетворенность пользователей
- Время генерации DTO

## Расширение функциональности

### Добавление новых типов

1. Определите новый `ValidationType`
2. Добавьте паттерн определения в `checkPropertyNamePatterns`
3. Создайте шаблоны валидации и Swagger
4. Обновите документацию

### Интеграция с внешними системами

- **OpenAPI** - для генерации спецификаций
- **JSON Schema** - для валидации данных
- **GraphQL** - для генерации схем
- **Database** - для синхронизации с моделями данных
