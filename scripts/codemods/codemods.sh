#!/bin/bash

# Codemods для массовых исправлений кода
# Использует jscodeshift и ts-morph для автоматизации изменений AST

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

# Проверка зависимостей
check_dependencies() {
    log_info "Проверка зависимостей..."
    
    if ! command -v jscodeshift &> /dev/null; then
        log_error "jscodeshift не установлен. Установите: pnpm add -g jscodeshift"
        exit 1
    fi
    
    if ! command -v ts-morph &> /dev/null; then
        log_warning "ts-morph не установлен глобально. Используем локальную версию."
    fi
    
    log_success "Зависимости проверены"
}

# Функция для исправления any типов
fix_any_types() {
    log_info "Исправление any типов..."
    
    # Используем jscodeshift для замены any на unknown
    jscodeshift -t ./scripts/codemods/any-to-unknown.js \
        --parser=ts \
        --extensions=ts,tsx \
        --ignore-pattern="node_modules" \
        --ignore-pattern="dist" \
        --ignore-pattern="build" \
        apps/ packages/
    
    log_success "any типы исправлены"
}

# Функция для исправления типизации
fix_typing() {
    log_info "Исправление типизации..."
    
    # Используем jscodeshift для добавления типов
    jscodeshift -t ./scripts/codemods/add-types.js \
        --parser=ts \
        --extensions=ts,tsx \
        --ignore-pattern="node_modules" \
        --ignore-pattern="dist" \
        --ignore-pattern="build" \
        apps/ packages/
    
    log_success "Типизация исправлена"
}

# Функция для оптимизации импортов
fix_imports() {
    log_info "Оптимизация импортов..."
    
    # Используем jscodeshift для сортировки и очистки импортов
    jscodeshift -t ./scripts/codemods/import-optimization.js \
        --parser=ts \
        --extensions=ts,tsx \
        --ignore-pattern="node_modules" \
        --ignore-pattern="dist" \
        --ignore-pattern="build" \
        apps/ packages/
    
    log_success "Импорты оптимизированы"
}

# Функция для исправления ESLint предупреждений
fix_eslint_warnings() {
    log_info "Исправление ESLint предупреждений..."
    
    # Запускаем ESLint с автоматическим исправлением
    pnpm run lint:fix
    
    log_success "ESLint предупреждения исправлены"
}

# Функция для проверки качества кода
check_quality() {
    log_info "Проверка качества кода..."
    
    # Запускаем проверки качества
    ./scripts/quality/code-captain.sh
    
    log_success "Качество кода проверено"
}

# Функция для создания резервной копии
create_backup() {
    log_info "Создание резервной копии..."
    
    local backup_dir="backup/codemods/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Копируем исходные файлы
    cp -r apps/ "$backup_dir/"
    cp -r packages/ "$backup_dir/"
    
    log_success "Резервная копия создана: $backup_dir"
}

# Функция для отката изменений
rollback() {
    log_info "Откат изменений..."
    
    local backup_dir="$1"
    
    if [ -z "$backup_dir" ]; then
        log_error "Укажите директорию резервной копии"
        exit 1
    fi
    
    if [ ! -d "$backup_dir" ]; then
        log_error "Директория резервной копии не найдена: $backup_dir"
        exit 1
    fi
    
    # Восстанавливаем файлы
    cp -r "$backup_dir/apps/" ./
    cp -r "$backup_dir/packages/" ./
    
    log_success "Изменения откачены из: $backup_dir"
}

# Функция для показа справки
show_help() {
    echo "Использование: $0 [опции]"
    echo ""
    echo "Опции:"
    echo "  --any              Исправить any типы"
    echo "  --typing           Исправить типизацию"
    echo "  --imports          Оптимизировать импорты"
    echo "  --eslint           Исправить ESLint предупреждения"
    echo "  --quality          Проверить качество кода"
    echo "  --backup           Создать резервную копию"
    echo "  --rollback DIR     Откатить изменения из резервной копии"
    echo "  --all              Выполнить все исправления"
    echo "  --help             Показать эту справку"
    echo ""
    echo "Примеры:"
    echo "  $0 --any --typing"
    echo "  $0 --imports"
    echo "  $0 --all"
    echo "  $0 --rollback backup/codemods/20241201_120000"
}

# Основная логика
main() {
    log_info "Запуск codemods для SaleSpot BY"
    
    # Проверяем зависимости
    check_dependencies
    
    # Создаем резервную копию если указан флаг --backup
    if [[ "$*" == *"--backup"* ]]; then
        create_backup
    fi
    
    # Обрабатываем аргументы
    local any_types=false
    local typing=false
    local imports=false
    local eslint=false
    local quality=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --any)
                any_types=true
                shift
                ;;
            --typing)
                typing=true
                shift
                ;;
            --imports)
                imports=true
                shift
                ;;
            --eslint)
                eslint=true
                shift
                ;;
            --quality)
                quality=true
                shift
                ;;
            --all)
                any_types=true
                typing=true
                imports=true
                eslint=true
                quality=true
                shift
                ;;
            --rollback)
                rollback "$2"
                exit 0
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                log_error "Неизвестная опция: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Если не указано ни одной опции, показываем справку
    if ! $any_types && ! $typing && ! $imports && ! $eslint && ! $quality; then
        show_help
        exit 0
    fi
    
    # Выполняем указанные операции
    if $any_types; then
        fix_any_types
    fi
    
    if $typing; then
        fix_typing
    fi
    
    if $imports; then
        fix_imports
    fi
    
    if $eslint; then
        fix_eslint_warnings
    fi
    
    if $quality; then
        check_quality
    fi
    
    log_success "Codemods завершены успешно!"
}

# Запуск основной функции
main "$@"
