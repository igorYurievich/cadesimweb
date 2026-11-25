/**
 * Плагин сборки для public/sw.js: подставляет номер сборки (BUILD_ID) и список всех файлов сборки
 * (PRECACHE), чтобы service worker скачал их при установке, а у каждой версии был свой кэш.
 * Номер сборки — хеш от имён файлов: имена содержат хеш содержимого, поэтому новая версия программы
 * даёт новый номер, а пересборка того же кода — тот же самый.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

const BUILD_ID_LINE = /^const BUILD_ID = '[^']*';$/m;
const PRECACHE_LINE = /^const PRECACHE = \[[^\]]*\];$/m;

/** Номер сборки по списку файлов. */
export function buildIdOf(files: readonly string[]): string {
  return createHash('sha256').update([...files].sort().join('\n')).digest('hex').slice(0, 12);
}

/** Текст sw.js с подставленными BUILD_ID и PRECACHE. Без нужных строк в шаблоне — ошибка сборки. */
export function injectServiceWorker(template: string, files: readonly string[]): string {
  if (!BUILD_ID_LINE.test(template) || !PRECACHE_LINE.test(template)) {
    throw new Error('sw.js: не найдены строки «const BUILD_ID = …;» и «const PRECACHE = […];»');
  }
  const list = [...files].sort().map((file) => `./${file}`);
  return template
    .replace(BUILD_ID_LINE, `const BUILD_ID = '${buildIdOf(files)}';`)
    .replace(PRECACHE_LINE, `const PRECACHE = ${JSON.stringify(list)};`);
}

export function swPrecachePlugin(): Plugin {
  let outDir = 'dist';
  const files: string[] = [];
  return {
    name: 'webcade-sw-precache',
    apply: 'build',
    configResolved(config) { outDir = resolve(config.root, config.build.outDir); },
    generateBundle(_options, bundle) {
      files.length = 0;
      for (const name of Object.keys(bundle)) if (!name.endsWith('.map') && name !== 'index.html') files.push(name);
    },
    closeBundle() {
      const target = resolve(outDir, 'sw.js');
      if (!existsSync(target)) return; // Сборка без public/ (например, библиотека): sw.js нет.
      writeFileSync(target, injectServiceWorker(readFileSync(target, 'utf8'), files));
    },
  };
}
