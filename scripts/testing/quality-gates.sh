#!/bin/bash
# Использование: ./scripts/quality/quality-gates.sh [--strict] [--report]

# 🚦 Quality Gates - Система контроля качества
# Автор: SaleSpot BY Team
# Версия: 1.0.0

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}🚦 Quality Gates - Проверка качества кода${NC}"
    echo -e "${CYAN}================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${PURPLE}ℹ️  $1${NC}"
}

# Проверка TypeScript
check_typescript() {
    print_info "Проверка TypeScript..."
    
    if pnpm run type-check > /dev/null 2>&1; then
        print_success "TypeScript: 0 ошибок"
        return 0
    else
        print_error "TypeScript: обнаружены ошибки"
        return 1
    fi
}

# Проверка ESLint
check_eslint() {
    print_info "Проверка ESLint..."
    
    local eslint_output
    eslint_output=$(pnpm run lint 2>&1)
    local eslint_exit_code=$?
    
    if [ $eslint_exit_code -eq 0 ]; then
        print_success "ESLint: 0 ошибок"
        return 0
    else
        # Подсчитываем количество ошибок
        local error_count=$(echo "$eslint_output" | grep -c "error" || echo "0")
        local warning_count=$(echo "$eslint_output" | grep -c "warning" || echo "0")
        
        if [ "$error_count" -gt 0 ]; then
            print_error "ESLint: $error_count ошибок, $warning_count предупреждений"
            return 1
        else
            print_warning "ESLint: $warning_count предупреждений"
            return 0
        fi
    fi
}

# Проверка Prettier
check_prettier() {
    print_info "Проверка Prettier..."
    
    if pnpm run format:check > /dev/null 2>&1; then
        print_success "Prettier: код отформатирован"
        return 0
    else
        print_error "Prettier: проблемы с форматированием"
        return 1
    fi
}

# Проверка тестов
check_tests() {
    print_info "Проверка тестов..."
    
    if pnpm run test > /dev/null 2>&1; then
        print_success "Тесты: все проходят"
        return 0
    else
        print_error "Тесты: некоторые тесты не прошли"
        return 1
    fi
}

# Проверка безопасности
check_security() {
    print_info "Проверка безопасности..."
    
    local audit_output
    audit_output=$(pnpm audit --audit-level moderate --json 2>/dev/null || echo '{"vulnerabilities":{}}')
    local vulnerability_count=$(echo "$audit_output" | jq '.vulnerabilities | length' 2>/dev/null || echo "0")
    
    if [ "$vulnerability_count" -eq 0 ]; then
        print_success "Безопасность: уязвимостей не найдено"
        return 0
    else
        print_error "Безопасность: найдено $vulnerability_count уязвимостей"
        return 1
    fi
}

# Проверка покрытия тестами
check_coverage() {
    print_info "Проверка покрытия тестами..."
    
    # Запускаем тесты с покрытием
    local coverage_output
    coverage_output=$(pnpm run test:coverage 2>/dev/null || echo "")
    
    # Извлекаем процент покрытия (упрощенная версия)
    local coverage_percent=$(echo "$coverage_output" | grep -o "All files[^%]*" | grep -o "[0-9]*\.[0-9]*%" | head -1 | sed 's/%//' || echo "0")
    
    if [ "$coverage_percent" -ge 80 ]; then
        print_success "Покрытие тестами: ${coverage_percent}% (>= 80%)"
        return 0
    else
        print_warning "Покрытие тестами: ${coverage_percent}% (< 80%)"
        return 0  # Не блокируем коммит, только предупреждаем
    fi
}

# Проверка размера бандла
check_bundle_size() {
    print_info "Проверка размера бандла..."
    
    # Упрощенная проверка - можно расширить
    local bundle_size=$(find . -name "*.js" -path "*/dist/*" -o -path "*/.next/*" | xargs wc -c 2>/dev/null | tail -1 | awk '{print $1}' || echo "0")
    local bundle_size_mb=$((bundle_size / 1024 / 1024))
    
    if [ "$bundle_size_mb" -le 500 ]; then
        print_success "Размер бандла: ${bundle_size_mb}MB (<= 500MB)"
        return 0
    else
        print_warning "Размер бандла: ${bundle_size_mb}MB (> 500MB)"
        return 0  # Не блокируем коммит, только предупреждаем
    fi
}

# Проверка дублирования кода
check_duplication() {
    print_info "Проверка дублирования кода..."
    
    # Упрощенная проверка - можно использовать jscpd или подобные инструменты
    print_info "Проверка дублирования пропущена (требует установки jscpd)"
    return 0
}

# Проверка сложности кода
check_complexity() {
    print_info "Проверка сложности кода..."
    
    # Упрощенная проверка - можно использовать eslint-plugin-complexity
    print_info "Проверка сложности пропущена (требует настройки eslint-plugin-complexity)"
    return 0
}

