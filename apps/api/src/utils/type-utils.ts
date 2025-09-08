import { z } from 'zod';

/**
 * Утилиты для оптимизации типов и минимизации кода
 */

// Тип для извлечения только определенных полей из объекта
export type PickFields<T, K extends keyof T> = Pick<T, K>;

// Тип для создания optional версии объекта
export type OptionalFields<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

// Тип для создания required версии объекта
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Тип для создания readonly версии объекта
export type ReadonlyFields<T, K extends keyof T> = Omit<T, K> &
  Readonly<Pick<T, K>>;

// Утилита для создания Zod схемы из TypeScript типа
export function createZodSchema<T>() {
  return z.custom<T>();
}

// Утилита для безопасного извлечения значений из объекта
export function safeGet<T, K extends keyof T>(
  obj: T,
  key: K
): T[K] | undefined {
  return obj[key];
}

// Утилита для создания объекта с только определенными полями
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  return keys.reduce(
    (result, key) => {
      if (key in obj) {
        result[key] = obj[key];
      }
      return result;
    },
    {} as Pick<T, K>
  );
}

// Утилита для создания объекта без определенных полей
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  return Object.keys(obj).reduce(
    (result, key) => {
      if (!keys.includes(key as K)) {
        (result as Record<string, unknown>)[key] = obj[key];
      }
      return result;
    },
    {} as Omit<T, K>
  );
}

// Утилита для глубокого клонирования объекта
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as T;
  }

  if (typeof obj === 'object') {
    const cloned = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }

  return obj;
}

// Утилита для проверки, является ли значение пустым
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === 'string') {
    return value.trim().length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }

  return false;
}

// Утилита для создания debounce функции
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Утилита для создания throttle функции
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Утилита для создания мемоизированной функции
export function memoize<T extends (...args: unknown[]) => unknown>(func: T): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key) as ReturnType<T>;
    }

    const result = func(...args);
    cache.set(key, result as ReturnType<T>);
    return result;
  }) as T;
}

// Утилита для создания pipe функции
export function pipe<T>(...fns: Array<(arg: T) => T>) {
  return (value: T): T => fns.reduce((acc, fn) => fn(acc), value);
}

// Утилита для создания compose функции
export function compose<T>(...fns: Array<(arg: T) => T>) {
  return (value: T): T => fns.reduceRight((acc, fn) => fn(acc), value);
}

// Утилита для создания curry функции
export function curry<T extends (...args: unknown[]) => unknown>(
  func: T,
  arity = func.length
): (...args: unknown[]) => ReturnType<T> {
  return function curried(...args: unknown[]) {
    if (args.length >= arity) {
      return func(...args) as ReturnType<T>;
    }

    return ((...moreArgs: unknown[]) =>
      curried(...args, ...moreArgs)) as ReturnType<T>;
  };
}

// Утилита для создания partial функции
export function partial<T extends (...args: unknown[]) => unknown>(
  func: T,
  ...partialArgs: unknown[]
): (...args: unknown[]) => ReturnType<T> {
  return ((...args: unknown[]) => func(...partialArgs, ...args)) as (
    ...args: unknown[]
  ) => ReturnType<T>;
}

// Утилита для создания once функции
export function once<T extends (...args: unknown[]) => unknown>(func: T): T {
  let called = false;
  let result: ReturnType<T>;

  return ((...args: Parameters<T>) => {
    if (!called) {
      result = func(...args) as ReturnType<T>;
      called = true;
    }
    return result;
  }) as T;
}

// Утилита для создания retry функции
export function retry<T extends (...args: unknown[]) => Promise<unknown>>(
  func: T,
  maxAttempts = 3,
  delay = 1000
): T {
  return ((...args: Parameters<T>) => {
    return new Promise((resolve, reject) => {
      let attempts = 0;

      const attempt = async () => {
        attempts++;

        try {
          const result = await func(...args);
          resolve(result);
        } catch (error) {
          if (attempts >= maxAttempts) {
            reject(error);
          } else {
            setTimeout(() => {
              void attempt();
            }, delay);
          }
        }
      };

      void attempt();
    });
  }) as T;
}
