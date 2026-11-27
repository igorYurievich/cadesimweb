import { describe, expect, it } from 'vitest';
import { exportCad } from '@model/cad-export';
import { importCad } from '@model/cad-import';
import { buttonColorName } from '@model/pushbutton-2d';
import { createEmptySchema } from '@model/types';
import { createPlacedElement } from '../src/ui/helpers';
import { pushbutton2dHitFrame } from '../src/ui/symbols/symbol-hit-area';
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

  // Рамка захвата повторяет рисунок (плюс 1): цветной корпус сдвинут вправо на 6 и лежит в x 2…19,
  // простой рисунок — в x 0…15. Иначе в горизонтальном положении рамка торчала сбоку от кнопки.
  it('fits the hit frame to the drawn body in both views', () => {
    const schema = createEmptySchema();
    const button = createPlacedElement(8100, { x: 60, y: 60 }, 1, schema);
    expect(pushbutton2dHitFrame(button)).toEqual({ x: 1, y: -1, w: 19, h: 29 });
    button.params.view2d = 'simple';
    expect(pushbutton2dHitFrame(button)).toEqual({ x: -1, y: -1, w: 17, h: 29 });
  });
});
