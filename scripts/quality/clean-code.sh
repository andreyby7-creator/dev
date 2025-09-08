#!/bin/bash
# Использование: ./scripts/quality/clean-code.sh
# Команда запуска: cd /home/boss/Projects/dev && ./scripts/clean-code.sh

# 🧹 SaleSpot BY - Clean Code Script
# Автоматически исправляет проблемы с качеством кода

set -e

echo "🧹 SaleSpot BY - Clean Code"
echo "============================"

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Step 1: Fixing ESLint issues...${NC}"
pnpm run lint:fix

echo -e "${BLUE}📋 Step 2: Formatting code with Prettier...${NC}"
pnpm run format

echo -e "${BLUE}📋 Step 3: TypeScript type check...${NC}"
pnpm run type-check

echo -e "${BLUE}📋 Step 4: Running tests...${NC}"
pnpm run test

echo ""
echo -e "${GREEN}✅ Code cleaning completed!${NC}"
echo "🎉 Your code is now clean and ready for commit!"
