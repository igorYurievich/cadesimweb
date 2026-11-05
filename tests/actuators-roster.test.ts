import { describe, expect, it } from 'vitest';
import { getCadType, isKnownCadType } from '@model/cad-types';
import { importCad } from '@model/cad-import';
import { computeSwitching, createEmptyInputs } from '@engine/index';
import { POSITION_SPECS, getBehavior, invalidTerminalIndexes, missingBehaviors, nextPosition } from '../src/engine/behaviors';
import { fixture } from './helpers';

/** Образец accionamientos.cad: 24 элемента панели «Accionamientos» (+ служебная запись 20000). */
const FILE = 'accionamientos.cad';
/** Все 24 кода панели «Accionamientos» из образца. */
const ALL = [8023, 8000, 8001, 8002, 8003, 8004, 8005, 8006, 8007, 8008, 8009, 8010, 8011, 8020, 8021, 8022, 8012, 8013, 8014, 8015, 8016, 8017, 8018, 8019];

/** Клеммы и рамка по образцу .cad (порядок = индексы SchemaElement.terminals). */
const SPEC: Record<number, { labels: string[]; w: number }> = {
  8007: { labels: ['11', '12', '14'], w: 12 },
  8008: { labels: ['13', '14'], w: 6 },
  8009: { labels: ['11', '12'], w: 6 },
  8010: { labels: ['11', '13', '12', '14'], w: 15 },
  8011: { labels: ['11', '12', '14'], w: 12 },
  8012: { labels: ['13', '14'], w: 6 },
  8013: { labels: ['11', '12'], w: 6 },
  8014: { labels: ['11', '13', '12', '14'], w: 15 },
  8015: { labels: ['11', '12', '14'], w: 12 },
  8016: { labels: ['97', '98'], w: 6 },
  8017: { labels: ['95', '96'], w: 6 },
  8018: { labels: ['95', '97', '96', '98'], w: 15 },
  8019: { labels: ['95', '96', '98'], w: 12 },
  8020: { labels: ['1', '2', '3'], w: 12 },
  8021: { labels: ['1', '2', '3', '4'], w: 18 },
  8022: { labels: ['1', '2', '3', '4'], w: 12 },
};

describe('accionamientos: sample import', () => {
  const { schema, unknownTypes } = importCad(fixture(FILE));
  const items = schema.elements.filter((e) => e.typeCode !== 20000);

  it('the sample has all 24 panel elements', () => {
    expect(items).toHaveLength(24);
    expect(items.map((e) => e.typeCode).sort()).toEqual([...ALL].sort());
  });

  it('all 24 codes are known and have a behavior', () => {
    for (const code of ALL) expect(isKnownCadType(code)).toBe(true);
    expect(unknownTypes).toEqual([]);
    expect(missingBehaviors()).toEqual([]);
  });

  it('terminal labels, frame sizes and indexes match the sample', () => {
    for (const [code, spec] of Object.entries(SPEC).map(([c, s]) => [Number(c), s] as const)) {
      const e = items.find((item) => item.typeCode === code);
      expect(e?.terminals.map((t) => t.label), String(code)).toEqual(spec.labels);
      expect([e?.size.w, e?.size.h], String(code)).toEqual([spec.w, 15]);
      expect(invalidTerminalIndexes(code, e?.terminals.length ?? 0)).toEqual([]);
    }
  });

  it('families: 8007–8015 and 8020–8022 are pushbuttons, 8016–8019 are thermal contacts', () => {
    for (const code of [8007, 8008, 8009, 8010, 8011, 8012, 8013, 8014, 8015, 8020, 8021, 8022]) expect(getCadType(code).family).toBe('pushbutton');
    for (const code of [8016, 8017, 8018, 8019]) expect(getCadType(code).family).toBe('thermal-contact');
  });

  it('the placement prefix of the sample: -S for actuators, -F for thermal contacts', () => {
    for (const e of items.filter((item) => item.typeCode !== 8023)) expect(e.name).toBe(e.typeCode >= 8016 && e.typeCode <= 8019 ? '-F' : '-S');
  });
});

