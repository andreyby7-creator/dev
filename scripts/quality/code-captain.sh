#!/bin/bash
# Использование: ./scripts/quality/code-captain.sh [--fix] [--report]

# 🛡️ Капитан Чистого Кода - Система контроля качества кода
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

# Функции для красивого вывода
print_header() {
    echo -e "${BLUE}🛡️  Капитан Чистого Кода начинает проверку!${NC}"
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

# Проверка наличия необходимых инструментов
check_tools() {
    print_info "Проверка инструментов..."
    
    if ! command -v pnpm &> /dev/null; then
        print_error "pnpm не найден. Установите pnpm: npm install -g pnpm"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js не найден"
        exit 1
    fi
    
    print_success "Все инструменты найдены"
}

# Проверка TypeScript
check_typescript() {
    print_info "Проверка TypeScript типов..."
    
    if pnpm run type-check; then
        print_success "TypeScript проверка пройдена"
    else
        print_error "TypeScript проверка не пройдена"
        print_info "Запустите: pnpm run type-check для просмотра ошибок"
        return 1
    fi
}

# Проверка ESLint
check_eslint() {
    print_info "Проверка ESLint..."
    
    if pnpm run lint; then
        print_success "ESLint проверка пройдена"
    else
        print_warning "ESLint обнаружил проблемы"
        print_info "Запустите: pnpm run lint:fix для автоматического исправления"
        return 1
    fi
}

# Проверка Prettier
check_prettier() {
    print_info "Проверка форматирования Prettier..."
    
    if pnpm run format:check; then
        print_success "Prettier проверка пройдена"
    else
        print_warning "Prettier обнаружил проблемы с форматированием"
        print_info "Запустите: pnpm run format для автоматического форматирования"
        return 1
    fi
}

# Автоматическое исправление (только Prettier)
auto_fix() {
    print_info "Запуск безопасного форматирования..."
    
    # Только форматирование Prettier (безопасно)
    print_info "Форматирование кода с Prettier..."
    pnpm run format
    
    print_success "Безопасное форматирование завершено"
}

# Проверка безопасности
check_security() {
    print_info "Проверка безопасности кода..."
    
    # Проверка уязвимостей в зависимостях
    if command -v pnpm &> /dev/null; then
        print_info "Проверка уязвимостей в зависимостях..."
        pnpm audit --audit-level moderate || print_warning "Обнаружены уязвимости в зависимостях"
    fi
    
    print_success "Проверка безопасности завершена"
}

# Проверка тестов
check_tests() {
    print_info "Запуск тестов..."
    
    if pnpm run test; then
        print_success "Все тесты прошли успешно"
    else
        print_warning "Некоторые тесты не прошли"
        return 1
    fi
}

# Генерация отчета
generate_report() {
    print_info "Генерация отчета о качестве кода..."
    
    local report_file="reports/code-quality-$(date +%Y%m%d-%H%M%S).md"
    mkdir -p reports
    
    cat > "$report_file" << EOF
# Отчет о качестве кода - $(date)

## Результаты проверки

### TypeScript
- Статус: $(if check_typescript > /dev/null 2>&1; then echo "✅ Успешно"; else echo "❌ Ошибки"; fi)

### ESLint
- Статус: $(if check_eslint > /dev/null 2>&1; then echo "✅ Успешно"; else echo "⚠️ Предупреждения"; fi)

### Prettier
- Статус: $(if check_prettier > /dev/null 2>&1; then echo "✅ Успешно"; else echo "⚠️ Проблемы форматирования"; fi)

### Тесты
- Статус: $(if check_tests > /dev/null 2>&1; then echo "✅ Успешно"; else echo "❌ Ошибки"; fi)

## Рекомендации

1. Исправьте все TypeScript ошибки
2. Устраните ESLint предупреждения
3. Отформатируйте код согласно Prettier
4. Добавьте недостающие тесты

EOF

    print_success "Отчет сохранен в: $report_file"
}

# Главная функция
main() {
    local auto_fix_flag=false
    local generate_report_flag=false
    
    # Парсинг аргументов
    while [[ $# -gt 0 ]]; do
        case $1 in
            --fix)
                auto_fix_flag=true
                shift
                ;;
            --report)
                generate_report_flag=true
                shift
                ;;
            --help)
                echo "Использование: $0 [опции]"
                echo "Опции:"
                echo "  --fix     Автоматическое исправление проблем"
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
    check_tools
    
    local has_errors=false
    
    # Выполнение проверок
    if ! check_typescript; then
        has_errors=true
    fi
    
    if ! check_eslint; then
        has_errors=true
    fi
    
    if ! check_prettier; then
        has_errors=true
    fi
    
    check_security
    
    if ! check_tests; then
        has_errors=true
    fi
    
    # Автоматическое исправление
    if [ "$auto_fix_flag" = true ]; then
        auto_fix
    fi
    
    # Генерация отчета
    if [ "$generate_report_flag" = true ]; then
        generate_report
    fi
    
    # Итоговый результат
    echo -e "${CYAN}================================================${NC}"
    if [ "$has_errors" = true ]; then
        print_error "Капитан обнаружил проблемы в коде!"
        print_info "Используйте --fix для автоматического исправления"
        exit 1
    else
        print_success "Капитан доволен! Код чист, можно коммитить."
        exit 0
    fi
}

# Запуск главной функции
main "$@"
