#!/bin/bash
# Использование: ./scripts/quality/check-errors.sh

# Скрипт проверки ошибок TypeScript и ESLint

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TS_ERRORS=0
TS_WARNINGS=0
ES_ERRORS=0
ES_WARNINGS=0

echo -e "${BLUE}🔍 Проверка ошибок TypeScript и ESLint...${NC}"
echo "=================================="

# Change to project directory
cd /home/boss/Projects/dev

# Function to count errors from output
count_errors() {
    local output="$1"
    local error_count=$(echo "$output" | grep -c "error TS" || echo "0")
    local warning_count=$(echo "$output" | grep -c "warning TS" || echo "0")
    echo "$error_count $warning_count"
}

count_eslint_errors() {
    local output="$1"
    # Считаем только строки с ESLint ошибками, исключая системные сообщения
    local error_count=$(echo "$output" | grep -E ".*[0-9]+:[0-9]+.*error" | wc -l || echo "0")
    local warning_count=$(echo "$output" | grep -E ".*[0-9]+:[0-9]+.*warning" | wc -l || echo "0")
    echo "$error_count $warning_count"
}

# Check TypeScript errors
echo -e "${YELLOW}📝 Проверка TypeScript ошибок...${NC}"
TS_OUTPUT=$(pnpm run type-check 2>&1 || true)

# Count TypeScript errors
read ts_errors ts_warnings <<< $(count_errors "$TS_OUTPUT")
TS_ERRORS=$ts_errors
TS_WARNINGS=$ts_warnings

echo "$TS_OUTPUT"
echo ""

# Check ESLint errors
echo -e "${YELLOW}🔧 Проверка ESLint ошибок...${NC}"
ES_OUTPUT=$(pnpm run lint 2>&1 || true)

# Count ESLint errors
read es_errors es_warnings <<< $(count_eslint_errors "$ES_OUTPUT")
ES_ERRORS=$es_errors
ES_WARNINGS=$es_warnings

echo "$ES_OUTPUT"
echo ""

# Summary
echo "=================================="
echo -e "${BLUE}📊 СТАТИСТИКА ОШИБОК:${NC}"
echo ""

echo -e "${YELLOW}TypeScript:${NC}"
echo -e "  ${RED}Ошибки: $TS_ERRORS${NC}"
echo -e "  ${YELLOW}Предупреждения: $TS_WARNINGS${NC}"
echo ""

echo -e "${YELLOW}ESLint:${NC}"
echo -e "  ${RED}Ошибки: $ES_ERRORS${NC}"
echo -e "  ${YELLOW}Предупреждения: $ES_WARNINGS${NC}"
echo ""

TOTAL_ERRORS=$((TS_ERRORS + ES_ERRORS))
TOTAL_WARNINGS=$((TS_WARNINGS + ES_WARNINGS))

echo -e "${BLUE}Итого:${NC}"
echo -e "  ${RED}Всего ошибок: $TOTAL_ERRORS${NC}"
echo -e "  ${YELLOW}Всего предупреждений: $TOTAL_WARNINGS${NC}"
echo ""

# Status
if [ $TOTAL_ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Отлично! Ошибок не найдено!${NC}"
    exit 0
else
    echo -e "${RED}❌ Найдено $TOTAL_ERRORS ошибок${NC}"
    echo -e "${YELLOW}⚠️  Найдено $TOTAL_WARNINGS предупреждений${NC}"
    exit 1
fi
