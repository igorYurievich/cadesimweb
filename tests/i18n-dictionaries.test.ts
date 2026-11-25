import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fillText, isInterfaceLang, loadInterfaceText } from '../src/ui/i18n';
import ru from '../src/ui/i18n/ru';

// Словари интерфейса: одинаковые ключи во всех языках, нет мёртвых ключей, нет арабского,
// нет русских строк, зашитых в код интерфейса мимо словарей.

const LANGS = ['es', 'en', 'it', 'ru', 'fr'] as const;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith('.ts') ? [path] : [];
  });
}

/** Код без комментариев: русские комментарии в проекте — норма. */
function withoutComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

const uiSources = sourceFiles('src/ui').filter((path) => !path.includes('i18n'));

describe('словари интерфейса', () => {
  it('во всех языках те же ключи, что в ru, и ни одной пустой строки', async () => {
    const keys = Object.keys(ru).sort();
    for (const lang of LANGS) {
      const text = await loadInterfaceText(lang);
      expect(Object.keys(text).sort(), lang).toEqual(keys);
      expect(Object.entries(text).filter(([, value]) => value.trim() === '').map(([key]) => key), lang).toEqual([]);
    }
  });

  it('каждый ключ где-то используется в коде', () => {
    const code = sourceFiles('src').filter((path) => !path.includes('i18n')).map((path) => readFileSync(path, 'utf8'));
    const unused = Object.keys(ru).filter((key) => !code.some((text) => new RegExp(`\\b${key}\\b`).test(text)));
    expect(unused).toEqual([]);
  });

  it('арабского больше нет: сохранённый код ar открывает испанский', async () => {
    expect(isInterfaceLang('ar')).toBe(false);
    expect((await loadInterfaceText('ar')).file).toBe('Archivo');
    const arabic = sourceFiles('src').filter((path) => /[؀-ۿ]/.test(readFileSync(path, 'utf8')));
    expect(arabic).toEqual([]);
  });

  it('в коде интерфейса нет русских строк мимо словарей', () => {
    // Разрешено: разметка app-shell (переводится сразу после запуска), строки-таблицы «ru: …»
    // с переводами по языкам и сообщения для разработчика (исключения и console.error).
    const allowed = /^\s*ru: |throw new|console\.error/;
    const found = uiSources.filter((path) => !path.endsWith('app-shell.ts')).flatMap((path) =>
      withoutComments(readFileSync(path, 'utf8')).split('\n')
        .filter((line) => /[А-Яа-яЁё]/.test(line) && !allowed.test(line))
        .map((line) => `${path}: ${line.trim()}`));
    expect(found).toEqual([]);
  });

  it('fillText подставляет значения и не трогает неизвестные метки', () => {
    expect(fillText('Добавлен {name}, {count} шт. {x}', { name: 'KM1', count: 2 })).toBe('Добавлен KM1, 2 шт. {x}');
  });
});
