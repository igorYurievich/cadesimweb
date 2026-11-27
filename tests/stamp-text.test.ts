import { describe, expect, it } from 'vitest';
import { fitStampLine, layoutStampText, STAMP_LINE_HEIGHT, wrapStampWords } from '@ui/stamp-text';

const byChars = (max: number) => (line: string): boolean => line.length <= max;

describe('перенос текста в штампе', () => {
  it('переносит по словам, не разрывая их', () => {
    expect(wrapStampWords('Moto-bomba con dos sensores capacitivos', byChars(16)))
      .toEqual(['Moto-bomba con', 'dos sensores', 'capacitivos']);
  });

  it('слишком длинное слово режет на части', () => {
    expect(wrapStampWords('ab ABCDEFGHIJ', byChars(4))).toEqual(['ab', 'ABCD', 'EFGH', 'IJ']);
  });

  it('пустой текст даёт ноль строк', () => {
    expect(wrapStampWords('   ', byChars(10))).toEqual([]);
  });

  it('короткий заголовок остаётся одной строкой обычного размера', () => {
    expect(layoutStampText('Arranque directo', 70, 15, 2.6)).toEqual({ lines: ['Arranque directo'], size: 2.6 });
  });

  it('длинный заголовок виден целиком в несколько строк', () => {
    const title = 'Moto-bomba con dos sensores capacitivos y depósito de agua con alarma de nivel';
    const layout = layoutStampText(title, 40, 15, 2.6);
    expect(layout.lines.length).toBeGreaterThan(1);
    expect(layout.lines.join(' ')).toBe(title);
    expect(layout.lines.length * layout.size * STAMP_LINE_HEIGHT).toBeLessThanOrEqual(15);
  });

  it('если строк не хватает, уменьшает шрифт', () => {
    const title = 'palabra '.repeat(12).trim();
    const layout = layoutStampText(title, 40, 9, 2.6);
    expect(layout.size).toBeLessThan(2.6);
    expect(layout.lines.join(' ')).toBe(title);
  });

  it('на минимальном шрифте лишнее обрезается многоточием', () => {
    const layout = layoutStampText('texto '.repeat(200), 40, 9, 2.6);
    expect(layout.lines.at(-1)?.endsWith('…')).toBe(true);
    expect(layout.size).toBeGreaterThanOrEqual(2.6 * 0.55);
  });

  it('с настоящим измерителем строки заполняют ширину', () => {
    const narrow = (text: string, size: number): number => text.length * size * 0.4;
    const rough = layoutStampText('uno dos tres cuatro cinco seis siete ocho nueve diez', 30, 15, 2.6);
    const exact = layoutStampText('uno dos tres cuatro cinco seis siete ocho nueve diez', 30, 15, 2.6, narrow);
    expect(exact.lines.length).toBeLessThan(rough.lines.length);
  });

  it('однострочное обрезание работает как раньше', () => {
    expect(fitStampLine('abcdefghij', 6, 2)).toBe('abcd…');
    expect(fitStampLine('abc', 6, 2)).toBe('abc');
  });
});
