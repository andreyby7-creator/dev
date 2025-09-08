import { Injectable, Logger } from '@nestjs/common';

export interface ITestFixture {
  id: string;
  name: string;
  description?: string;
  type: 'user' | 'data' | 'config' | 'mock' | 'custom';
  data: Record<string, unknown>;
  dependencies?: string[];
  cleanup?: () => Promise<void>;
  setup?: () => Promise<void>;
}

export interface ITestEnvironment {
  id: string;
  name: string;
  description?: string;
  fixtures: ITestFixture[];
  config: Record<string, unknown>;
  createdAt: Date;
  isActive: boolean;
}

export interface ITestFixtureResult {
  fixtureId: string;
  environmentId: string;
  success: boolean;
  duration: number;
  error?: string;
  timestamp: Date;
}

@Injectable()
export class TestFixturesService {
  private readonly logger = new Logger(TestFixturesService.name);
  private readonly fixtures: Map<string, ITestFixture> = new Map();
  private readonly environments: Map<string, ITestEnvironment> = new Map();
  private readonly results: ITestFixtureResult[] = [];

  constructor() {
    this.initializeDefaultFixtures();
  }

  /**
   * Создает тестовый fixture
   */
  createFixture(fixture: Omit<ITestFixture, 'id'>): ITestFixture {
    const fixtureWithId: ITestFixture = {
      ...fixture,
      id: this.generateId('fixture'),
    };

    this.fixtures.set(fixtureWithId.id, fixtureWithId);
    this.logger.log(`Created test fixture: ${fixtureWithId.id}`, {
      name: fixture.name,
    });

    return fixtureWithId;
  }

  /**
   * Создает тестовое окружение
   */
  async createEnvironment(
    name: string,
    description?: string,
    fixtureIds?: string[]
  ): Promise<ITestEnvironment> {
    const environment: ITestEnvironment = {
      id: this.generateId('env'),
      name,
      description: description ?? '',
      fixtures: fixtureIds
        ? (fixtureIds
            .map(id => this.fixtures.get(id))
            .filter(Boolean) as ITestFixture[])
        : [],
      config: this.getDefaultTestConfig(),
      createdAt: new Date(),
      isActive: true,
    };

    this.environments.set(environment.id, environment);
    this.logger.log(`Created test environment: ${environment.id}`, {
      name,
      fixtureCount: environment.fixtures.length,
    });

    return environment;
  }

  /**
   * Настраивает тестовое окружение
   */
  async setupEnvironment(environmentId: string): Promise<ITestFixtureResult[]> {
    const environment = this.environments.get(environmentId);
    if (!environment) {
      throw new Error(`Environment not found: ${environmentId}`);
    }

    const results: ITestFixtureResult[] = [];

    for (const fixture of environment.fixtures) {
      const result = await this.setupFixture(fixture.id, environmentId);
      results.push(result);
    }

    this.logger.log(`Environment setup completed: ${environmentId}`, {
      totalFixtures: environment.fixtures.length,
      successful: results.filter(r => r.success).length,
    });

    return results;
  }

  /**
   * Настраивает отдельный fixture
   */
  async setupFixture(
    fixtureId: string,
    environmentId: string
  ): Promise<ITestFixtureResult> {
    const fixture = this.fixtures.get(fixtureId);
    if (!fixture) {
      throw new Error(`Fixture not found: ${fixtureId}`);
    }

    const startTime = Date.now();
    let success = false;
    let error: string | undefined;

    try {
      if (fixture.setup) {
        await fixture.setup();
      }
      success = true;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
      success = false;
    }

    const duration = Date.now() - startTime;

    const result: ITestFixtureResult = {
      fixtureId,
      environmentId,
      success,
      duration,
      error: error ?? '',
      timestamp: new Date(),
    };

    this.results.push(result);
    this.logger.log(`Fixture setup completed: ${fixtureId}`, {
      success,
      duration,
      error,
    });

    return result;
  }

  /**
   * Очищает тестовое окружение
   */
  async cleanupEnvironment(environmentId: string): Promise<void> {
    const environment = this.environments.get(environmentId);
    if (!environment) {
      throw new Error(`Environment not found: ${environmentId}`);
    }

    for (const fixture of environment.fixtures) {
      if (fixture.cleanup) {
        try {
          await fixture.cleanup();
        } catch (error) {
          this.logger.error(`Failed to cleanup fixture: ${fixture.id}`, error);
        }
      }
    }

    environment.isActive = false;
    this.logger.log(`Environment cleanup completed: ${environmentId}`);
  }

  /**
   * Получает fixture по ID
   */
  getFixture(fixtureId: string): ITestFixture | undefined {
    return this.fixtures.get(fixtureId);
  }

  /**
   * Получает все fixtures
   */
  getAllFixtures(): ITestFixture[] {
    return Array.from(this.fixtures.values());
  }

