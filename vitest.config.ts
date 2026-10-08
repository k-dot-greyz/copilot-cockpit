import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'dex/06-tools/glitch-islands/**/*.test.ts'],
    exclude: ['tests/**', 'node_modules/**'],
  },
});
