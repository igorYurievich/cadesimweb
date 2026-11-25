import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildIdOf, injectServiceWorker } from '../tools/sw-precache';

const template = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8');

describe('service worker: список файлов и номер сборки', () => {
  it('подставляет все файлы сборки и свой номер версии в public/sw.js', () => {
    const files = ['assets/index-AbCdEf12.js', 'assets/es-Zz99Yy88.js', 'assets/index-Qq11Ww22.css'];
    const sw = injectServiceWorker(template, files);
    expect(sw).toContain(`const BUILD_ID = '${buildIdOf(files)}';`);
    expect(sw).toContain('"./assets/es-Zz99Yy88.js"');
    expect(sw).toContain('"./assets/index-AbCdEf12.js"');
    expect(sw).not.toContain("const BUILD_ID = 'dev';");
    expect(sw).not.toContain('const PRECACHE = [];');
  });

  it('новая сборка — новый кэш, та же сборка — тот же', () => {
    expect(buildIdOf(['a-1.js', 'b-2.js'])).toBe(buildIdOf(['b-2.js', 'a-1.js']));
    expect(buildIdOf(['a-1.js'])).not.toBe(buildIdOf(['a-2.js']));
  });

  it('удаляет кэши старых версий, а не держит один кэш на все версии', () => {
    expect(template).toContain("const LEGACY_CACHE = 'webcade-v1';");
    expect(template).toMatch(/caches\.delete/);
    expect(template).toContain('const CACHE = `${CACHE_PREFIX}${BUILD_ID}`;');
  });

  it('без строк-заготовок в шаблоне сборка падает с понятной ошибкой', () => {
    expect(() => injectServiceWorker('self.addEventListener("fetch", () => {});', [])).toThrow(/BUILD_ID/);
  });
});
