import { describe, expect, it } from 'vitest';
import { exportCad } from '@model/cad-export';
import {
  BACK_VIEW, MECH_BULB, MECH_CROSS, MECH_PUSH, MECH_SOCKET, MECH_SWITCH, MECH_TWO_WAY, hasBackView, isBackView,
} from '@model/mechanisms';
import { hasViewChoice, isSimpleView } from '@model/realistic-2d-types';
import { createEmptySchema } from '@model/types';
import { createPlacedElement } from '../src/ui/helpers';

// «Вид сзади» у выключателя, проходного, перекрёстного и кнопки (только веб, params.view2d = 'back').
describe('mechanism back view', () => {
  it('is offered for the switch, two-way, cross switch and push button only', () => {
    for (const code of [MECH_SWITCH, MECH_TWO_WAY, MECH_CROSS, MECH_PUSH]) {
      expect(hasBackView(code)).toBe(true);
      expect(hasViewChoice({ typeCode: code, params: {} })).toBe(true);
    }
    expect(hasBackView(MECH_SOCKET)).toBe(false);
    expect(hasBackView(MECH_BULB)).toBe(false);
    expect(hasBackView(7018)).toBe(false);
  });

  it('is on only with view2d = back and never counts as the simple view', () => {
    expect(isBackView({ typeCode: MECH_SWITCH, params: {} })).toBe(false);
    expect(isBackView({ typeCode: MECH_SWITCH, params: { view2d: BACK_VIEW } })).toBe(true);
    expect(isBackView({ typeCode: MECH_SOCKET, params: { view2d: BACK_VIEW } })).toBe(false);
    expect(isSimpleView({ params: { view2d: BACK_VIEW } })).toBe(false);
  });

  it('does not change the .cad export (the view lives only in the web schema)', () => {
    const make = (back: boolean): string => {
      const schema = createEmptySchema();
      const element = createPlacedElement(MECH_CROSS, { x: 60, y: 60 }, 0, schema);
      if (back) element.params.view2d = BACK_VIEW;
      schema.elements.push(element);
      return exportCad(schema);
    };
    expect(make(true)).toBe(make(false));
  });
});
