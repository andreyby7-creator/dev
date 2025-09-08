#!/bin/bash
echo "🔧 Автоматическая проверка совместимости"
echo "======================================="

echo "1. Проверка зависимостей..."
pnpm exec npx depcheck

echo ""
echo "2. Проверка ESM совместимости..."
grep -r "require(" apps/ --include="*.ts" --include="*.js" | grep -v "dist/" | head -5

echo ""
echo "3. Проверка TypeScript..."
pnpm run type-check

echo ""
echo "4. Проверка ESLint..."
pnpm run lint

echo ""
echo "5. Проверка тестов..."
pnpm run test

echo ""
echo "✅ Проверка совместимости завершена"
