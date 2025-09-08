#!/bin/bash
# Использование: ./scripts/quality/check-quality.sh

# 🚀 Скрипт анализа качества кода SaleSpot BY
# Показывает статистику ошибок и предупреждений TypeScript и ESLint

set -e

echo "🔍 Анализ качества кода SaleSpot BY"
echo "=================================="
echo ""

# Переходим в корневую директорию проекта
cd "$(dirname "$0")/.."

# Функция для подсчета ошибок в выводе
count_errors() {
    local output="$1"
    local pattern="$2"
    echo "$output" | grep -c "$pattern" || echo "0"
}

# Функция для подсчета предупреждений в выводе
count_warnings() {
    local output="$1"
    local pattern="$2"
    echo "$output" | grep -c "$pattern" || echo "0"
}

echo "📊 TypeScript проверка..."
echo "------------------------"

# Запускаем TypeScript проверку и сохраняем вывод
TS_OUTPUT=$(cd "$(dirname "$0")/../../apps/api" && pnpm run type-check 2>&1 || true)

# Подсчитываем ошибки TypeScript
TS_ERRORS=$(count_errors "$TS_OUTPUT" "error TS")
TS_WARNINGS=$(count_warnings "$TS_OUTPUT" "warning TS")

echo "✅ TypeScript ошибки: $TS_ERRORS"
echo "⚠️  TypeScript предупреждения: $TS_WARNINGS"

echo ""
echo "📊 ESLint проверка..."
echo "-------------------"

# Запускаем ESLint проверку и сохраняем вывод
ES_OUTPUT=$(cd "$(dirname "$0")/../../apps/api" && pnpm run lint 2>&1 || true)

# Подсчитываем ошибки и предупреждения ESLint
ES_ERRORS=$(count_errors "$ES_OUTPUT" "error")
ES_WARNINGS=$(count_warnings "$ES_OUTPUT" "warning")

echo "❌ ESLint ошибки: $ES_ERRORS"
echo "⚠️  ESLint предупреждения: $ES_WARNINGS"

echo ""
echo "📈 Общая статистика"
echo "=================="

# Убираем лишние переносы строк из переменных
TS_ERRORS=$(echo "$TS_ERRORS" | tr -d '\n')
TS_WARNINGS=$(echo "$TS_WARNINGS" | tr -d '\n')
ES_ERRORS=$(echo "$ES_ERRORS" | tr -d '\n')
ES_WARNINGS=$(echo "$ES_WARNINGS" | tr -d '\n')

TOTAL_TS=$((TS_ERRORS + TS_WARNINGS))
TOTAL_ES=$((ES_ERRORS + ES_WARNINGS))
TOTAL_ALL=$((TOTAL_TS + TOTAL_ES))

echo "🔢 Всего TypeScript: $TOTAL_TS ($TS_ERRORS ошибок, $TS_WARNINGS предупреждений)"
echo "🔢 Всего ESLint: $TOTAL_ES ($ES_ERRORS ошибок, $ES_WARNINGS предупреждений)"
echo "🔢 Всего проблем: $TOTAL_ALL"

echo ""
echo "📊 Детальная статистика по файлам"
echo "================================"

# Показываем ошибки по файлам
echo "📁 TypeScript ошибки по файлам:"
echo "$TS_OUTPUT" | grep "error TS" | sed 's/.*│ \(.*\):.*/\1/' | sort | uniq -c | sort -nr || echo "Нет ошибок TypeScript"

echo ""
echo "📁 ESLint ошибки по файлам:"
echo "$ES_OUTPUT" | grep "error" | sed 's/.*│ \(.*\):.*/\1/' | sort | uniq -c | sort -nr || echo "Нет ошибок ESLint"

echo ""
echo "🎯 Рекомендации"
echo "=============="

if [ "$TS_ERRORS" -eq 0 ] && [ "$ES_ERRORS" -eq 0 ]; then
    echo "✅ Отлично! Все ошибки исправлены!"
elif [ "$TS_ERRORS" -gt 0 ]; then
    echo "🔧 Приоритет: исправить $TS_ERRORS ошибок TypeScript"
    echo "   TypeScript ошибки критичны для типизации"
elif [ "$ES_ERRORS" -gt 0 ]; then
    echo "🔧 Приоритет: исправить $ES_ERRORS ошибок ESLint"
    echo "   ESLint ошибки влияют на качество кода"
fi

if [ "$TS_WARNINGS" -gt 0 ] || [ "$ES_WARNINGS" -gt 0 ]; then
    echo "💡 Дополнительно: рассмотреть $((TS_WARNINGS + ES_WARNINGS)) предупреждений"
fi

echo ""
echo "🔄 Для повторной проверки запустите: ./scripts/check-quality.sh"
echo "📝 Для исправления ошибок используйте: pnpm run lint:fix"
echo "🔍 Для детального анализа: pnpm run type-check && pnpm run lint"

# Возвращаем код ошибки если есть критические проблемы
if [ "$TS_ERRORS" -gt 0 ] || [ "$ES_ERRORS" -gt 0 ]; then
    exit 1
else
    exit 0
fi
