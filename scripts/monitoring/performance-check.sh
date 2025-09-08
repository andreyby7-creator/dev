#!/bin/bash
echo "🔍 Мониторинг производительности проекта"
echo "========================================"

echo "📊 Bundle Size Analysis:"
pnpm --filter=@salespot/web run build 2>&1 | grep -E "(Size|First Load JS|chunks)"

echo ""
echo "💾 Memory Usage:"
ps aux | grep node | grep -v grep | awk "{print \$2, \$4, \$6}" | head -5

echo ""
echo "⏱️ TypeScript Performance:"
time pnpm run type-check

echo ""
echo " ESLint Performance:"
time pnpm run lint

echo ""
echo "✅ Мониторинг завершен"
