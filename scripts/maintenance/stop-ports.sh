#!/bin/bash
# Использование: ./scripts/devops/stop-ports.sh
# Command: cd /home/boss/Projects/dev && ./scripts/stop-ports.sh

# Скрипт для остановки процессов на портах 3000 и 3001

echo "🛑 Останавливаю процессы на портах 3000 и 3001..."

# Остановка процесса на порту 3000
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "📱 Останавливаю процесс на порту 3000 (Web)..."
    lsof -ti:3000 | xargs kill -9
    echo "✅ Порт 3000 освобожден"
else
    echo "ℹ️  Порт 3000 свободен"
fi

# Остановка процесса на порту 3001
if lsof -ti:3001 > /dev/null 2>&1; then
    echo "🔌 Останавливаю процесс на порту 3001 (API)..."
    lsof -ti:3001 | xargs kill -9
    echo "✅ Порт 3001 освобожден"
else
    echo "ℹ️  Порт 3001 свободен"
fi

echo "🎯 Все порты освобождены!"
