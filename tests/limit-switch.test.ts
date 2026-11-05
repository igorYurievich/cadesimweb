import { describe, expect, it } from 'vitest';
import { computeSwitching, createEmptyInputs } from '@engine/index';
import { getCadType, isKnownCadType } from '../src/model/cad-types';
import { el, schemaOf } from './builders';

/** Конечный выключатель 8005 (-FC в Actividad 1.1.2): размыкающий контакт 11-12, размыкается при нажатии. */
describe('limit switch 8005', () => {
  const fc = el(8005, 10, 10, { id: 1, name: 'FC', terminals: [[0, 0, '11'], [0, 15, '12']] });
  const schema = schemaOf([], [fc]);

  it('is a known type with a behaviour', () => {
    expect(isKnownCadType(8005)).toBe(true);
    expect(getCadType(8005).family).toBe('pushbutton');
  });

  it('conducts at rest and opens while pressed', () => {
    const rest = computeSwitching(schema, createEmptyInputs());
    expect(rest.warnings).toEqual([]);
    expect(rest.contacts[1]).toBe(true);

    const inputs = createEmptyInputs();
    inputs.pressed[1] = true;
    expect(computeSwitching(schema, inputs).contacts[1]).toBe(false);
  });
});