describe('accionamientos: behavior', () => {
  const { schema } = importCad(fixture(FILE));
  const find = (code: number) => schema.elements.find((e) => e.typeCode === code)!;
  /** Замкнутые пары клемм (индексы) для текущих входов. */
  const closed = (code: number, set: (inputs: ReturnType<typeof createEmptyInputs>, id: number) => void = () => undefined): string[] => {
    const e = find(code);
    const inputs = createEmptyInputs();
    set(inputs, e.id);
    return computeSwitching(schema, inputs).edges.filter((edge) => edge.element === e.id).map((edge) => `${edge.a.index}-${edge.b.index}`).sort();
  };
  const press = (inputs: ReturnType<typeof createEmptyInputs>, id: number): void => { inputs.pressed[id] = true; };
  const toggle = (inputs: ReturnType<typeof createEmptyInputs>, id: number): void => { inputs.toggled[id] = true; };

  it('seta CON (8007): common 11 → NC 12 at rest, → NO 14 while pressed (as 8003)', () => {
    expect(closed(8007)).toEqual(['0-1']);
    expect(closed(8007, press)).toEqual(['0-2']);
    expect(getBehavior(8007).links.map((l) => l.control)).toEqual(['pressed', 'pressed']);
  });

  it('limit switches 8012 / 8013 / 8014 / 8015 react to pressed', () => {
    expect(closed(8012)).toEqual([]);
    expect(closed(8012, press)).toEqual(['0-1']);
    expect(closed(8013)).toEqual(['0-1']);
    expect(closed(8013, press)).toEqual([]);
    expect(closed(8014)).toEqual(['0-2']);
    expect(closed(8014, press)).toEqual(['1-3']);
    expect(closed(8015)).toEqual(['0-1']);
    expect(closed(8015, press)).toEqual(['0-2']);
  });

  it('interruptors keep their position: toggled switches the contacts, pressed does not matter', () => {
    expect(closed(8008)).toEqual([]);
    expect(closed(8008, toggle)).toEqual(['0-1']);
    expect(closed(8009)).toEqual(['0-1']);
    expect(closed(8009, toggle)).toEqual([]);
    expect(closed(8010)).toEqual(['0-2']);
    expect(closed(8010, toggle)).toEqual(['1-3']);
    expect(closed(8011)).toEqual(['0-1']);
    expect(closed(8011, toggle)).toEqual(['0-2']);
  });

  it('interruptor NC/CON toggled back to false returns to rest (maintained, not "armed")', () => {
    const inputs = createEmptyInputs();
    const e = find(8009);
    inputs.toggled[e.id] = true;
    inputs.toggled[e.id] = false;
    expect(computeSwitching(schema, inputs).contacts[e.id]).toBe(true);
  });

  it('8018 thermal contact is unchanged: NC 95-96 → NO 97-98 on trip', () => {
    expect(closed(8018)).toEqual(['0-2']);
    expect(closed(8018, (inputs, id) => { inputs.tripped[id] = true; })).toEqual(['1-3']);
  });

  const trip = (inputs: ReturnType<typeof createEmptyInputs>, id: number): void => { inputs.tripped[id] = true; };
  const at = (position: number) => (inputs: ReturnType<typeof createEmptyInputs>, id: number): void => { inputs.positions = { [id]: position }; };

  it('thermal contacts 8016 / 8017 / 8019: NO closes, NC opens, CON swaps when the protection trips', () => {
    expect(closed(8016)).toEqual([]);
    expect(closed(8016, trip)).toEqual(['0-1']);
    expect(closed(8017)).toEqual(['0-1']);
    expect(closed(8017, trip)).toEqual([]);
    expect(closed(8019)).toEqual(['0-1']);
    expect(closed(8019, trip)).toEqual(['0-2']);
    for (const code of [8016, 8017, 8019]) expect(getBehavior(code).links.every((l) => l.control === 'thermal')).toBe(true);
  });

  it('Conmutador I-0-II (8020): rest = 0 (nothing closed), I = 1-2, II = 1-3', () => {
    expect(closed(8020)).toEqual([]);
    expect(closed(8020, at(0))).toEqual(['0-1']);
    expect(closed(8020, at(1))).toEqual([]);
    expect(closed(8020, at(2))).toEqual(['0-2']);
  });

  it('Conmutador I-II-III (8021): rest = I, then 1-3, 1-4', () => {
    expect(closed(8021)).toEqual(['0-1']);
    expect(closed(8021, at(1))).toEqual(['0-2']);
    expect(closed(8021, at(2))).toEqual(['0-3']);
  });

  it('Conmutador cruce (8022): crossed 1-4 / 2-3 at rest, straight 1-3 / 2-4 when active', () => {
    expect(closed(8022)).toEqual(['0-3', '1-2']);
    expect(closed(8022, at(1))).toEqual(['0-2', '1-3']);
  });

  it('a click cycles positions starting from rest; an invalid stored position falls back to rest', () => {
    expect([8020, 8021, 8022].map((code) => POSITION_SPECS[code]?.cycle.length)).toEqual([3, 3, 2]);
    expect(nextPosition(8020, undefined)).toBe(0);
    expect(nextPosition(8020, 0)).toBe(2);
    expect(nextPosition(8020, 2)).toBe(1);
    expect(nextPosition(8021, undefined)).toBe(1);
    expect(nextPosition(8021, 2)).toBe(0);
    expect(nextPosition(8022, undefined)).toBe(1);
    expect(nextPosition(8022, 1)).toBe(0);
    expect(nextPosition(8021, 99)).toBe(1);
  });

  it('positions of several selectors are independent (by element id)', () => {
    const a = find(8020);
    const b = find(8021);
    const inputs = createEmptyInputs();
    inputs.positions = { [a.id]: 2, [b.id]: 2 };
    const edges = computeSwitching(schema, inputs).edges;
    expect(edges.filter((e) => e.element === a.id).map((e) => `${e.a.index}-${e.b.index}`)).toEqual(['0-2']);
    expect(edges.filter((e) => e.element === b.id).map((e) => `${e.a.index}-${e.b.index}`)).toEqual(['0-3']);
  });
});
