import { describe, expect, it } from 'vitest';
import { catalog } from '@model/catalog';
import { cadTypeForCommand, getCadType, isKnownCadType } from '@model/cad-types';
import { importCad } from '@model/cad-import';
import { invalidTerminalIndexes, missingBehaviors } from '../src/engine/behaviors';
import { fixture } from './helpers';

/** Образец elementos_bobinas.cad: по одной кнопке панели «Bobinas…», в порядке панели. Пара 9015/9014 записана в обратном порядке номеров. */
const COIL_CODES = [9000, 9001, 9002, 9003, 9004, 9005, 9006, 9007, 9015, 9014, 9016, 9008, 9009, 9010, 9011, 9012, 9013];
const TERMINALS: Record<number, number> = { 9001: 3, 9016: 5 };

describe('coils and signaling: panel roster', () => {
  it('every button of the panel maps to a .cad type, in panel order', () => {
    const items = catalog.inGroup('coils-signaling');
    expect(items).toHaveLength(17);
    expect(items.map((c) => cadTypeForCommand(c.id)?.code)).toEqual(COIL_CODES);
  });

  it('all codes are known and have engine behavior', () => {
    for (const code of COIL_CODES) expect(isKnownCadType(code)).toBe(true);
    // Type 8 is a text annotation and intentionally has no engine behavior.
    expect(missingBehaviors()).toEqual([8]);
  });

  it('the sample file imports without unknown types and with the expected terminals', () => {
    const { schema, unknownTypes } = importCad(fixture('elementos_bobinas.cad'));
    expect(unknownTypes).toEqual([]);
    for (const code of COIL_CODES) {
      const e = schema.elements.find((item) => item.typeCode === code);
      expect(e, `type ${code}`).toBeDefined();
      expect(e?.terminals.length).toBe(TERMINALS[code] ?? 2);
      expect(invalidTerminalIndexes(code, e?.terminals.length ?? 0)).toEqual([]);
    }
  });

  it('bistable coil and counter have their own terminal geometry and labels', () => {
    const { schema } = importCad(fixture('elementos_bobinas.cad'));
    const terminals = (code: number) => (schema.elements.find((item) => item.typeCode === code)?.terminals ?? []);
    expect(terminals(9001).map((t) => t.label)).toEqual(['A1', 'B1', 'A2']);
    expect(terminals(9001).map((t) => [t.offset.x, t.offset.y])).toEqual([[0, 0], [6, 0], [3, 12]]);
    // У счётчика флаги 0..3 и 6: метка A2 лежит в слоте флага 6, а не сразу после R.
    expect(terminals(9016).map((t) => t.label)).toEqual(['A1', 'C', 'D', 'R', 'A2']);
    expect(terminals(9016).map((t) => [t.offset.x, t.offset.y])).toEqual([[0, 0], [6, 0], [9, 0], [12, 0], [6, 12]]);
  });

  it('parameters stay out of the terminal labels', () => {
    const { schema } = importCad(fixture('elementos_bobinas.cad'));
    const find = (code: number) => schema.elements.find((item) => item.typeCode === code);
    expect(find(9016)?.params.extra).toBe('0#0');
    expect(find(9005)?.params.extra).toBe('0#1');
    expect(find(9009)?.params.color).toBe(0);
    expect(find(9004)?.params.time).toBe(1);
  });

  it('new coil types stay outside the relay engine family', () => {
    for (const code of [9001, 9002, 9003, 9005, 9006, 9007, 9014, 9015, 9016]) expect(getCadType(code).family).toBe('relay-coil');
    expect(getCadType(9000).family).toBe('coil');
  });
});
