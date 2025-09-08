/**
 * Утилита для безопасного логирования с автоматическим скрытием секретов
 */
export class RedactedLogger {
  private readonly sensitiveKeys = [
    'JWT_SECRET',
    'ENCRYPTION_KEY',
    'API_KEY_SECRET',
    'SUPABASE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
    'TELEGRAM_BOT_TOKEN',
    'SLACK_WEBHOOK_URL',
    'password',
    'secret',
    'token',
    'key',
  ];

  private readonly sensitivePatterns = [
    /password/i,
    /secret/i,
    /token/i,
    /key/i,
    /auth/i,
    /credential/i,
  ];

  constructor(private readonly context?: string) {}

  /**
   * Проверяет, содержит ли ключ чувствительную информацию
   */
  private isSensitiveKey(key: string): boolean {
    const lowerKey = key.toLowerCase();
    return (
      this.sensitiveKeys.some(sensitive =>
        lowerKey.includes(sensitive.toLowerCase())
      ) || this.sensitivePatterns.some(pattern => pattern.test(key))
    );
  }

  /**
   * Скрывает чувствительные значения в объекте
   */
  private redactObject(obj: unknown, depth = 0): unknown {
    if (depth > 3) return '[MAX_DEPTH]'; // Защита от циклических ссылок

    if (obj == null) return obj;
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => this.redactObject(item, depth + 1));
    }

    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (this.isSensitiveKey(key)) {
        redacted[key] = '***REDACTED***';
      } else if (typeof value === 'object' && value != null) {
        redacted[key] = this.redactObject(value, depth + 1);
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }

  /**
   * Безопасное логирование объекта
   */
  log(message: string, context?: string, data?: unknown): void {
    const logContext = context ?? this.context ?? 'RedactedLogger';
    if (data != null) {
      const redactedData = this.redactObject(data);

      console.log(
        `[${logContext}] ${message} ${JSON.stringify(redactedData, null, 2)}`
      );
    } else {
      console.log(`[${logContext}] ${message}`);
    }
  }

  /**
   * Безопасное логирование ошибки
   */
  error(
    message: string,
    trace?: string,
    context?: string,
    data?: unknown
  ): void {
    const logContext = context ?? this.context ?? 'RedactedLogger';
    if (data != null) {
      const redactedData = this.redactObject(data);

      console.error(
        `[${logContext}] ERROR: ${message} ${JSON.stringify(redactedData, null, 2)}`
      );
      if (trace != null) {
        console.error(`[${logContext}] TRACE: ${trace}`);
      }
    } else {
      console.error(`[${logContext}] ERROR: ${message}`);
      if (trace != null) {
        console.error(`[${logContext}] TRACE: ${trace}`);
      }
    }
  }

  /**
   * Логирование с объектом данных (безопасный метод)
   */
  errorWithData(message: string, data: unknown, context?: string): void {
    const logContext = context ?? this.context ?? 'RedactedLogger';
    const redactedData = this.redactObject(data);

    console.error(
      `[${logContext}] ERROR: ${message} ${JSON.stringify(redactedData, null, 2)}`
    );
  }

  /**
   * Безопасное логирование предупреждения
   */
  warn(message: string, context?: string, data?: unknown): void {
    const logContext = context ?? this.context ?? 'RedactedLogger';
    if (data != null) {
      const redactedData = this.redactObject(data);

      console.warn(
        `[${logContext}] WARN: ${message} ${JSON.stringify(redactedData, null, 2)}`
      );
    } else {
      console.warn(`[${logContext}] WARN: ${message}`);
    }
  }

  /**
   * Безопасное логирование отладочной информации
   */
  debug(message: string, context?: string, data?: unknown): void {
    const logContext = context ?? this.context ?? 'RedactedLogger';
    if (data != null) {
      const redactedData = this.redactObject(data);

      console.debug(
        `[${logContext}] DEBUG: ${message} ${JSON.stringify(redactedData, null, 2)}`
      );
    } else {
      console.debug(`[${logContext}] DEBUG: ${message}`);
    }
  }

  /**
   * Безопасное логирование конфигурации
   */
  logConfig(config: unknown, context = 'Config'): void {
    this.log('Configuration loaded:', context, config);
  }

  /**
   * Безопасное логирование переменных окружения
   */
  logEnvironment(env: NodeJS.ProcessEnv, context = 'Environment'): void {
    const redactedEnv: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(env)) {
      if (this.isSensitiveKey(key)) {
        redactedEnv[key] = '***REDACTED***';
      } else {
        redactedEnv[key] = value;
      }
    }
    this.log('Environment variables:', context, redactedEnv);
  }
}

/**
 * Глобальный экземпляр безопасного логгера
 */
export const redactedLogger = new RedactedLogger('RedactedLogger');
