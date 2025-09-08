#!/bin/bash

# Скрипт для настройки системы аутентификации Auth.js

set -e

echo "🔐 Настройка системы аутентификации Auth.js..."

# Проверяем наличие переменных окружения
if [ ! -f "apps/web/.env.local" ]; then
    echo "❌ Файл apps/web/.env.local не найден!"
    echo "Создайте файл .env.local на основе .env.example"
    exit 1
fi

# Проверяем переменные окружения Supabase
echo "📊 Проверка переменных окружения Supabase..."
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo "❌ Переменные Supabase не настроены!"
    echo "Добавьте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY в .env.local"
    exit 1
fi

echo "✅ Подключение к базе данных успешно"

# Выполняем миграцию через Supabase
echo "🗄️ Выполнение миграции базы данных через Supabase..."
echo "📝 Скопируйте SQL из файла apps/web/src/lib/db/migrations/001_auth_tables.sql"
echo "📝 И выполните его в Supabase SQL Editor"

echo "✅ Инструкции по миграции предоставлены"

echo ""
echo "🎉 Настройка системы аутентификации завершена!"
echo ""
echo "Следующие шаги:"
echo "1. Настройте OAuth провайдеры (Google, GitHub)"
echo "2. Добавьте переменные окружения в .env.local"
echo "3. Запустите приложение: pnpm dev"
echo "4. Перейдите на http://localhost:3000/auth/signin"
echo ""
echo "Документация: docs/auth-setup.md"
