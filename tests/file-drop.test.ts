import { describe, expect, it } from 'vitest';
import { isOpenableFileName, splitDroppedFiles } from '../src/ui/file-drop';

describe('перетаскивание файлов на окно', () => {
  it('открывает .cad и .json в любом регистре', () => {
    expect(isOpenableFileName('Ejemplo 1.cad')).toBe(true);
    expect(isOpenableFileName('ESQUEMA.CAD')).toBe(true);
    expect(isOpenableFileName('schema.json')).toBe(true);
    expect(isOpenableFileName('foto.png')).toBe(false);
    expect(isOpenableFileName('notas.cad.txt')).toBe(false);
    expect(isOpenableFileName('cad')).toBe(false);
  });

  it('сохраняет порядок файлов и отделяет неподходящие', () => {
    const files = [{ name: 'a.cad' }, { name: 'b.pdf' }, { name: 'c.json' }, { name: 'd.txt' }];
    const { open, skipped } = splitDroppedFiles(files);
    expect(open.map((file) => file.name)).toEqual(['a.cad', 'c.json']);
    expect(skipped.map((file) => file.name)).toEqual(['b.pdf', 'd.txt']);
  });
});
