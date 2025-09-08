import { z } from 'zod';

// Тип для результата валидации
export type ValidationResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      errors: z.ZodError;
    };

// Универсальная функция валидации
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error };
}

// Функция для валидации с логированием ошибок
export function validateWithLogging<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`Validation error in ${context}:`, {
        errors: error.issues,
        data: JSON.stringify(data, null, 2),
      });
    }
    throw error;
  }
}

// Функция для валидации массива данных
export function validateArray<T>(schema: z.ZodSchema<T>, data: unknown[]): T[] {
  return z.array(schema).parse(data);
}

// Функция для валидации с дефолтными значениями
export function validateWithDefaults<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  defaults: Partial<T>
): T {
  const result = schema.safeParse(data);

  if (result.success) {
    return { ...defaults, ...result.data };
  }

  return { ...defaults } as T;
}

// Type guard для проверки, является ли объект валидным
export function isValidData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): data is T {
  return schema.safeParse(data).success;
}

// Функция для извлечения ошибок валидации в читаемом формате
export function getValidationErrors(error: z.ZodError): string[] {
  return error.issues.map(err => {
    const path = err.path.join('.');
    return `${path}: ${err.message}`;
  });
}

// Функция для валидации с кастомными сообщениями об ошибках
export function validateWithCustomMessages<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  customMessages: Record<string, string>
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const customError = new z.ZodError(
        error.issues.map(err => ({
          ...err,
          message: customMessages[err.path.join('.')] ?? err.message,
        }))
      );
      throw customError;
    }
    throw error;
  }
}
