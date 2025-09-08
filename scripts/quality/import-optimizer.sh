#!/bin/bash

# Скрипт для анализа дублирования и оптимизации импортов
# Анализирует код на предмет дублирования и оптимизирует импорты

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функции
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Функция для анализа дублирования кода
analyze_duplication() {
    log_info "Анализ дублирования кода..."
    
    local total_files=0
    local duplicate_files=0
    local total_duplication=0
    
    # Анализируем TypeScript файлы
    while IFS= read -r -d '' file; do
        if [[ -f "$file" ]]; then
            total_files=$((total_files + 1))
            
            # Простой анализ дублирования строк
            local lines=$(wc -l < "$file")
            local unique_lines=$(sort "$file" | uniq | wc -l)
            local duplication_percent=$((100 - (unique_lines * 100 / lines)))
            
            if [[ $duplication_percent -gt 10 ]]; then
                duplicate_files=$((duplicate_files + 1))
                total_duplication=$((total_duplication + duplication_percent))
                log_warning "Высокое дублирование в $file: ${duplication_percent}%"
            fi
        fi
    done < <(find apps/ packages/ -name "*.ts" -o -name "*.tsx" -print0)
    
    if [[ $total_files -gt 0 ]]; then
        local avg_duplication=$((total_duplication / total_files))
        log_info "Статистика дублирования:"
        log_info "  Всего файлов: $total_files"
        log_info "  Файлов с дублированием: $duplicate_files"
        log_info "  Среднее дублирование: ${avg_duplication}%"
        
        if [[ $avg_duplication -gt 15 ]]; then
            log_warning "Общий уровень дублирования высокий: ${avg_duplication}%"
        else
            log_success "Общий уровень дублирования приемлемый: ${avg_duplication}%"
        fi
    fi
}

# Функция для оптимизации импортов
optimize_imports() {
    log_info "Оптимизация импортов..."
    
    # Используем jscodeshift для оптимизации импортов
    if command -v jscodeshift &> /dev/null; then
        jscodeshift -t ./scripts/codemods/import-optimization.js \
            --parser=ts \
            --extensions=ts,tsx \
            --ignore-pattern="node_modules" \
            --ignore-pattern="dist" \
            --ignore-pattern="build" \
            apps/ packages/
        
        log_success "Импорты оптимизированы"
    else
        log_warning "jscodeshift не установлен. Пропускаем оптимизацию импортов."
    fi
}

# Функция для анализа неиспользуемых импортов
analyze_unused_imports() {
    log_info "Анализ неиспользуемых импортов..."
    
    local unused_imports=0
    
    # Используем ESLint для поиска неиспользуемых импортов
    if command -v pnpm &> /dev/null; then
        # Запускаем ESLint с правилом no-unused-vars
        local eslint_output
        eslint_output=$(pnpm run lint 2>&1 | grep "no-unused-vars" || true)
        
        if [[ -n "$eslint_output" ]]; then
            unused_imports=$(echo "$eslint_output" | wc -l)
            log_warning "Найдено $unused_imports неиспользуемых импортов"
            echo "$eslint_output"
        else
            log_success "Неиспользуемых импортов не найдено"
        fi
    else
        log_warning "pnpm не найден. Пропускаем анализ неиспользуемых импортов."
    fi
}

# Функция для анализа циклических зависимостей
analyze_circular_dependencies() {
    log_info "Анализ циклических зависимостей..."
    
    # Простой анализ циклических зависимостей
    local circular_deps=0
    
    # Проверяем основные модули на циклические зависимости
    for module in apps/api/src/*/; do
        if [[ -d "$module" ]]; then
            local module_name=$(basename "$module")
            
            # Проверяем импорты модуля
            if [[ -f "${module}${module_name}.module.ts" ]]; then
                local imports=$(grep -r "import.*from.*${module_name}" "$module" || true)
                if [[ -n "$imports" ]]; then
                    log_warning "Возможная циклическая зависимость в модуле $module_name"
                    circular_deps=$((circular_deps + 1))
                fi
            fi
        fi
    done
    
    if [[ $circular_deps -eq 0 ]]; then
        log_success "Циклических зависимостей не найдено"
    else
        log_warning "Найдено $circular_deps потенциальных циклических зависимостей"
    fi
}

# Функция для анализа размера бандлов
analyze_bundle_size() {
    log_info "Анализ размера бандлов..."
    
    # Проверяем наличие webpack или других бандлеров
    if [[ -f "apps/api/webpack.config.js" ]] || [[ -f "apps/web/next.config.js" ]]; then
        log_info "Найдены конфигурации бандлеров"
        
        # Анализируем зависимости
        if [[ -f "package.json" ]]; then
            local total_deps=$(jq '.dependencies | length' package.json 2>/dev/null || echo "0")
            local total_dev_deps=$(jq '.devDependencies | length' package.json 2>/dev/null || echo "0")
            
            log_info "Зависимости: $total_deps (prod) + $total_dev_deps (dev)"
            
            if [[ $total_deps -gt 50 ]]; then
                log_warning "Большое количество зависимостей: $total_deps"
            fi
        fi
    else
        log_info "Конфигурации бандлеров не найдены"
    fi
}

# Функция для создания отчета
generate_report() {
    log_info "Создание отчета по оптимизации..."
    
    local report_file="reports/import-optimization-$(date +%Y%m%d_%H%M%S).md"
    mkdir -p "$(dirname "$report_file")"
    
    cat > "$report_file" << EOF
# Отчет по оптимизации импортов и анализу дублирования

**Дата**: $(date)
**Версия**: $(git describe --tags 2>/dev/null || echo "unknown")

## Результаты анализа

### Дублирование кода
- Файлов проанализировано: $total_files
- Файлов с дублированием: $duplicate_files
- Среднее дублирование: ${avg_duplication}%

### Импорты
- Неиспользуемых импортов: $unused_imports
- Циклических зависимостей: $circular_deps

### Рекомендации
1. Рассмотрите возможность вынесения дублирующегося кода в общие модули
2. Удалите неиспользуемые импорты
3. Проверьте циклические зависимости
4. Оптимизируйте размер бандлов

EOF
    
    log_success "Отчет создан: $report_file"
}

# Основная функция
main() {
    log_info "Запуск анализа дублирования и оптимизации импортов"
    
    # Анализируем дублирование
    analyze_duplication
    
    # Анализируем неиспользуемые импорты
    analyze_unused_imports
    
    # Анализируем циклические зависимости
    analyze_circular_dependencies
    
    # Анализируем размер бандлов
    analyze_bundle_size
    
    # Оптимизируем импорты
    optimize_imports
    
    # Создаем отчет
    generate_report
    
    log_success "Анализ завершен успешно!"
}

# Запуск основной функции
main "$@"
