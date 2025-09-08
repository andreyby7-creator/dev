#!/bin/bash
# Использование: ./scripts/backup/create-backup.sh

# Create Backup Script
# Usage: ./scripts/create-backup.sh

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
LOG_FILE="/tmp/backup.log"

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

check_project_status() {
    log "Проверка статуса проекта..."
    
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
    
    # Проверить тесты
    log "Проверка тестов..."
    if pnpm test >/dev/null 2>&1; then
        success "Тесты прошли"
    else
        warning "Тесты не прошли"
    fi
}

create_backup_directory() {
    log "Создание директории для резервных копий..."
    
    if [[ ! -d "$BACKUP_DIR" ]]; then
        mkdir -p "$BACKUP_DIR"
        success "Директория создана: $BACKUP_DIR"
    else
        log "Директория уже существует: $BACKUP_DIR"
    fi
}

create_backup() {
    local timestamp=$(date +%Y%m%d-%H%M)
    local backup_file="$BACKUP_DIR/salespot-by-complete-backup-$timestamp.tar.gz"
    
    log "Создание резервной копии..."
    log "Файл: $backup_file"
    
    cd "$PROJECT_DIR"
    
    # Создать резервную копию
    if tar -czf "$backup_file" \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=dist \
        --exclude=build \
        --exclude=.next \
        --exclude=backups \
        --exclude=*.log \
        --exclude=*.tmp \
        .; then
        
        success "Резервная копия создана: $backup_file"
        log "Размер: $(du -sh "$backup_file" | cut -f1)"
    else
        error "Ошибка при создании резервной копии"
        return 1
    fi
}

create_checksum() {
    local backup_file="$1"
    local timestamp=$(date +%Y%m%d-%H%M)
    local checksum_file="$BACKUP_DIR/backup-checksum-$timestamp.txt"
    
    log "Создание контрольной суммы..."
    
    if sha256sum "$backup_file" > "$checksum_file"; then
        success "Контрольная сумма создана: $checksum_file"
        log "Контрольная сумма: $(cat "$checksum_file" | cut -d' ' -f1)"
    else
        error "Ошибка при создании контрольной суммы"
        return 1
    fi
}

