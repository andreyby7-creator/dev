#!/bin/bash

# Скрипт для исправления ConfigService в тестах

echo "🔧 Исправляем ConfigService в тестах..."

# Список файлов для исправления
FILES=(
  "src/devops/services/__tests__/pipeline-monitoring.service.spec.ts"
  "src/devops/services/__tests__/pipeline.service.spec.ts"
  "src/infrastructure/services/__tests__/ansible.service.spec.ts"
  "src/infrastructure/services/__tests__/backup.service.spec.ts"
  "src/infrastructure/services/__tests__/cloud-resource.service.spec.ts"
  "src/infrastructure/services/__tests__/cloudformation.service.spec.ts"
  "src/infrastructure/services/__tests__/configuration.service.spec.ts"
  "src/infrastructure/services/__tests__/deployment.service.spec.ts"
  "src/infrastructure/services/__tests__/docker.service.spec.ts"
  "src/infrastructure/services/__tests__/gitops.service.spec.ts"
  "src/infrastructure/services/__tests__/kubernetes.service.spec.ts"
  "src/infrastructure/services/__tests__/local-cloud.service.spec.ts"
  "src/infrastructure/services/__tests__/terraform.service.spec.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ Исправляем $file"
    
    # Добавляем импорт ConfigService если его нет
    if ! grep -q "import.*ConfigService" "$file"; then
      sed -i '1i import { ConfigService } from "@nestjs/config";' "$file"
    fi
    
    # Добавляем импорт мока если его нет
    if ! grep -q "createMockConfigService" "$file"; then
      sed -i '/import.*ConfigService/a import { createMockConfigService } from "../../../test/mocks/config.service.mock";' "$file"
    fi
    
    # Заменяем создание мока ConfigService
    sed -i 's/const mockConfigService = {[^}]*};/const mockConfigService = createMockConfigService();/g' "$file"
    
    # Добавляем ConfigService в providers если его нет
    if ! grep -q "provide: ConfigService" "$file"; then
      sed -i '/providers: \[/a\        {\n          provide: ConfigService,\n          useValue: mockConfigService,\n        },' "$file"
    fi
  else
    echo "❌ Файл не найден: $file"
  fi
done

echo "🎉 Исправление завершено!"
