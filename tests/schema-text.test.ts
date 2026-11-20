import { describe, expect, it } from 'vitest';
import { exportCad } from '@model/cad-export';
import { importCad } from '@model/cad-import';
import { createEmptySchema } from '@model/types';
import { cleanText, createTextElement, resizeTexts, TEXT_HEIGHT } from '../src/ui/text-tool';

// Надпись на схеме (ПКМ → «Текст»): элемент 8, текст после записи, рамка 2 единицы на символ × 4.
describe('schematic text (type 8)', () => {
  it('cleans characters that the .cad format uses as separators', () => {
    expect(cleanText('  Motor #1 * arranque $  ')).toBe('Motor 1 arranque');
  });

  it('writes a new text like CADe_SIMU and reads it back', () => {
    const schema = createEmptySchema();
    schema.elements.push(createTextElement(schema, { x: 60, y: 90 }, 'Circuito de mando'));
    const text = exportCad(schema);
    expect(text).toMatch(/\*8### 0# 0# 0# 0# 0# 0# 0# 0(\*[-\d]+)+#Circuito de mando/);
    const again = importCad(text).schema.elements.find((e) => e.typeCode === 8);
    expect([again?.params.text, again?.size.w, again?.size.h]).toEqual(['Circuito de mando', 34, 4]);
  });

  it('keeps the text and its frame after editing and moving an imported text', () => {
    const schema = createEmptySchema();
    schema.elements.push(createTextElement(schema, { x: 60, y: 90 }, 'A'));
    const imported = importCad(exportCad(schema)).schema;
    const label = imported.elements.find((e) => e.typeCode === 8);
    if (!label) throw new Error('нет текста');
    label.params.text = 'Parada';
    label.size = { w: 12, h: 4 };
    label.position = { x: 120, y: 150 };
    const again = importCad(exportCad(imported)).schema.elements.find((e) => e.typeCode === 8);
    expect([again?.params.text, again?.position.x, again?.size.w, again?.size.h]).toEqual(['Parada', 120, 12, 4]);
  });

  it('grows and shrinks a selected text with +/- and keeps the size in .cad', () => {
    const schema = createEmptySchema();
    const label = createTextElement(schema, { x: 60, y: 90 }, 'Motor');
    schema.elements.push(label);
    expect(resizeTexts(schema, [label.id], 1)).toBe(true);
    expect(resizeTexts(schema, [label.id], 1)).toBe(true);
    expect(label.size).toEqual({ w: 15, h: 6 });
    const again = importCad(exportCad(schema)).schema.elements.find((e) => e.typeCode === 8);
    expect(again?.size).toEqual({ w: 15, h: 6 });
    label.size = { w: 5, h: TEXT_HEIGHT.min };
    expect(resizeTexts(schema, [label.id], -1)).toBe(false);
    expect(resizeTexts(schema, [999], 1)).toBe(false);
  });
});
