import { describe, expect, it } from 'vitest';
import { catalog } from '@model/catalog';
import { cadTypeForCommand } from '@model/cad-types';
import { parseCad } from '@model/cad-format';
import { importCad } from '@model/cad-import';
import { exportCad } from '@model/cad-export';
import { terminalPosition } from '@model/geometry';
import { createEmptySchema } from '@model/types';
import type { Point, Schema, SchemaElement } from '@model/types';
import { ELECTRONIC_RELAY_SPECS } from '@model/electronic-relays';
import { hasVerifiedBadge } from '@model/catalog-verification';
import { createEngineInput, simulate } from '@engine/index';
import type { EngineState } from '@engine/index';
import { invalidTerminalIndexes, missingBehaviors } from '../src/engine/behaviors';
import { REVERSE_SUFFIX, findOvervoltageTrips } from '../src/engine/electronic-relays';
import { createPlacedElement } from '@ui/helpers';
import { fixture } from './helpers';

/** Образец reles_electronicos.cad: по одной кнопке панели «Relés electrónicos y protecciones». */
const SAMPLE = 'reles_electronicos.cad';
const CODES = [1070, 1071, 1072, 1073, 9040, 9041, 9042, 9043, 9044, 9045, 1074, 1075];
const recordsPart = (text: string): string => text.slice(0, text.indexOf('$$$'));

