import { cleanup } from '@testing-library/react';
import { beforeAll, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom';

// Очистка DOM после каждого теста
afterEach(() => {
  cleanup();
});

beforeAll(() => {
  // Настройка глобальных моков для тестов
  Object.defineProperty(globalThis.window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});
