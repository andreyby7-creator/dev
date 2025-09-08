#!/bin/bash
# Использование: ./scripts/performance/performance-check.sh
# Команда запуска: cd /home/boss/Projects/dev && ./scripts/performance-check.sh

# ⚡ SaleSpot BY - Performance Check Script
# Проверяет производительность приложений

set -e

echo "⚡ SaleSpot BY - Performance Check"
echo "=================================="

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Step 1: Building applications...${NC}"
pnpm run build

echo -e "${BLUE}📋 Step 2: Checking bundle sizes...${NC}"
echo "📦 Bundle sizes:"
if [ -d "apps/web/.next" ]; then
    WEB_SIZE=$(du -sh apps/web/.next | cut -f1)
    echo "📱 Web bundle size: $WEB_SIZE"
fi

if [ -d "apps/api/dist" ]; then
    API_SIZE=$(du -sh apps/api/dist | cut -f1)
    echo "🔧 API bundle size: $API_SIZE"
fi

echo -e "${BLUE}📋 Step 3: Running Lighthouse CI...${NC}"
if command -v lhci &> /dev/null; then
    lhci autorun --config .lighthouserc.json
else
    echo -e "${YELLOW}⚠️  Lighthouse CI not installed. Install with: npm install -g @lhci/cli${NC}"
fi

echo -e "${BLUE}📋 Step 4: Checking memory usage...${NC}"
echo "💾 Memory usage:"
ps aux | grep -E "(node|next)" | grep -v grep | awk '{print $2, $3, $4, $11}' | head -5

echo -e "${BLUE}📋 Step 5: Checking CPU usage...${NC}"
echo "🖥️  CPU usage:"
top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1

echo ""
echo -e "${GREEN}✅ Performance check completed!${NC}"
echo "⚡ Check the results above for performance issues."
