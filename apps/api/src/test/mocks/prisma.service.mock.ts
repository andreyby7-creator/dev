import { vi } from 'vitest';

export const createMockPrismaService = () => ({
  $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
  $executeRaw: vi.fn().mockResolvedValue(1),
  $transaction: vi.fn().mockImplementation(fn => fn()),
  $connect: vi.fn().mockResolvedValue(undefined),
  $disconnect: vi.fn().mockResolvedValue(undefined),
  $on: vi.fn(),
  $use: vi.fn(),
  user: {
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  },
});
