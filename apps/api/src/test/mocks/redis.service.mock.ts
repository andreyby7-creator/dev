import { vi } from 'vitest';

export const createMockRedisService = () => ({
  set: vi.fn().mockResolvedValue('OK'),
  get: vi.fn().mockResolvedValue(null),
  del: vi.fn().mockResolvedValue(1),
  keys: vi.fn().mockResolvedValue([]),
  incr: vi.fn().mockResolvedValue(1),
  flushall: vi.fn().mockResolvedValue('OK'),
  ping: vi.fn().mockResolvedValue('PONG'),
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  isConnected: vi.fn().mockReturnValue(true),
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
});
