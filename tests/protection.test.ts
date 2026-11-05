import { describe, expect, it } from 'vitest';
import { catalog } from '@model/catalog';
import { cadTypeForCommand, getCadType, isKnownCadType } from '@model/cad-types';
import { importCad } from '@model/cad-import';
import { missingBehaviors, invalidTerminalIndexes } from '../src/engine/behaviors';
import { fixture } from './helpers';

/** Образец: по одной кнопке панели «Automáticos, diferenciales, relé térmico, disyuntores, limitadores» (CADe_SIMU 4.2). */
const PROTECTION_CODES = [6000, 6001, 6002, 6003, 6004, 6005, 6006, 6007, 6010, 6011, 6008, 6009, 6012, 6013, 6014];
const TERMINALS: Record<number, number> = { 6000: 2, 6001: 4, 6002: 4, 6003: 6, 6004: 8, 6005: 4, 6006: 8, 6007: 6, 6008: 4, 6009: 6, 6010: 2, 6011: 4, 6012: 8, 6013: 3, 6014: 5 };

describe('protection: panel roster', () => {
  it('every button of the protection group maps to a .cad type, in panel order', () => {
    const items = catalog.inGroup('protection');
    expect(items).toHaveLength(15);
    expect(items.map((c) => cadTypeForCommand(c.id)?.code)).toEqual(PROTECTION_CODES);
  });

  it('all protection codes are known and have engine behavior', () => {
    for (const code of PROTECTION_CODES) expect(isKnownCadType(code)).toBe(true);
    expect(missingBehaviors()).toEqual([]);
    expect(getCadType(6013).family).toBe('surge-limiter');
  });

  it('the sample file imports without unknown types and with the expected terminals', () => {
    const { schema, unknownTypes } = importCad(fixture('elementos_proteccion.cad'));
    expect(unknownTypes).toEqual([]);
    for (const code of PROTECTION_CODES) {
      const e = schema.elements.find((el) => el.typeCode === code);
      expect(e?.terminals.length).toBe(TERMINALS[code]);
      expect(invalidTerminalIndexes(code, e?.terminals.length ?? 0)).toEqual([]);
    }
    const limiter = schema.elements.find((el) => el.typeCode === 6014);
    expect(limiter?.terminals.map((t) => [t.offset.x, t.offset.y])).toEqual([[0, 0], [6, 0], [12, 0], [18, 0], [0, 18]]);
  });
});
