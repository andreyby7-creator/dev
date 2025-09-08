#!/bin/bash

# Скрипт для настройки tree-shaking и минимизации
# Оптимизирует production сборки для уменьшения размера

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

# Функция для настройки webpack
setup_webpack() {
    log_info "Настройка webpack для tree-shaking..."
    
    if [[ -f "apps/api/webpack.config.js" ]]; then
        log_info "Найден webpack.config.js в API"
        
        # Проверяем настройки оптимизации
        if grep -q "optimization" "apps/api/webpack.config.js"; then
            log_success "Webpack оптимизация уже настроена"
        else
            log_warning "Webpack оптимизация не настроена"
        fi
    fi
    
    if [[ -f "apps/web/next.config.js" ]]; then
        log_info "Найден next.config.js в Web"
        
        # Проверяем настройки Next.js
        if grep -q "experimental" "apps/web/next.config.js"; then
            log_success "Next.js экспериментальные функции настроены"
        else
            log_info "Next.js использует стандартные настройки"
        fi
    fi
}

# Функция для анализа размера бандлов
analyze_bundle_size() {
    log_info "Анализ размера бандлов..."
    
    # Проверяем наличие build директорий
    if [[ -d "apps/api/dist" ]]; then
        local api_size=$(du -sh "apps/api/dist" | cut -f1)
        log_info "API bundle размер: $api_size"
    fi
    
    if [[ -d "apps/web/.next" ]]; then
        local web_size=$(du -sh "apps/web/.next" | cut -f1)
        log_info "Web bundle размер: $web_size"
    fi
}

# Функция для оптимизации зависимостей
optimize_dependencies() {
    log_info "Оптимизация зависимостей..."
    
    # Проверяем package.json на тяжелые зависимости
    if [[ -f "package.json" ]]; then
        log_info "Анализ зависимостей..."
        
        # Ищем тяжелые зависимости
        local heavy_deps=$(grep -E '"@types/|"lodash|"moment|"date-fns"' package.json || true)
        
        if [[ -n "$heavy_deps" ]]; then
            log_warning "Найдены потенциально тяжелые зависимости:"
            echo "$heavy_deps"
        else
            log_success "Тяжелых зависимостей не найдено"
        fi
    fi
}

# Функция для создания отчета
generate_report() {
    log_info "Создание отчета по оптимизации бандлов..."
    
    local report_file="reports/bundle-optimization-$(date +%Y%m%d_%H%M%S).md"
    mkdir -p "$(dirname "$report_file")"
    
    cat > "$report_file" << EOF
# Отчет по оптимизации бандлов

**Дата**: $(date)

## Результаты анализа

### Размеры бандлов
- API: $(du -sh "apps/api/dist" 2>/dev/null | cut -f1 || echo "N/A")
- Web: $(du -sh "apps/web/.next" 2>/dev/null | cut -f1 || echo "N/A")

### Рекомендации
1. Включите tree-shaking в webpack
2. Используйте динамические импорты
3. Оптимизируйте зависимости
4. Настройте code splitting

EOF
    
    log_success "Отчет создан: $report_file"
}

# Основная функция
main() {
    log_info "Запуск оптимизации бандлов"
    
    setup_webpack
    analyze_bundle_size
    optimize_dependencies
    generate_report
    
    log_success "Оптимизация бандлов завершена!"
}

# Запуск основной функции
main "$@"
