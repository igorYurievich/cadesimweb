import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { exportCad } from '@model/cad-export';
import { importCad } from '@model/cad-import';
import { createEmptySchema } from '@model/types';
import { createPlacedElement } from '../src/ui/helpers';

// Питание LOGO / DM8 (24 / 230 V) переживает сохранение в .cad (было: после открытия снова 24 V).
describe('LOGO / DM8 supply in .cad', () => {
  for (const [logo, dm8] of [[230, 230], [24, 230], [230, 24], [24, 24]] as const) {
    it(`keeps LOGO ${logo} V and DM8 ${dm8} V`, () => {
      const schema = createEmptySchema();
      const base = createPlacedElement(10202, { x: 30, y: 30 }, 0, schema);
      base.params.supply = logo;
      schema.elements.push(base);
      const module = createPlacedElement(10214, { x: 135, y: 30 }, 0, schema);
      module.params.supply = dm8;
      schema.elements.push(module);
      const again = importCad(exportCad(schema)).schema;
      expect(again.elements.map((e) => [e.typeCode, e.params.supply])).toEqual([[10202, logo], [10214, dm8]]);
      // Экспорт → импорт → экспорт даёт тот же файл.
      expect(exportCad(again)).toBe(exportCad(importCad(exportCad(again)).schema));
    });
  }

  it('leaves CADe_SIMU files without the field at the default 24 V', () => {
    const file = importCad(readFileSync('tests/fixtures/CADe_S1.cad', 'latin1')).schema;
    const logo = file.elements.find((e) => e.typeCode === 10202);
    expect(logo?.params.supply).toBeUndefined();
  });
});