describe('electronic relays: panel and sample', () => {
  it('all 12 buttons of the panel map to the codes of the sample, in panel order, with a green badge', () => {
    const items = catalog.inGroup('electronic-relays');
    expect(items.map((c) => cadTypeForCommand(c.id)?.code)).toEqual(CODES);
    expect(items.every((c) => hasVerifiedBadge('electronic-relays', c.id))).toBe(true);
    expect(missingBehaviors()).toEqual([8]);
  });

  it('the sample is read without warnings; labels, frames and name offsets come from the file', () => {
    const { schema, warnings, unknownTypes } = importCad(fixture(SAMPLE));
    expect(warnings).toEqual([]);
    expect(unknownTypes).toEqual([]);
    for (const spec of ELECTRONIC_RELAY_SPECS) {
      const e = schema.elements.find((item) => item.typeCode === spec.code)!;
      expect(e.terminals.map((t) => t.label)).toEqual(spec.labels);
      expect(e.terminals.map((t) => t.offset)).toEqual(spec.points);
      expect(e.size).toEqual(spec.size);
      expect(e.labelOffset).toEqual(spec.labelOffset);
      expect(invalidTerminalIndexes(spec.code, e.terminals.length)).toEqual([]);
    }
  });

  it('import → export gives back the records byte for byte, also the 9 flags of 1073 and the tail of 9045', () => {
    const original = fixture(SAMPLE);
    expect(recordsPart(exportCad(importCad(original).schema))).toBe(recordsPart(original));
  });

  it('new elements from the palette are written like the sample and read back with the same terminals', () => {
    const s = createEmptySchema();
    CODES.forEach((code, i) => {
      s.elements.push(createPlacedElement(code, { x: 30 + 45 * (i % 4), y: 60 + 30 * Math.floor(i / 4) }, 0, s));
    });
    const text = exportCad(s);
    const records = parseCad(text).records;
    const reversing = records.find((r) => r.type === 1073)!;
    expect(reversing.nums.slice(0, 9)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(records.find((r) => r.type === 9045)?.tail).toBe('A1-1-A2-1-A1-1-A2-1-A1-1-A2-1-  -0-  -0-  -0');
    const back = importCad(text);
    expect(back.warnings).toEqual([]);
    for (const code of CODES) {
      expect(back.schema.elements.find((e) => e.typeCode === code)?.terminals)
        .toEqual(s.elements.find((e) => e.typeCode === code)?.terminals);
    }
  });
});

/** Сборщик схемы: элементы с палитры и провода между точками. */
function builder() {
  const s = createEmptySchema();
  const place = (code: number, x: number, y: number, name = ''): SchemaElement => {
    const e = createPlacedElement(code, { x, y }, 0, s);
    if (name) e.name = name;
    s.elements.push(e);
    return e;
  };
  const wire = (a: Point, b: Point): void => {
    const id = Math.max(0, ...s.elements.map((e) => e.id), ...s.wires.map((w) => w.id)) + 1;
    s.wires.push({ id, typeCode: 4000, kind: 'phase', from: a, to: b, thickness: 1, dot: false });
  };
  const T = (e: SchemaElement, i: number): Point => terminalPosition(e, i) as Point;
  return { s, place, wire, T };
}

const run = (schema: Schema, toggled: Record<number, boolean> = {}): EngineState => {
  const input = createEngineInput(schema, 0);
  return simulate({ ...input, inputs: { ...input.inputs, toggled } });
};

const potentialsAt = (state: EngineState, e: SchemaElement, index: number): string[] =>
  state.nets.find((net) => net.id === state.terminalNet[`${e.id}:${index}`])?.potentials ?? [];

describe('electronic relays: simulation', () => {
  it('SSR AC: A1–A2 under L–N closes 1-2; without control 1-2 stays open', () => {
    for (const powered of [true, false]) {
      const { s, place, wire, T } = builder();
      const ln = place(3003, 0, 0, '-X');
      const ssr = place(1071, 30, 30, '-K1');
      wire(T(ln, 0), T(ssr, 2));
      if (powered) { wire(T(ln, 0), T(ssr, 0)); wire(T(ln, 1), T(ssr, 1)); }
      const state = run(s);
      expect(state.coils['-K1']).toBe(powered);
      expect(potentialsAt(state, ssr, 3).includes('L1')).toBe(powered);
    }
  });

  it('SSR DC: the control input is polarised', () => {
    for (const [plus, minus, on] of [[0, 1, true], [1, 0, false]] as const) {
      const { s, place, wire, T } = builder();
      const dc = place(3010, 0, 0, '-X');
      const ssr = place(1070, 30, 30, '-K1');
      wire(T(dc, plus), T(ssr, 0));
      wire(T(dc, minus), T(ssr, 1));
      expect(run(s).coils['-K1']).toBe(on);
    }
  });

  it('reversing solid state contactor: A1 forward, A3 swaps L2 and L3, both inputs give nothing', () => {
    const cases = [
      { a1: true, a3: false, out: ['L1', 'L2', 'L3'] },
      { a1: false, a3: true, out: ['L1', 'L3', 'L2'] },
      { a1: true, a3: true, out: [undefined, undefined, undefined] },
    ];
    for (const { a1, a3, out } of cases) {
      const { s, place, wire, T } = builder();
      const mains = place(3006, 0, 0, '-X');
      const k = place(1073, 30, 30, '-K1');
      [0, 1, 2].forEach((i) => wire(T(mains, i), T(k, i)));
      if (a1) wire(T(mains, 0), T(k, 6));
      if (a3) wire(T(mains, 0), T(k, 8));
      wire(T(mains, 3), T(k, 7));
      const state = run(s);
      expect(state.coils['-K1']).toBe(a1 && !a3);
      expect(state.coils[`-K1${REVERSE_SUFFIX}`]).toBe(a3 && !a1);
      const phases = [3, 4, 5].map((i) => potentialsAt(state, k, i).find((p) => p.startsWith('L')));
      expect(phases).toEqual(out);
    }
  });

  it('phase failure and phase sequence relays watch L1 L2 L3 (and N for 9040)', () => {
    const check = (code: number, order: number[], withN = true): boolean => {
      const { s, place, wire, T } = builder();
      const mains = place(3006, 0, 0, '-X');
      const relay = place(code, 30, 30, '-K1');
      order.forEach((from, i) => wire(T(mains, from), T(relay, i)));
      if (code === 9040 && withN) wire(T(mains, 3), T(relay, 3));
      return run(s).coils['-K1'] ?? false;
    };
    expect(check(9041, [0, 1, 2])).toBe(true);
    expect(check(9041, [0, 1])).toBe(false);
    expect(check(9040, [0, 1, 2])).toBe(true);
    expect(check(9040, [0, 1, 2], false)).toBe(false);
    expect(check(9043, [0, 1, 2])).toBe(true);
    expect(check(9043, [1, 2, 0])).toBe(true);
    expect(check(9043, [0, 2, 1])).toBe(false);
    expect(check(9042, [0, 2, 1])).toBe(false);
  });

  it('relay SPDT: at rest 11-12 is closed, with the coil 11-14 closes', () => {
    for (const powered of [false, true]) {
      const { s, place, wire, T } = builder();
      const ln = place(3003, 0, 0, '-X');
      const k = place(1075, 30, 30, '-K1');
      wire(T(ln, 0), T(k, 3));
      if (powered) { wire(T(ln, 0), T(k, 0)); wire(T(ln, 1), T(k, 1)); }
      const state = run(s);
      expect(potentialsAt(state, k, 2).includes('L1')).toBe(!powered);
      expect(potentialsAt(state, k, 4).includes('L1')).toBe(powered);
    }
  });

  it('overvoltage protection trips only with phase-to-phase voltage on the U coil, and only while it is on', () => {
    const build = (phaseToPhase: boolean) => {
      const { s, place, wire, T } = builder();
      const mains = place(3006, 0, 0, '-X');
      const f = place(9044, 30, 30, '-F1');
      wire(T(mains, 0), T(f, 4));
      wire(T(mains, phaseToPhase ? 1 : 3), T(f, 5));
      return { s, f };
    };
    const bad = build(true);
    expect(findOvervoltageTrips(bad.s, run(bad.s), { pressed: {}, toggled: {}, tripped: {} })).toEqual([bad.f.id]);
    expect(findOvervoltageTrips(bad.s, run(bad.s, { [bad.f.id]: false }), {
      pressed: {}, toggled: { [bad.f.id]: false }, tripped: {},
    })).toEqual([]);
    const good = build(false);
    expect(findOvervoltageTrips(good.s, run(good.s), { pressed: {}, toggled: {}, tripped: {} })).toEqual([]);
  });
});
