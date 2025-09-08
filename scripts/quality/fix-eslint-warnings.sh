#!/bin/bash
# Использование: ./scripts/quality/fix-eslint-warnings.sh
# Команда запуска: cd /home/boss/Projects/dev && ./scripts/fix-eslint-warnings.sh

# 🔧 SaleSpot BY - Fix ESLint Warnings Script
# Автоматически исправляет оставшиеся ESLint предупреждения

set -e

echo "🔧 SaleSpot BY - Fixing ESLint Warnings"
echo "======================================="

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Step 1: Running ESLint with auto-fix...${NC}"
pnpm run lint:fix

echo -e "${BLUE}📋 Step 2: Running Prettier...${NC}"
pnpm run format

echo -e "${BLUE}📋 Step 3: TypeScript type check...${NC}"
pnpm run type-check

echo -e "${BLUE}📋 Step 4: Running tests...${NC}"
pnpm run test

echo ""
echo -e "${GREEN}✅ ESLint warnings fixed!${NC}"
echo "🎉 Code is now clean and ready for commit!"
