import { describe, expect, it } from 'vitest';
import { catalog } from '@model/catalog';
import { cadTypeForCommand, getCadType, isKnownCadType } from '@model/cad-types';
import { importCad } from '@model/cad-import';
import { parseCad, serializeCad } from '@model/cad-format';
import { createEmptyInputs, solveRelayLoop } from '@engine/index';
import { invalidTerminalIndexes, missingBehaviors } from '../src/engine/behaviors';
import { computeSwitching } from '../src/engine/switching';
import { el, schemaOf, seg } from './builders';
import { fixture } from './helpers';

/** Образец: по одной кнопке панели «Contactores e interruptores (potencia)» (CADe_SIMU 4.2), в порядке панели. */
const PANEL_CODES = [2006, 2000, 2001, 2002, 2008, 2007, 2003, 2004, 2005, 2009];
const POLES: Record<number, number> = { 2006: 1, 2000: 2, 2001: 3, 2002: 4, 2008: 3, 2007: 1, 2003: 2, 2004: 3, 2005: 4 };

describe('contactors: panel roster', () => {
  it('every button of the contactors group maps to a .cad type, in panel order', () => {
    const group = catalog.inGroup('contactors');
    expect(group).toHaveLength(10);
    expect(group.map((c) => cadTypeForCommand(c.id)?.code)).toEqual(PANEL_CODES);
  });

  it('all type codes are known, confirmed and have engine behavior', () => {
    for (const code of PANEL_CODES) {
      expect(isKnownCadType(code)).toBe(true);
      expect(getCadType(code).confidence).toBe('confirmed');
    }
    // Type 8 is a text annotation and intentionally has no engine behavior.
    expect(missingBehaviors()).toEqual([8]);
  });
});

describe('contactors: sample file', () => {
  const { schema, unknownTypes } = importCad(fixture('elementos_contactores.cad'));
  const byType = (code: number) => schema.elements.find((e) => e.typeCode === code)!;

  it('imports without unknown types and round-trips byte for byte', () => {
    expect(unknownTypes).toEqual([]);
    const text = fixture('elementos_contactores.cad');
    expect(serializeCad(parseCad(text))).toBe(text.trim());
  });

  it('has the expected poles and terminal labels', () => {
    for (const [code, poles] of Object.entries(POLES)) {
      const e = byType(Number(code));
      expect(e.terminals).toHaveLength(poles * 2);
      expect(invalidTerminalIndexes(e.typeCode, e.terminals.length)).toEqual([]);
    }
    expect(byType(2002).terminals.map((t) => t.label)).toEqual(['1', '3', '5', '7', '2', '4', '6', '8']);
    expect(byType(2005).terminals.map((t) => t.label)).toEqual(['1', '3', '5', '7', '2', '4', '6', '8']);
  });

  it('rows are 12 apart, also for the tall Contactor III (2008, frame 18×30)', () => {
    expect(byType(2001).terminals.map((t) => [t.offset.x, t.offset.y])).toEqual([[0, 0], [6, 0], [12, 0], [0, 12], [6, 12], [12, 12]]);
    expect(byType(2008).size).toEqual({ w: 18, h: 30 });
    expect(byType(2008).terminals.map((t) => [t.offset.x, t.offset.y])).toEqual([[0, 0], [6, 0], [12, 0], [0, 12], [6, 12], [12, 12]]);
  });

  it('keeps the two interlocked contactor names and no terminals', () => {
    const lock = byType(2009);
    expect(lock.terminals).toHaveLength(0);
    expect([lock.name, lock.func]).toEqual(['-KM1', '-KM2']);
  });
});

describe('contactors: behavior', () => {
  const { schema } = importCad(fixture('elementos_contactores.cad'));
  const byType = (code: number) => schema.elements.find((e) => e.typeCode === code)!;

  it('contactor poles follow the coil with the same name', () => {
    const kmName = byType(2000).name;
    const off = computeSwitching(schema, createEmptyInputs(), {});
    const on = computeSwitching(schema, createEmptyInputs(), { [kmName]: true });
    for (const code of [2006, 2000, 2001, 2002, 2008]) {
      expect(off.contacts[byType(code).id]).toBe(false);
      expect(on.contacts[byType(code).id]).toBe(true);
      expect(on.edges.filter((e) => e.element === byType(code).id)).toHaveLength(POLES[code]!);
    }
  });

  it('switches start open and close one pole pair per terminal column when toggled', () => {
    const inputs = createEmptyInputs();
    for (const code of [2007, 2003, 2004, 2005]) inputs.toggled[byType(code).id] = true;
    const off = computeSwitching(schema, createEmptyInputs(), {});
    const on = computeSwitching(schema, inputs, {});
    for (const code of [2007, 2003, 2004, 2005]) {
      expect(off.contacts[byType(code).id]).toBe(false);
      expect(on.contacts[byType(code).id]).toBe(true);
      expect(on.edges.filter((e) => e.element === byType(code).id)).toHaveLength(POLES[code]!);
    }
  });
});

/** Две катушки KM1 и KM2 подключены к L и N напрямую: без блокировки включаются обе. */
function twoCoils(withInterlock: boolean) {
  const source = el(3003, 0, 0, { id: 1, name: '-X', terminals: [[0, 0, 'L'], [6, 0, 'N']] });
  const km1 = el(9000, 20, 10, { id: 2, name: 'KM1', terminals: [[0, 0, 'A1'], [6, 0, 'A2']] });
  const km2 = el(9000, 20, 30, { id: 3, name: 'KM2', terminals: [[0, 0, 'A1'], [6, 0, 'A2']] });
  const elements = [source, km1, km2];
  if (withInterlock) elements.push({ ...el(2009, 40, 50, { id: 4, name: 'KM1' }), func: 'KM2' });
  const wires = [
    seg(0, 0, 0, 10, { id: 101 }), seg(0, 10, 0, 30, { id: 102 }), seg(0, 10, 20, 10, { id: 103 }), seg(0, 30, 20, 30, { id: 104 }),
    seg(6, 0, 6, 5, { id: 105, kind: 'neutral' }), seg(6, 5, 30, 5, { id: 106, kind: 'neutral' }), seg(30, 5, 30, 10, { id: 107, kind: 'neutral' }),
    seg(26, 10, 30, 10, { id: 108, kind: 'neutral' }), seg(30, 10, 30, 30, { id: 109, kind: 'neutral' }), seg(26, 30, 30, 30, { id: 110, kind: 'neutral' }),
  ];
  return schemaOf(wires, elements);
}

describe('contactors: mechanical interlock (Enclavamiento)', () => {
  it('without an interlock both coils pull in', () => {
    const r = solveRelayLoop(twoCoils(false), createEmptyInputs());
    expect(r.coils).toEqual({ KM1: true, KM2: true });
  });

  it('with an interlock only the first contactor pulls in when both are fed together', () => {
    const r = solveRelayLoop(twoCoils(true), createEmptyInputs());
    expect(r.stable).toBe(true);
    expect(r.coils).toEqual({ KM1: true, KM2: false });
  });

  it('a contactor that is already pulled in keeps the other one out', () => {
    const r = solveRelayLoop(twoCoils(true), createEmptyInputs(), 50, { KM1: false, KM2: true });
    expect(r.stable).toBe(true);
    expect(r.coils).toEqual({ KM1: false, KM2: true });
  });
});
