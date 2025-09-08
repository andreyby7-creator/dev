/**
 * Универсальная утилита для безопасной работы с environment variables
 */

interface GetEnvOptions {
  default?: string | number | boolean;
  required?: boolean;
}

type EnvType = 'string' | 'number' | 'boolean';

type GetEnvReturnType<T extends EnvType> = T extends 'string'
  ? string
  : T extends 'number'
    ? number
    : boolean;

/**
 * Получить environment variable с типизацией и валидацией
 * @param key - ключ переменной окружения
 * @param type - тип возвращаемого значения
 * @param options - опции (default, required)
 * @returns значение переменной или default
 */
export function getEnv<K extends keyof NodeJS.ProcessEnv, T extends EnvType>(
  key: K,
  type: T,
  options: GetEnvOptions = {}
): GetEnvReturnType<T> {
  const { default: defaultValue, required = false } = options;
  const value = process.env[key];

  // Проверка на required
  if (required && (value === undefined || value === '')) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }

  // Если значение не установлено, возвращаем default
  if (value === undefined || value === '') {
    if (defaultValue !== undefined) {
      return defaultValue as GetEnvReturnType<T>;
    }

    // Если нет default и не required, возвращаем пустое значение для типа
    switch (type) {
      case 'string':
        return '' as GetEnvReturnType<T>;
      case 'number':
        return 0 as GetEnvReturnType<T>;
      case 'boolean':
        return false as GetEnvReturnType<T>;
    }
  }

  // Конвертация к нужному типу
  switch (type) {
    case 'string':
      return value as GetEnvReturnType<T>;

    case 'number': {
      const num = parseFloat(value || '0');
      if (isNaN(num)) {
        if (defaultValue !== undefined) {
          return defaultValue as GetEnvReturnType<T>;
        }
        throw new Error(
          `Environment variable ${key} must be a valid number, got: ${value}`
        );
      }
      return num as GetEnvReturnType<T>;
    }

    case 'boolean':
      if (value === 'true' || value === '1' || value === 'yes') {
        return true as GetEnvReturnType<T>;
      }
      if (value === 'false' || value === '0' || value === 'no') {
        return false as GetEnvReturnType<T>;
      }
      if (defaultValue !== undefined) {
        return defaultValue as GetEnvReturnType<T>;
      }
      throw new Error(
        `Environment variable ${key} must be a valid boolean (true/false, 1/0, yes/no), got: ${value}`
      );

    default:
      throw new Error(`Unsupported type: ${type}`);
  }
}

/**
 * Получить string environment variable
 */
export function getEnvString<K extends keyof NodeJS.ProcessEnv>(
  key: K,
  options?: GetEnvOptions
): string {
  return getEnv(key, 'string', options);
}

/**
 * Получить number environment variable
 */
export function getEnvNumber<K extends keyof NodeJS.ProcessEnv>(
  key: K,
  options?: GetEnvOptions
): number {
  return getEnv(key, 'number', options);
}

/**
 * Получить boolean environment variable
 */
export function getEnvBoolean<K extends keyof NodeJS.ProcessEnv>(
  key: K,
  options?: GetEnvOptions
): boolean {
  return getEnv(key, 'boolean', options);
}

/**
 * Проверить, установлена ли environment variable
 */
export function hasEnv<K extends keyof NodeJS.ProcessEnv>(key: K): boolean {
  const value = process.env[key];
  return value !== undefined && value !== '';
}
