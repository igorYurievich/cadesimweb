import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
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

describe('2D pilot color from CADe_SIMU files (nums[16])', () => {
  const pilots = (name: string) => importCad(readFileSync(`tests/fixtures/s7-1214/${name}`, 'latin1')).schema
    .elements.filter((e) => e.typeCode === PILOT_2D);

  it('reads the traffic light red / yellow / green and writes the same numbers back', () => {
    const schema = importCad(readFileSync('tests/fixtures/s7-1214/Ejemplo_Semaforo.cad', 'latin1')).schema;
    const lamps = schema.elements.filter((e) => e.typeCode === PILOT_2D);
    expect(lamps.map((e) => e.params.color)).toEqual([1, 2, 0]);
    const again = exportCad(schema);
    expect(again.match(/\*8101#-H#[^*]*(\*-?\d+){17}/g)?.map((r) => r.split('*').at(-1))).toEqual(['6', '9', '3']);
  });

  it('reads IGL21_Final as in CADe_SIMU: red, red, green, red, yellow (user screenshot)', () => {
    expect(pilots('IGL21_Final.cad').map((e) => e.params.color)).toEqual([1, 1, 0, 1, 2]);
  });

  it('keeps the number from the file until the color is changed', () => {
    const [lamp] = pilots('IGL21_Final.cad');
    expect(lamp?.params).toMatchObject({ pilotCadColor: 4 });
    const schema = createEmptySchema();
    if (lamp) schema.elements.push(lamp);
    expect(exportCad(schema)).toMatch(/\*8101#-H1#C_En#X1#X2######(\*-?\d+){16}\*4\*/);
    if (lamp) lamp.params.color = 2;
    expect(exportCad(schema)).toMatch(/\*8101#-H1#C_En#X1#X2######(\*-?\d+){16}\*7\*/);
  });
});
