import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// Mock Prisma для тестов
const mockPrisma = {
  user: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
};

beforeAll(async () => {
  // Настройка тестовой базы данных
});

afterEach(async () => {
  // Очистка моков после каждого теста
  vi.clearAllMocks();
});

afterAll(async () => {
  // Закрытие соединения
});

// Глобальные моки
(globalThis as Record<string, unknown>).prisma = mockPrisma;
