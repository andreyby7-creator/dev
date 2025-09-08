#!/bin/bash
echo "🚀 Подготовка к будущим обновлениям"
echo "=================================="

echo "1. Проверка совместимости с TypeScript 6.0..."
pnpm add -D typescript@beta
pnpm run type-check
pnpm add -D typescript@latest

echo ""
echo "2. Проверка совместимости с Next.js 16..."
pnpm --filter=@salespot/web add next@canary
pnpm --filter=@salespot/web run build
pnpm --filter=@salespot/web add next@latest

echo ""
echo "3. Обновление зависимостей..."
pnpm update --latest

echo ""
echo "✅ Подготовка завершена"
