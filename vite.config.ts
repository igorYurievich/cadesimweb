import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';
import { swPrecachePlugin } from './tools/sw-precache';

const src = (p: string) => fileURLToPath(new URL(`./src/${p}`, import.meta.url));

export default defineConfig({
  // public/sw.js получает список файлов сборки и номер версии (офлайн и очистка старых кэшей).
  plugins: [swPrecachePlugin()],
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
