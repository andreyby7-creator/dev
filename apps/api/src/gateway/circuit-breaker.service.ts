import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface ICircuitBreakerConfig {
  timeout: number;
  errorThresholdPercentage: number;
  resetTimeout: number;
  volumeThreshold: number;
}

export interface ICircuitBreakerStats {
  state: CircuitState;
  failures: number;
  fallbacks: number;
  successes: number;
  total: number;
  lastFailureTime: Date | undefined;
  nextAttemptTime: Date | undefined;
}

interface ICircuitBreaker {
  state: CircuitState;
  failureCount: number;
  fallbackCount: number;
  successCount: number;
  totalCount: number;
  lastFailureTime: Date | undefined;
  nextAttemptTime: Date | undefined;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private circuits = new Map<string, ICircuitBreaker>();

  constructor(private _configService: ConfigService) {
    this._configService.get('CIRCUIT_BREAKER_ENABLED');
  }

  private getDefaultConfig(): ICircuitBreakerConfig {
    return {
      timeout: this._configService.get('CIRCUIT_BREAKER_TIMEOUT', 3000),
      errorThresholdPercentage: this._configService.get(
        'CIRCUIT_BREAKER_ERROR_THRESHOLD',
        50
      ),
      resetTimeout: this._configService.get(
        'CIRCUIT_BREAKER_RESET_TIMEOUT',
        30000
      ),
      volumeThreshold: this._configService.get(
        'CIRCUIT_BREAKER_VOLUME_THRESHOLD',
        10
      ),
    };
  }

  private getOrCreateCircuit(name: string): ICircuitBreaker {
    let circuit = this.circuits.get(name);
    if (!circuit) {
      circuit = {
        state: CircuitState.CLOSED,
        failureCount: 0,
        successCount: 0,
        totalCount: 0,
        fallbackCount: 0,
        lastFailureTime: undefined,
        nextAttemptTime: undefined,
      };
      this.circuits.set(name, circuit);
    }
    return circuit;
  }

  async execute<T>(
    name: string,
    fn: (...args: unknown[]) => Promise<T>,
    fallback?: (...args: unknown[]) => Promise<T>,
    ...args: unknown[]
  ): Promise<T> {
    const circuit = this.getOrCreateCircuit(name);
    const config = this.getDefaultConfig();

    // Проверяем состояние circuit breaker
    if (circuit.state === CircuitState.OPEN) {
      if (
        circuit.nextAttemptTime &&
        Date.now() < circuit.nextAttemptTime.getTime()
      ) {
        this.logger.warn(`Circuit ${name} is OPEN, using fallback`);
        circuit.fallbackCount++;
        if (fallback) {
          return fallback(...args);
        }
        throw new Error(`Circuit ${name} is OPEN`);
      } else {
        circuit.state = CircuitState.HALF_OPEN;
        this.logger.log(`Circuit ${name} is now HALF_OPEN`);
      }
    }

    try {
      const result = await fn(...args);

      // Успешное выполнение
      circuit.successCount++;
      circuit.totalCount++;
      circuit.failureCount = 0;

      if (circuit.state === CircuitState.HALF_OPEN) {
        circuit.state = CircuitState.CLOSED;
        this.logger.log(`Circuit ${name} is now CLOSED`);
      }

      return result;
    } catch (error) {
      // Ошибка выполнения
      circuit.failureCount++;
      circuit.totalCount++;
      circuit.lastFailureTime = new Date();

      const errorRate = (circuit.failureCount / circuit.totalCount) * 100;

      if (
        circuit.totalCount >= config.volumeThreshold &&
        errorRate >= config.errorThresholdPercentage
      ) {
        circuit.state = CircuitState.OPEN;
        circuit.nextAttemptTime = new Date(Date.now() + config.resetTimeout);
        this.logger.warn(
          `Circuit ${name} is now OPEN (error rate: ${errorRate.toFixed(2)}%)`
        );
      }

      if (fallback) {
        this.logger.warn(`Circuit ${name} failure, using fallback`);
        circuit.fallbackCount++;
        return fallback(...args);
      }

      throw error;
    }
  }

  getCircuit(name: string): ICircuitBreaker | undefined {
    return this.circuits.get(name);
  }

  getStats(name: string): ICircuitBreakerStats | undefined {
    const circuit = this.circuits.get(name);
    if (!circuit) return undefined;

    return {
      state: circuit.state,
      failures: circuit.failureCount,
      fallbacks: circuit.fallbackCount,
      successes: circuit.successCount,
      total: circuit.totalCount,
      lastFailureTime: circuit.lastFailureTime,
      nextAttemptTime: circuit.nextAttemptTime,
    };
  }

  getAllStats(): Map<string, ICircuitBreakerStats> {
    const stats = new Map<string, ICircuitBreakerStats>();
    for (const [name, circuit] of this.circuits.entries()) {
      stats.set(name, {
        state: circuit.state,
        failures: circuit.failureCount,
        fallbacks: circuit.fallbackCount,
        successes: circuit.successCount,
        total: circuit.totalCount,
        lastFailureTime: circuit.lastFailureTime,
        nextAttemptTime: circuit.nextAttemptTime,
      });
    }
    return stats;
  }

  resetCircuit(name: string): boolean {
    const circuit = this.circuits.get(name);
    if (circuit) {
      circuit.state = CircuitState.CLOSED;
      circuit.failureCount = 0;
      circuit.successCount = 0;
      circuit.totalCount = 0;
      circuit.fallbackCount = 0;
      circuit.lastFailureTime = undefined;
      circuit.nextAttemptTime = undefined;
      this.logger.log(`Circuit ${name} has been reset`);
      return true;
    }
    return false;
  }

  // Graceful Degradation
  async executeWithGracefulDegradation<T>(
    name: string,
    primaryFn: (...args: unknown[]) => Promise<T>,
    fallbackFn: (...args: unknown[]) => Promise<T>,
    ...args: unknown[]
  ): Promise<T> {
    try {
      return await this.execute(name, primaryFn, fallbackFn, ...args);
    } catch {
      this.logger.warn(`Graceful degradation for ${name}: using fallback`);
      return fallbackFn(...args);
    }
  }

  // Retry Mechanism
  async executeWithRetry<T>(
    name: string,
    fn: (...args: unknown[]) => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000,
    ...args: unknown[]
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.execute(name, fn, undefined, ...args);
      } catch (error) {
        lastError = error as Error;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(
          `Attempt ${attempt} failed for ${name}: ${errorMessage}`
        );

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    }

    if (!lastError) {
      throw new Error('Unknown error occurred during retry');
    }
    throw lastError;
  }

  // Health check для circuit breaker
  async healthCheck(): Promise<{
    status: string;
    circuits: number;
    openCircuits: number;
  }> {
    const circuits = Array.from(this.circuits.values());
    const openCircuits = circuits.filter(
      circuit => circuit.state === CircuitState.OPEN
    ).length;

    return {
      status: openCircuits === 0 ? 'healthy' : 'degraded',
      circuits: circuits.length,
      openCircuits,
    };
  }
}
