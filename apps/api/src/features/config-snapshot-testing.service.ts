import { Injectable, Logger } from '@nestjs/common';
import { getConfig } from '../config/env.config';

export interface IConfigSnapshot {
  id: string;
  name: string;
  description?: string;
  config: Record<string, unknown>;
  timestamp: Date;
  environment: string;
  version: string;
  checksum: string;
}

export interface IConfigSnapshotTest {
  id: string;
  snapshotId: string;
  name: string;
  description?: string;
  testFunction: (config: Record<string, unknown>) => boolean | Promise<boolean>;
  expectedResult: boolean;
  timeout?: number;
  retries?: number;
}

export interface IConfigSnapshotResult {
  testId: string;
  snapshotId: string;
  passed: boolean;
  duration: number;
  error?: string;
  timestamp: Date;
  configUsed: Record<string, unknown>;
}

@Injectable()
export class ConfigSnapshotTestingService {
  private readonly logger = new Logger(ConfigSnapshotTestingService.name);
  private readonly snapshots: Map<string, IConfigSnapshot> = new Map();
  private readonly tests: Map<string, IConfigSnapshotTest> = new Map();
  private readonly results: IConfigSnapshotResult[] = [];

  constructor() {
    this.initializeDefaultSnapshots();
    this.initializeDefaultTests();
  }

  /**
   * Создает снапшот текущей конфигурации
   */
  async createSnapshot(
    name: string,
    description?: string
  ): Promise<IConfigSnapshot> {
    const config = getConfig();
    const configObj = JSON.parse(JSON.stringify(config));
    const checksum = this.calculateChecksum(configObj);

    const snapshot: IConfigSnapshot = {
      id: this.generateId(),
      name,
      description: description ?? '',
      config: configObj,
      timestamp: new Date(),
      environment: process.env.NODE_ENV ?? 'development',
      version: process.env.npm_package_version ?? '1.0.0',
      checksum,
    };

    this.snapshots.set(snapshot.id, snapshot);
    this.logger.log(`Created config snapshot: ${snapshot.id}`, {
      name,
      checksum,
    });

    return snapshot;
  }

  /**
   * Загружает снапшот по ID
   */
  getSnapshot(snapshotId: string): IConfigSnapshot | undefined {
    return this.snapshots.get(snapshotId);
  }

  /**
   * Получает все снапшоты
   */
  getAllSnapshots(): IConfigSnapshot[] {
    return Array.from(this.snapshots.values());
  }

  /**
   * Создает тест для снапшота
   */
  createTest(test: Omit<IConfigSnapshotTest, 'id'>): IConfigSnapshotTest {
    const testWithId: IConfigSnapshotTest = {
      ...test,
      id: this.generateId(),
    };

    this.tests.set(testWithId.id, testWithId);
    this.logger.log(`Created config test: ${testWithId.id}`, {
      name: test.name,
    });

    return testWithId;
  }

  /**
   * Запускает тест для снапшота
   */
  async runTest(testId: string): Promise<IConfigSnapshotResult> {
    const test = this.tests.get(testId);
    if (!test) {
      throw new Error(`Test not found: ${testId}`);
    }

    const snapshot = this.snapshots.get(test.snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot not found: ${test.snapshotId}`);
    }

    const startTime = Date.now();
    let passed = false;
    let error: string | undefined;

    try {
      const result = await Promise.race([
        test.testFunction(snapshot.config),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Test timeout')),
            test.timeout ?? 5000
          )
        ),
      ]);

      passed = result === test.expectedResult;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      passed = false;
    }

    const duration = Date.now() - startTime;

    const result: IConfigSnapshotResult = {
      testId,
      snapshotId: test.snapshotId,
      passed,
      duration,
      error: error ?? '',
      timestamp: new Date(),
      configUsed: snapshot.config,
    };

    this.results.push(result);
    this.logger.log(`Test completed: ${testId}`, { passed, duration, error });

    return result;
  }

  /**
   * Запускает все тесты для снапшота
   */
  async runAllTests(snapshotId: string): Promise<IConfigSnapshotResult[]> {
    const tests = Array.from(this.tests.values()).filter(
      test => test.snapshotId === snapshotId
    );

    const results: IConfigSnapshotResult[] = [];
    for (const test of tests) {
      const result = await this.runTest(test.id);
      results.push(result);
    }

    return results;
  }

  /**
   * Получает результаты тестов
   */
  getTestResults(testId?: string): IConfigSnapshotResult[] {
    if (testId != null && testId !== '') {
      return this.results.filter(result => result.testId === testId);
    }
    return this.results;
  }

  /**
   * Сравнивает два снапшоты
   */
  compareSnapshots(
    snapshotId1: string,
    snapshotId2: string
  ): {
    differences: Record<string, { old: unknown; new: unknown }>;
    added: string[];
    removed: string[];
    unchanged: string[];
  } {
    const snapshot1 = this.snapshots.get(snapshotId1);
    const snapshot2 = this.snapshots.get(snapshotId2);

    if (!snapshot1 || !snapshot2) {
      throw new Error('One or both snapshots not found');
    }

    const keys1 = Object.keys(snapshot1.config);
    const keys2 = Object.keys(snapshot2.config);

    const added = keys2.filter(key => !keys1.includes(key));
    const removed = keys1.filter(key => !keys2.includes(key));
    const unchanged = keys1.filter(
      key =>
        keys2.includes(key) &&
        JSON.stringify(snapshot1.config[key]) ===
          JSON.stringify(snapshot2.config[key])
    );

    const differences: Record<string, { old: unknown; new: unknown }> = {};
    keys1.forEach(key => {
      if (keys2.includes(key) && !unchanged.includes(key)) {
        differences[key] = {
          old: snapshot1.config[key],
          new: snapshot2.config[key],
        };
      }
    });

    return { differences, added, removed, unchanged };
  }

  /**
   * Валидирует снапшот
   */
  validateSnapshot(snapshotId: string): boolean {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) return false;

    const currentChecksum = this.calculateChecksum(snapshot.config);
    return currentChecksum === snapshot.checksum;
  }

  /**
   * Удаляет старые снапшоты
   */
  cleanupOldSnapshots(maxAge: number): number {
    const cutoff = new Date(Date.now() - maxAge);
    let deleted = 0;

    for (const [id, snapshot] of this.snapshots.entries()) {
      if (snapshot.timestamp < cutoff) {
        this.snapshots.delete(id);
        deleted++;
      }
    }

    this.logger.log(`Cleaned up ${deleted} old snapshots`);
    return deleted;
  }

  private initializeDefaultSnapshots(): void {
    // Создаем базовый снапшот при инициализации
    void this.createSnapshot('initial', 'Initial configuration snapshot');
  }

  private initializeDefaultTests(): void {
    // Тест на наличие обязательных переменных
    this.createTest({
      snapshotId: 'initial',
      name: 'Required Environment Variables',
      description: 'Check that all required environment variables are present',
      testFunction: config => {
        const required = ['NODE_ENV', 'PORT', 'DATABASE_URL'];
        return required.every(key => config[key] != null && config[key] !== '');
      },
      expectedResult: true,
    });

    // Тест на валидность конфигурации
    this.createTest({
      snapshotId: 'initial',
      name: 'Configuration Validation',
      description: 'Validate that configuration is properly structured',
      testFunction: config => {
        return typeof config === 'object';
      },
      expectedResult: true,
    });
  }

  private generateId(): string {
    return `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateChecksum(obj: Record<string, unknown>): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }
}