  /**
   * Получает окружение по ID
   */
  getEnvironment(environmentId: string): ITestEnvironment | undefined {
    return this.environments.get(environmentId);
  }

  /**
   * Получает все активные окружения
   */
  getActiveEnvironments(): ITestEnvironment[] {
    return Array.from(this.environments.values()).filter(env => env.isActive);
  }

  /**
   * Получает результаты тестов
   */
  getFixtureResults(fixtureId?: string): ITestFixtureResult[] {
    if (fixtureId != null && fixtureId !== '') {
      return this.results.filter(result => result.fixtureId === fixtureId);
    }
    return this.results;
  }

  /**
   * Создает пользовательский fixture
   */
  createUserFixture(userData: {
    email: string;
    role: string;
    permissions?: string[];
  }): ITestFixture {
    return this.createFixture({
      name: `User: ${userData.email}`,
      description: `Test user with role: ${userData.role}`,
      type: 'user',
      data: userData,
      setup: async () => {
        // Здесь была бы логика создания пользователя в тестовой БД
        this.logger.log(`Creating test user: ${userData.email}`);
      },
      cleanup: async () => {
        // Здесь была бы логика удаления пользователя из тестовой БД
        this.logger.log(`Cleaning up test user: ${userData.email}`);
      },
    });
  }

  /**
   * Создает fixture с тестовыми данными
   */
  createDataFixture(name: string, data: Record<string, unknown>): ITestFixture {
    return this.createFixture({
      name,
      description: `Test data fixture: ${name}`,
      type: 'data',
      data,
      setup: async () => {
        this.logger.log(`Setting up test data: ${name}`);
      },
      cleanup: async () => {
        this.logger.log(`Cleaning up test data: ${name}`);
      },
    });
  }

  /**
   * Создает mock fixture
   */
  createMockFixture(
    name: string,
    mockData: Record<string, unknown>
  ): ITestFixture {
    return this.createFixture({
      name,
      description: `Mock fixture: ${name}`,
      type: 'mock',
      data: mockData,
      setup: async () => {
        this.logger.log(`Setting up mock: ${name}`);
      },
      cleanup: async () => {
        this.logger.log(`Cleaning up mock: ${name}`);
      },
    });
  }

  /**
   * Клонирует окружение
   */
  async cloneEnvironment(
    sourceEnvironmentId: string,
    newName: string
  ): Promise<ITestEnvironment> {
    const source = this.environments.get(sourceEnvironmentId);
    if (!source) {
      throw new Error(`Source environment not found: ${sourceEnvironmentId}`);
    }

    const cloned: ITestEnvironment = {
      id: this.generateId('env'),
      name: newName,
      description: `Cloned from: ${source.name}`,
      fixtures: [...source.fixtures],
      config: { ...source.config },
      createdAt: new Date(),
      isActive: true,
    };

    this.environments.set(cloned.id, cloned);
    this.logger.log(
      `Cloned environment: ${sourceEnvironmentId} -> ${cloned.id}`
    );

    return cloned;
  }

  /**
   * Экспортирует окружение
   */
  exportEnvironment(environmentId: string): string {
    const environment = this.environments.get(environmentId);
    if (!environment) {
      throw new Error(`Environment not found: ${environmentId}`);
    }

    return JSON.stringify(environment, null, 2);
  }

  /**
   * Импортирует окружение
   */
  importEnvironment(environmentData: string): ITestEnvironment {
    try {
      const environment = JSON.parse(environmentData) as ITestEnvironment;
      environment.id = this.generateId('env');
      environment.createdAt = new Date();
      environment.isActive = true;

      this.environments.set(environment.id, environment);
      this.logger.log(`Imported environment: ${environment.id}`);

      return environment;
    } catch (error) {
      throw new Error(`Failed to import environment: ${error}`);
    }
  }

  private initializeDefaultFixtures(): void {
    // Создаем базовые fixtures
    this.createUserFixture({
      email: 'test@example.com',
      role: 'user',
      permissions: ['read'],
    });

    this.createUserFixture({
      email: 'admin@example.com',
      role: 'admin',
      permissions: ['read', 'write', 'delete'],
    });

    this.createDataFixture('sample-cards', {
      cards: [
        { id: '1', name: 'Test Card 1', type: 'loyalty' },
        { id: '2', name: 'Test Card 2', type: 'discount' },
      ],
    });

    this.createMockFixture('external-api', {
      apiResponses: {
        '/users': { status: 200, data: [] },
        '/cards': { status: 200, data: [] },
      },
    });
  }

  private getDefaultTestConfig(): Record<string, unknown> {
    return {
      database: {
        url: 'postgresql://test:test@localhost:5432/test_db',
        ssl: false,
      },
      redis: {
        url: 'redis://localhost:6379',
      },
      logging: {
        level: 'debug',
        enabled: true,
      },
      testing: {
        timeout: 5000,
        retries: 3,
      },
    };
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