verify_backup() {
    local backup_file="$1"
    local checksum_file="$2"
    
    log "Проверка резервной копии..."
    
    # Проверить размер файла
    local file_size=$(du -sh "$backup_file" | cut -f1)
    log "Размер файла: $file_size"
    
    # Проверить контрольную сумму
    if [[ -f "$checksum_file" ]]; then
        if sha256sum -c "$checksum_file"; then
            success "Контрольная сумма верна"
        else
            error "Контрольная сумма не совпадает!"
            return 1
        fi
    fi
    
    # Проверить содержимое архива
    log "Проверка содержимого архива..."
    local file_count=$(tar -tzf "$backup_file" | wc -l)
    log "Количество файлов в архиве: $file_count"
    
    # Проверить основные файлы в архиве
    local required_files=("package.json" "tsconfig.json" "apps/api/package.json" "apps/web/package.json")
    local missing_files=()
    
    for file in "${required_files[@]}"; do
        if ! tar -tzf "$backup_file" | grep -q "^$file$"; then
            missing_files+=("$file")
        fi
    done
    
    if [[ ${#missing_files[@]} -gt 0 ]]; then
        error "В архиве отсутствуют файлы: ${missing_files[*]}"
        return 1
    fi
    
    success "Основные файлы найдены в архиве"
}

cleanup_old_backups() {
    log "Очистка старых резервных копий..."
    
    # Оставить только последние 5 резервных копий
    local backup_count=$(find "$BACKUP_DIR" -name "salespot-by-complete-backup-*.tar.gz" | wc -l)
    
    if [[ $backup_count -gt 5 ]]; then
        local files_to_remove=$(find "$BACKUP_DIR" -name "salespot-by-complete-backup-*.tar.gz" -printf '%T@ %p\n' | sort -n | head -$((backup_count - 5)) | cut -d' ' -f2-)
        
        for file in $files_to_remove; do
            local checksum_file="${file%.tar.gz}"
            checksum_file="${checksum_file#salespot-by-complete-backup-}"
            checksum_file="$BACKUP_DIR/backup-checksum-$checksum_file.txt"
            
            rm -f "$file" "$checksum_file"
            log "Удален старый файл: $file"
        done
        
        success "Старые резервные копии удалены"
    else
        log "Количество резервных копий в пределах нормы ($backup_count/5)"
    fi
}

update_readme() {
    log "Обновление README..."
    
    local backup_file="$1"
    local checksum_file="$2"
    local timestamp=$(date +%Y%m%d-%H%M)
    
    # Обновить информацию в README
    if [[ -f "$BACKUP_DIR/README.md" ]]; then
        # Создать временный файл с обновленной информацией
        local temp_readme="/tmp/backup-readme.md"
        
        cat > "$temp_readme" << EOF
# 💾 Резервные копии SaleSpot BY

## 📋 Обзор

Эта папка содержит полные резервные копии проекта SaleSpot BY для надежного восстановления.

## 📁 Структура файлов

- \`salespot-by-complete-backup-YYYYMMDD-HHMM.tar.gz\` - Полная резервная копия проекта
- \`backup-checksum-YYYYMMDD-HHMM.txt\` - Контрольная сумма для проверки целостности
- \`README.md\` - Этот файл с инструкциями

## 🔍 Информация о последней резервной копии

**Дата создания**: $(date)
**Размер**: $(du -sh "$backup_file" | cut -f1)
**Файл**: $(basename "$backup_file")
**Контрольная сумма**: $(cat "$checksum_file" | cut -d' ' -f1)

## 📦 Что включено в резервную копию

### ✅ Включено:
- Все исходные файлы проекта
- Конфигурационные файлы
- Документация
- Скрипты
- Тесты
- Миграции
- Планы миграции

### ❌ Исключено:
- \`node_modules/\` - Зависимости (устанавливаются заново)
- \`.git/\` - Git история (восстанавливается из репозитория)
- \`dist/\` - Скомпилированные файлы
- \`build/\` - Файлы сборки
- \`.next/\` - Next.js кеш
- \`backups/\` - Сама папка резервных копий

## 🚀 Восстановление проекта

### Быстрое восстановление:
\`\`\`bash
cd /home/boss/Projects/dev && ./scripts/restore-from-backup.sh
\`\`\`

### Ручное восстановление:
\`\`\`bash
# 1. Остановить сервисы
./scripts/stop-all.sh

# 2. Очистить директорию
find . -mindepth 1 -maxdepth 1 ! -name 'backups' ! -name '.git' -exec rm -rf {} +

# 3. Распаковать резервную копию
tar -xzf backups/$(basename "$backup_file")

# 4. Установить зависимости
pnpm install

# 5. Запустить сервисы
./scripts/start-all.sh
\`\`\`

## 🚨 Проверка целостности

\`\`\`bash
# Проверить контрольную сумму
sha256sum -c backups/$(basename "$checksum_file")

# Проверить содержимое архива
tar -tzf backups/$(basename "$backup_file") | head -20
\`\`\`

## 📈 История резервных копий

| Дата | Файл | Размер | Статус |
|------|------|--------|--------|
| $(date +%Y-%m-%d) | $(basename "$backup_file") | $(du -sh "$backup_file" | cut -f1) | ✅ Создана |

## 🎉 Готово!

После успешного восстановления ваш проект SaleSpot BY будет полностью функциональным и готовым к работе!
EOF
        
        # Заменить README
        mv "$temp_readme" "$BACKUP_DIR/README.md"
        success "README обновлен"
    fi
}

main() {
    echo "💾 Создание резервной копии SaleSpot BY"
    echo "======================================"
    
    # Очистить лог файл
    > "$LOG_FILE"
    
    # Проверить директорию проекта
    if [[ ! -d "$PROJECT_DIR" ]]; then
        error "Директория проекта не найдена: $PROJECT_DIR"
        exit 1
    fi
    
    # Создать директорию для резервных копий
    create_backup_directory
    
    # Проверить статус проекта
    if ! check_project_status; then
        warning "Проект имеет проблемы, но резервная копия будет создана"
    fi
    
    # Создать резервную копию
    local backup_file=""
    if create_backup; then
        backup_file=$(find "$BACKUP_DIR" -name "salespot-by-complete-backup-*.tar.gz" -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)
    else
        exit 1
    fi
    
    # Создать контрольную сумму
    local checksum_file=""
    if create_checksum "$backup_file"; then
        checksum_file=$(find "$BACKUP_DIR" -name "backup-checksum-*.txt" -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2-)
    else
        exit 1
    fi
    
    # Проверить резервную копию
    if ! verify_backup "$backup_file" "$checksum_file"; then
        exit 1
    fi
    
    # Очистить старые резервные копии
    cleanup_old_backups
    
    # Обновить README
    update_readme "$backup_file" "$checksum_file"
    
    echo ""
    echo "🎉 Резервная копия создана успешно!"
    echo "======================================"
    echo "📁 Файл: $backup_file"
    echo "🔒 Контрольная сумма: $checksum_file"
    echo "📊 Размер: $(du -sh "$backup_file" | cut -f1)"
    echo "📄 Логи: $LOG_FILE"
    echo ""
    echo "Для восстановления выполните:"
    echo "  ./scripts/restore-from-backup.sh"
    echo ""
}

# Запуск основного скрипта
main "$@"
