import { describe, expect, it } from 'vitest';
import { exportCad } from '@model/cad-export';
import { importCad } from '@model/cad-import';
import { PILOT_2D } from '@model/realistic-2d-types';
import { createEmptySchema } from '@model/types';
import { createPlacedElement } from '../src/ui/helpers';

// Цвет пилота 2D (8101) и лампы 9008 переживает сохранение в .cad и открытие (было: пилот 2D снова зелёный).
describe('lamp colors in .cad', () => {
  it('keeps green / red / yellow of 2D pilots and lamps, rotated too', () => {
    const schema = createEmptySchema();
    let x = 21;
    for (const code of [PILOT_2D, 9008]) {
      for (const rotation of [0, 1] as const) {
        for (const color of [0, 1, 2]) {
          const element = createPlacedElement(code, { x, y: 45 }, rotation, schema);
          element.params.color = color;
          schema.elements.push(element);
          x += 24;
        }
      }
    }
    const again = importCad(exportCad(schema)).schema;
    expect(again.elements.map((e) => [e.typeCode, e.rotation, e.params.color ?? 0]))
      .toEqual(schema.elements.map((e) => [e.typeCode, e.rotation, e.params.color]));
  });
});
