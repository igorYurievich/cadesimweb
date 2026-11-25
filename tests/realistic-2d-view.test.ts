import { describe, expect, it } from 'vitest';
import { exportCad } from '@model/cad-export';
import { COLOR_VIEW_TYPES, hasViewChoice, isSimpleView } from '@model/realistic-2d-types';
import { createEmptySchema } from '@model/types';
import { createPlacedElement } from '../src/ui/helpers';

// Выбор вида 2D-символа: цветной (по умолчанию) или «Vista simple» (линейный, как раньше).
describe('2D view choice (color / simple)', () => {
  it('offers the choice for the 2D symbols with a color drawing and 2D motors', () => {
    expect([...COLOR_VIEW_TYPES].sort((a, b) => a - b)).toEqual([
      4011, 6015, 6016, 6017, 6018, 6019, 6020, 7018, 7019, 7020, 7021, 8100, 8101, 8110, 8120, 8121, 8122, 8123, 8124, 8125,
      10202, 10214, 10220, 10230, 60171, 60172, 60182, 60191, 60201,
    ]);
    expect(hasViewChoice({ typeCode: 7018, params: {} })).toBe(true);
    expect(hasViewChoice({ typeCode: 1000, params: { motor2d: true } })).toBe(true);
    expect(hasViewChoice({ typeCode: 1000, params: {} })).toBe(false);
    expect(hasViewChoice({ typeCode: 9008, params: {} })).toBe(false);
  });

  it('defaults to the color view and switches only with view2d = simple', () => {
    expect(isSimpleView({ params: {} })).toBe(false);
    expect(isSimpleView({ params: { view2d: 'color' } })).toBe(false);
    expect(isSimpleView({ params: { view2d: 'simple' } })).toBe(true);
  });

  it('does not change the .cad export (the view lives only in the web schema)', () => {
    const make = (simple: boolean): string => {
      const schema = createEmptySchema();
      const element = createPlacedElement(7018, { x: 60, y: 60 }, 0, schema);
      if (simple) element.params.view2d = 'simple';
      schema.elements.push(element);
      return exportCad(schema);
    };
    expect(make(true)).toBe(make(false));
  });
});
