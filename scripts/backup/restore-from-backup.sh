#!/bin/bash
# Использование: ./scripts/backup/restore-from-backup.sh

# Restore from Backup Script
# Usage: ./scripts/restore-from-backup.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/home/boss/Projects/dev"
BACKUP_DIR="$PROJECT_DIR/backups"
LOG_FILE="/tmp/restore.log"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
}

check_backup_file() {
    local backup_file="$1"
    
    if [[ ! -f "$backup_file" ]]; then
        error "Резервная копия не найдена: $backup_file"
        return 1
    fi
    
    log "Найдена резервная копия: $backup_file"
    log "Размер: $(du -sh "$backup_file" | cut -f1)"
    return 0
}

check_checksum() {
    local backup_file="$1"
    local checksum_file="$2"
    
    if [[ -f "$checksum_file" ]]; then
        log "Проверка контрольной суммы..."
        if sha256sum -c "$checksum_file"; then
            success "Контрольная сумма верна"
        else
            error "Контрольная сумма не совпадает!"
            return 1
        fi
    else
        warning "Файл контрольной суммы не найден, пропускаем проверку"
    fi
}

stop_services() {
    log "Остановка всех сервисов..."
    
    if [[ -f "$PROJECT_DIR/scripts/stop-all.sh" ]]; then
        "$PROJECT_DIR/scripts/stop-all.sh" || warning "Не удалось остановить сервисы"
    else
        # Ручная остановка процессов
        pkill -f "pnpm\|tsx\|next\|nest" || true
        sleep 2
    fi
    
    success "Сервисы остановлены"
}

create_current_backup() {
    log "Создание резервной копии текущего состояния..."
    
    local current_backup="$BACKUP_DIR/backup-current-$(date +%Y%m%d-%H%M).tar.gz"
    
    if [[ -d "$PROJECT_DIR" ]] && [[ "$(ls -A "$PROJECT_DIR" 2>/dev/null)" ]]; then
        cd "$PROJECT_DIR"
        tar -czf "$current_backup" \
            --exclude=node_modules \
            --exclude=.git \
            --exclude=dist \
            --exclude=build \
            --exclude=.next \
            --exclude=backups \
            . 2>/dev/null || warning "Не удалось создать резервную копию текущего состояния"
        
        if [[ -f "$current_backup" ]]; then
            success "Создана резервная копия текущего состояния: $current_backup"
        fi
    else
        warning "Директория проекта пуста или не существует"
    fi
}

clean_project_directory() {
    log "Очистка директории проекта..."
    
    cd "$PROJECT_DIR"
    
    # Удалить все файлы кроме backups и .git
    find . -mindepth 1 -maxdepth 1 ! -name 'backups' ! -name '.git' -exec rm -rf {} + 2>/dev/null || true
    
    # Очистить node_modules если есть
    rm -rf node_modules apps/*/node_modules 2>/dev/null || true
    
    success "Директория проекта очищена"
}

restore_from_backup() {
    local backup_file="$1"
    
    log "Восстановление из резервной копии: $backup_file"
    
    cd "$PROJECT_DIR"
    
    if tar -xzf "$backup_file"; then
        success "Резервная копия распакована"
    else
        error "Ошибка при распаковке резервной копии"
        return 1
    fi
}

install_dependencies() {
    log "Установка зависимостей..."
    
    cd "$PROJECT_DIR"
    
    if command -v pnpm >/dev/null 2>&1; then
        if pnpm install; then
            success "Зависимости установлены"
        else
            error "Ошибка при установке зависимостей"
            return 1
        fi
    else
        error "pnpm не найден. Установите pnpm и попробуйте снова"
        return 1
    fi
}

verify_restoration() {
    log "Проверка восстановления..."
    
    cd "$PROJECT_DIR"
    
    # Проверить основные файлы
    local required_files=("package.json" "tsconfig.json" "apps/api/package.json" "apps/web/package.json")
    local missing_files=()
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            missing_files+=("$file")
        fi
    done
    
    if [[ ${#missing_files[@]} -gt 0 ]]; then
        error "Отсутствуют файлы: ${missing_files[*]}"
        return 1
    fi
    
    success "Основные файлы найдены"
    
    # Проверить TypeScript
    log "Проверка TypeScript..."
    if pnpm run type-check >/dev/null 2>&1; then
        success "TypeScript проверка прошла"
    else
        warning "TypeScript проверка не прошла"
    fi
    
    # Проверить ESLint
    log "Проверка ESLint..."
    if pnpm run lint >/dev/null 2>&1; then
        success "ESLint проверка прошла"
    else
        warning "ESLint проверка не прошла"
    fi
}

start_services() {
    log "Запуск сервисов..."
    
    cd "$PROJECT_DIR"
    
    if [[ -f "scripts/start-all.sh" ]]; then
        if ./scripts/start-all.sh; then
            success "Сервисы запущены"
        else
            warning "Не удалось запустить сервисы автоматически"
        fi
    else
        warning "Скрипт запуска не найден, запустите сервисы вручную"
    fi
}

main() {
    echo "🚀 Восстановление SaleSpot BY из резервной копии"
    echo "================================================"
    
    # Очистить лог файл
    > "$LOG_FILE"
    
    # Проверить директорию проекта
    if [[ ! -d "$PROJECT_DIR" ]]; then
        error "Директория проекта не найдена: $PROJECT_DIR"
        exit 1
    fi
    
    # Найти последнюю резервную копию
    local latest_backup=$(find "$BACKUP_DIR" -name "salespot-by-complete-backup-*.tar.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)
    
    if [[ -z "$latest_backup" ]]; then
        error "Резервная копия не найдена в $BACKUP_DIR"
        exit 1
    fi
    
    # Найти файл контрольной суммы
    local backup_name=$(basename "$latest_backup" .tar.gz)
    local checksum_file="$BACKUP_DIR/backup-checksum-${backup_name#salespot-by-complete-backup-}.txt"
    
    log "Найдена резервная копия: $latest_backup"
    
    # Проверить резервную копию
    if ! check_backup_file "$latest_backup"; then
        exit 1
    fi
    
    # Проверить контрольную сумму
    if ! check_checksum "$latest_backup" "$checksum_file"; then
        exit 1
    fi
    
    # Остановить сервисы
    stop_services
    
    # Создать резервную копию текущего состояния
    create_current_backup
    
    # Очистить директорию проекта
    clean_project_directory
    
    # Восстановить из резервной копии
    if ! restore_from_backup "$latest_backup"; then
        exit 1
    fi
    
    # Установить зависимости
    if ! install_dependencies; then
        exit 1
    fi
    
    # Проверить восстановление
    if ! verify_restoration; then
        exit 1
    fi
    
    # Запустить сервисы
    start_services
    
    echo ""
    echo "🎉 Восстановление завершено успешно!"
    echo "================================================"
    echo "📊 Логи восстановления: $LOG_FILE"
    echo "🌐 Web приложение: http://localhost:3000"
    echo "🔌 API приложение: http://localhost:3001"
    echo "📚 Swagger документация: http://localhost:3001/docs"
    echo ""
    echo "Для проверки статуса выполните:"
    echo "  ./scripts/status.sh"
    echo ""
}

# Запуск основного скрипта
main "$@"
