#!/bin/bash
# Использование: ./scripts/security/security-scan.sh
# Команда запуска: cd /home/boss/Projects/dev && ./scripts/security-scan.sh

# 🔒 SaleSpot BY - Security Scan Script
# Проверяет безопасность зависимостей и кода

set -e

echo "🔒 SaleSpot BY - Security Scan"
echo "==============================="

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Step 1: Checking for security vulnerabilities...${NC}"
pnpm audit --audit-level moderate

echo -e "${BLUE}📋 Step 2: Checking for outdated dependencies...${NC}"
pnpm outdated || echo -e "${YELLOW}⚠️  Some dependencies are outdated${NC}"

echo -e "${BLUE}📋 Step 3: Checking for unused dependencies...${NC}"
npx depcheck --json > depcheck-results.json 2>/dev/null || echo -e "${YELLOW}⚠️  Depcheck not available${NC}"

echo -e "${BLUE}📋 Step 4: Running Trivy vulnerability scanner...${NC}"
if command -v trivy &> /dev/null; then
    trivy fs . --format table --severity HIGH,CRITICAL
else
    echo -e "${YELLOW}⚠️  Trivy not installed. Install with: brew install trivy${NC}"
fi

echo ""
echo -e "${GREEN}✅ Security scan completed!${NC}"
echo "🔒 Check the results above for any security issues."