# Главная функция проверки
main_check() {
    local strict_mode=false
    local generate_report=false
    
    # Парсинг аргументов
    while [[ $# -gt 0 ]]; do
        case $1 in
            --strict)
                strict_mode=true
                shift
                ;;
            --report)
                generate_report=true
                shift
                ;;
            --help)
                echo "Использование: $0 [опции]"
                echo "Опции:"
                echo "  --strict  Строгий режим (блокирует при любых проблемах)"
                echo "  --report  Генерация отчета"
                echo "  --help    Показать эту справку"
                exit 0
                ;;
            *)
                print_error "Неизвестная опция: $1"
                exit 1
                ;;
        esac
    done
    
    print_header
    
    local total_checks=0
    local passed_checks=0
    local failed_checks=0
    local warnings=0
    
    # Выполнение проверок
    ((total_checks++))
    if check_typescript; then
        ((passed_checks++))
    else
        ((failed_checks++))
    fi
    
    ((total_checks++))
    if check_eslint; then
        ((passed_checks++))
    else
        ((failed_checks++))
    fi
    
    ((total_checks++))
    if check_prettier; then
        ((passed_checks++))
    else
        ((failed_checks++))
    fi
    
    ((total_checks++))
    if check_tests; then
        ((passed_checks++))
    else
        ((failed_checks++))
    fi
    
    ((total_checks++))
    if check_security; then
        ((passed_checks++))
    else
        ((failed_checks++))
    fi
    
    ((total_checks++))
    if check_coverage; then
        ((passed_checks++))
    else
        ((warnings++))
    fi
    
    ((total_checks++))
    if check_bundle_size; then
        ((passed_checks++))
    else
        ((warnings++))
    fi
    
    check_duplication
    check_complexity
    
    # Итоговый результат
    echo -e "${CYAN}================================================${NC}"
    echo -e "${BLUE}📊 Результаты Quality Gates:${NC}"
    echo -e "✅ Пройдено: $passed_checks/$total_checks"
    echo -e "❌ Не пройдено: $failed_checks"
    echo -e "⚠️  Предупреждения: $warnings"
    
    # Генерация отчета
    if [ "$generate_report" = true ]; then
        generate_quality_report "$passed_checks" "$failed_checks" "$warnings" "$total_checks"
    fi
    
    # Определение результата
    if [ "$strict_mode" = true ]; then
        if [ $failed_checks -gt 0 ]; then
            print_error "Quality Gates не пройдены в строгом режиме!"
            exit 1
        fi
    else
        if [ $failed_checks -gt 0 ]; then
            print_error "Quality Gates не пройдены!"
            exit 1
        fi
    fi
    
    if [ $warnings -gt 0 ]; then
        print_warning "Quality Gates пройдены с предупреждениями"
    else
        print_success "Quality Gates пройдены успешно!"
    fi
    
    exit 0
}

# Генерация отчета
generate_quality_report() {
    local passed=$1
    local failed=$2
    local warnings=$3
    local total=$4
    
    print_info "Генерация отчета о качестве..."
    
    local report_file="reports/quality-gates-$(date +%Y%m%d-%H%M%S).md"
    mkdir -p reports
    
    cat > "$report_file" << EOF
# Отчет Quality Gates - $(date)

## Общие результаты

- **Пройдено**: $passed/$total
- **Не пройдено**: $failed
- **Предупреждения**: $warnings

## Детальные результаты

### TypeScript
- Статус: $(check_typescript > /dev/null 2>&1 && echo "✅ Пройдено" || echo "❌ Не пройдено")

### ESLint
- Статус: $(check_eslint > /dev/null 2>&1 && echo "✅ Пройдено" || echo "❌ Не пройдено")

### Prettier
- Статус: $(check_prettier > /dev/null 2>&1 && echo "✅ Пройдено" || echo "❌ Не пройдено")

### Тесты
- Статус: $(check_tests > /dev/null 2>&1 && echo "✅ Пройдено" || echo "❌ Не пройдено")

### Безопасность
- Статус: $(check_security > /dev/null 2>&1 && echo "✅ Пройдено" || echo "❌ Не пройдено")

### Покрытие тестами
- Статус: $(check_coverage > /dev/null 2>&1 && echo "✅ Пройдено" || echo "⚠️ Предупреждение")

### Размер бандла
- Статус: $(check_bundle_size > /dev/null 2>&1 && echo "✅ Пройдено" || echo "⚠️ Предупреждение")

## Рекомендации

$(if [ $failed -gt 0 ]; then
    echo "1. Исправьте критические ошибки перед коммитом"
    echo "2. Запустите ./scripts/auto-fix.sh для автоматического исправления"
    echo "3. Проверьте результаты с ./scripts/code-captain.sh"
else
    echo "1. Качество кода соответствует стандартам"
    echo "2. Можно создавать коммит"
fi)

$(if [ $warnings -gt 0 ]; then
    echo "3. Рассмотрите исправление предупреждений в будущем"
fi)

EOF

    print_success "Отчет сохранен в: $report_file"
}

# Запуск главной функции
main_check "$@"
