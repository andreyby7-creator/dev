#!/bin/bash

echo "🔧 Исправление ESLint проблем..."

# Переходим в корень проекта
cd /home/boss/Projects/dev

echo "1. Исправляем форматирование кода..."
pnpm run format

echo "2. Исправляем ESLint проблемы..."
pnpm run lint:fix

echo "3. Проверяем результат..."
pnpm run validate

echo "4. Обновляем cspell..."
pnpm update cspell@latest

echo "✅ Исправления завершены!"
