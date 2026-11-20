import { describe, expect, it } from 'vitest';
import { exportCad } from '@model/cad-export';
import { importCad } from '@model/cad-import';
import { buttonColorName } from '@model/pushbutton-2d';
import { createEmptySchema } from '@model/types';
import { createPlacedElement } from '../src/ui/helpers';
import { fixture } from './helpers';

// Цвет кнопки 2D (8100) — nums[16]: 6 красная («стоп»), 3 зелёная («пуск»), 0 по умолчанию.
describe('2D pushbutton color (8100, nums[16])', () => {
  it('reads stop as red and start as green in Actividad 1.7', () => {
    const buttons = importCad(fixture('actividad_1_7_2d.cad')).schema.elements.filter((e) => e.typeCode === 8100);
    const byName = Object.fromEntries(buttons.map((e) => [e.name, buttonColorName(e)]));
    expect(byName).toEqual({ '-S1': 'red', '-S2': 'green', '-S3': 'green' });
  });

  it('keeps the default button without a color param', () => {
    const buttons = importCad(fixture('2d-simbolos.cad')).schema.elements.filter((e) => e.typeCode === 8100);
    expect(buttons.every((e) => e.params.buttonColor === undefined && buttonColorName(e) === 'black')).toBe(true);
  });

  it('writes the chosen color to nums[16] and reads it back', () => {
    const schema = createEmptySchema();
    const button = createPlacedElement(8100, { x: 60, y: 60 }, 0, schema);
    button.params.buttonColor = 6;
    schema.elements.push(button);
    const again = importCad(exportCad(schema)).schema.elements.find((e) => e.typeCode === 8100);
    expect(again?.params.buttonColor).toBe(6);
  });
});
