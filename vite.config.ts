import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

const src = (p: string) => fileURLToPath(new URL(`./src/${p}`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@engine': src('engine'),
      '@model': src('model'),
      '@ui': src('ui'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
