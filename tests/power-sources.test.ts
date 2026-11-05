import { describe, expect, it } from 'vitest';
import { catalog } from '@model/catalog';
import { cadTypeForCommand, getCadType, isKnownCadType } from '@model/cad-types';
import { importCad } from '@model/cad-import';
import { missingBehaviors, invalidTerminalIndexes } from '../src/engine/behaviors';
import { fixture } from './helpers';

/** Образец: по одной кнопке панели «Источники питания» (CADe_SIMU 4.2). */
const POWER_CODES = [3000, 3001, 3002, 3003, 3011, 3004, 3005, 3006, 3007, 3008, 3009, 3010, 3015, 3012, 3017, 3016, 3013, 3014, 3018, 3019, 3020];

describe('power sources: panel roster', () => {
  it('every button of the power-sources group maps to a .cad type', () => {
    const missing = catalog.inGroup('power-sources').filter((c) => !cadTypeForCommand(c.id)).map((c) => c.id);
    expect(missing).toEqual([]);
    expect(catalog.inGroup('power-sources')).toHaveLength(21);
  });

  it('all power type codes are known and have engine behavior', () => {
    for (const code of POWER_CODES) expect(isKnownCadType(code)).toBe(true);
    expect(missingBehaviors()).toEqual([]);
  });

  it('the sample file imports without unknown types', () => {
    const { schema, unknownTypes } = importCad(fixture('elementos_alimentacion.cad'));
    expect(unknownTypes).toEqual([]);
    const codes = new Set(schema.elements.map((e) => e.typeCode));
    for (const code of POWER_CODES) expect(codes.has(code)).toBe(true);
    for (const e of schema.elements) expect(invalidTerminalIndexes(e.typeCode, e.terminals.length)).toEqual([]);
  });

  it('terminal counts follow the sample', () => {
    const { schema } = importCad(fixture('elementos_alimentacion.cad'));
    const count = (code: number): number => schema.elements.find((e) => e.typeCode === code)?.terminals.length ?? -1;
    expect(count(3000)).toBe(1);
    expect(count(3003)).toBe(2);
    expect(count(3011)).toBe(3);
    expect(count(3004)).toBe(3);
    expect(count(3005)).toBe(4);
    expect(count(3007)).toBe(5);
    expect(count(3010)).toBe(2);
    expect(count(3012)).toBe(4);
    expect(count(3017)).toBe(6);
    expect(count(3016)).toBe(2);
    expect(count(3013)).toBe(4);
    expect(count(3014)).toBe(5);
    expect(count(3018)).toBe(6);
    expect(count(3019)).toBe(2);
  });

  it('families are set for the non-strip symbols', () => {
    expect(getCadType(3015).family).toBe('ground');
    expect(getCadType(3013).family).toBe('rectifier');
    expect(getCadType(3020).family).toBe('outlet');
  });
});
