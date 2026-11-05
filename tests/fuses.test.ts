import { describe, expect, it } from 'vitest';
import { catalog } from '@model/catalog';
import { cadTypeForCommand, getCadType, isKnownCadType } from '@model/cad-types';
import { importCad } from '@model/cad-import';
import { missingBehaviors, invalidTerminalIndexes } from '../src/engine/behaviors';
import { computeSwitching } from '../src/engine/switching';
import type { UserInputs } from '../src/engine/types';
import { fixture } from './helpers';

/** Образец: по одной кнопке панели «Fusibles y seccionadores» (CADe_SIMU 4.2). */
const FUSE_CODES = [5000, 5001, 5002, 5003, 5004, 5005, 5006, 5007, 5008, 5009];
const TERMINALS = [2, 4, 4, 6, 8, 2, 4, 4, 6, 8];

describe('fuses: panel roster', () => {
  it('every button of the fuses group maps to a .cad type', () => {
    const missing = catalog.inGroup('fuses').filter((c) => !cadTypeForCommand(c.id)).map((c) => c.id);
    expect(missing).toEqual([]);
    expect(catalog.inGroup('fuses')).toHaveLength(10);
  });

  it('panel order matches type codes', () => {
    expect(catalog.inGroup('fuses').map((c) => cadTypeForCommand(c.id)?.code)).toEqual(FUSE_CODES);
  });

  it('all fuse type codes are known and have engine behavior', () => {
    for (const code of FUSE_CODES) {
      expect(isKnownCadType(code)).toBe(true);
      expect(getCadType(code).family).toBe('fuse');
    }
    expect(missingBehaviors()).toEqual([]);
  });

  it('the sample file imports without unknown types and with the expected terminals', () => {
    const { schema, unknownTypes } = importCad(fixture('elementos_fusibles.cad'));
    expect(unknownTypes).toEqual([]);
    FUSE_CODES.forEach((code, i) => {
      const e = schema.elements.find((el) => el.typeCode === code);
      expect(e?.terminals.length).toBe(TERMINALS[i]);
      expect(invalidTerminalIndexes(code, e?.terminals.length ?? 0)).toEqual([]);
    });
    const iin = schema.elements.find((el) => el.typeCode === 5001);
    expect(iin?.terminals.map((t) => t.label)).toEqual(['1', '3', '2', '4']);
    expect(iin?.terminals.map((t) => [t.offset.x, t.offset.y])).toEqual([[0, 0], [6, 0], [0, 12], [6, 12]]);
  });

  it('plain fuses always conduct; fuse disconnectors start open and close when toggled', () => {
    const { schema } = importCad(fixture('elementos_fusibles.cad'));
    const fuse = schema.elements.find((e) => e.typeCode === 5002)!;
    const disc = schema.elements.find((e) => e.typeCode === 5007)!;
    const inputs = (toggled: boolean): UserInputs => ({ pressed: {}, toggled: { [disc.id]: toggled }, tripped: {} } as unknown as UserInputs);
    const off = computeSwitching(schema, inputs(false));
    expect(off.contacts[fuse.id]).toBe(true);
    expect(off.contacts[disc.id]).toBe(false);
    const on = computeSwitching(schema, inputs(true));
    expect(on.contacts[disc.id]).toBe(true);
    expect(on.edges.filter((e) => e.element === disc.id)).toHaveLength(2);
  });
});
