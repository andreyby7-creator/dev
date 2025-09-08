# 📚 API Documentation

## Назначение

Документация API для системы управления картами лояльности SaleSpot BY.

## 📁 Структура

- `specification/` - OpenAPI спецификации
  - `openapi.json` - Основная OpenAPI спецификация API

## 🔗 Ссылки

- **Swagger UI**: http://localhost:3001/api/v1/docs
- **Health Check**: http://localhost:3001/api/v1/observability/health
- **API Base URL**: http://localhost:3001/api/v1

## 📋 Основные эндпоинты

### Аутентификация

- `POST /auth/login` - Вход в систему
- `POST /auth/register` - Регистрация
- `POST /auth/refresh` - Обновление токена

### Пользователи

- `GET /users/profile` - Профиль пользователя
- `PUT /users/profile` - Обновление профиля

### Карты лояльности

- `GET /cards` - Список карт
- `POST /cards` - Создание карты
- `GET /cards/:id` - Детали карты

### Сети и магазины

- `GET /networks` - Список сетей
- `GET /stores` - Список магазинов

### Аналитика

- `GET /analytics/dashboard` - Дашборд аналитики
- `GET /analytics/reports` - Отчеты

## 🔐 Аутентификация

API использует JWT токены для аутентификации. Добавьте заголовок:

```
Authorization: Bearer <your-jwt-token>
```

## 📊 Статус коды

- `200` - Успешный запрос
- `201` - Ресурс создан
- `400` - Неверный запрос
- `401` - Не авторизован
- `403` - Доступ запрещен
- `404` - Ресурс не найден
- `500` - Внутренняя ошибка сервера
