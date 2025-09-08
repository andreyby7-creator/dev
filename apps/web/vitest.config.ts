import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
// import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['**/*.test.ts', '**/*.spec.ts'],
    exclude: ['node_modules', '.next', 'dist', '.idea', '.git', '.cache'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        '**/*.stories.{js,jsx,ts,tsx}',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(process.cwd(), './src'),
    },
  },
});
