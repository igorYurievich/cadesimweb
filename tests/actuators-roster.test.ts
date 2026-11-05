import { describe, expect, it } from 'vitest';
import { getCadType, isKnownCadType } from '@model/cad-types';
import { importCad } from '@model/cad-import';
import { computeSwitching, createEmptyInputs } from '@engine/index';
import { getBehavior, invalidTerminalIndexes, missingBehaviors } from '../src/engine/behaviors';
import { fixture } from './helpers';

/** Образец accionamientos.cad: 24 элемента панели «Accionamientos» (+ служебная запись 20000). */
const FILE = 'accionamientos.cad';
/** Уже реализованные коды (8000–8006 и 8023 были раньше, 8007–8015 и 8018 — этот шаг). */
const DONE = [8023, 8000, 8001, 8002, 8003, 8004, 8005, 8006, 8007, 8008, 8009, 8010, 8011, 8012, 8013, 8014, 8015, 8018];
/** Ещё не реализованы: тепловые 8016/8017/8019 и переключатели 8020–8022 (следующий шаг). */
const PENDING = [8016, 8017, 8019, 8020, 8021, 8022];

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
  8018: { labels: ['95', '97', '96', '98'], w: 15 },
};

describe('accionamientos: sample import', () => {
  const { schema, unknownTypes } = importCad(fixture(FILE));
  const items = schema.elements.filter((e) => e.typeCode !== 20000);

  it('the sample has all 24 panel elements', () => {
    expect(items).toHaveLength(24);
    expect(items.map((e) => e.typeCode).sort()).toEqual([...DONE, ...PENDING].sort());
  });

  it('every implemented code is known and has a behavior; only the pending ones are still unknown', () => {
    for (const code of DONE) expect(isKnownCadType(code)).toBe(true);
    expect([...new Set(unknownTypes)].sort()).toEqual([...PENDING].sort());
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

  it('families: 8007–8015 are pushbuttons, 8018 stays a thermal contact', () => {
    for (let code = 8007; code <= 8015; code += 1) expect(getCadType(code).family).toBe('pushbutton');
    expect(getCadType(8018).family).toBe('thermal-contact');
  });

  it('the new elements follow the placement defaults of the sample (-S for actuators)', () => {
    for (const e of items.filter((item) => item.typeCode >= 8007 && item.typeCode <= 8015)) expect(e.name).toBe('-S');
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
});
