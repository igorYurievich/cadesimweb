import { describe, expect, it } from 'vitest';
import { traceWire, wireNear } from '../src/ui/wire-trace';
import { nameKey, sameNameElements } from '../src/ui/name-trace';
import { el, schemaOf, seg } from './builders';

/** Две линии через контакт S1: L — S1:1 и S1:2 — H1:X1 (+ ответвление к H2:X1); отдельная линия N. */
function schema() {
  const s1 = el(8000, 30, 10, { id: 1, name: '-S1', terminals: [[0, 0, '1'], [0, 12, '2']] });
  const h1 = el(9008, 30, 40, { id: 2, name: '-H1', terminals: [[0, 0, 'X1'], [0, 12, 'X2']] });
  const h2 = el(9008, 60, 40, { id: 3, name: '-H2', terminals: [[0, 0, 'X1'], [0, 12, 'X2']] });
  return schemaOf([
    seg(0, 10, 30, 10, { id: 10 }),
    seg(30, 22, 30, 40, { id: 11 }), seg(30, 30, 60, 30, { id: 12 }), seg(60, 30, 60, 40, { id: 13 }),
    seg(30, 52, 60, 52, { id: 14, kind: 'neutral' }),
  ], [s1, h1, h2]);
}

describe('wire trace (magnifier)', () => {
  it('follows one connection up to the terminals, not through the contact', () => {
    const before = traceWire(schema(), 10);
    expect([...before.wireIds]).toEqual([10]);
    expect(before.terminals.map((t) => t.label)).toEqual(['-S1:1']);
  });

  it('includes every branch and every terminal it reaches', () => {
    const after = traceWire(schema(), 13);
    expect([...after.wireIds].sort()).toEqual([11, 12, 13]);
    expect(after.terminals.map((t) => t.label).sort()).toEqual(['-H1:X1', '-H2:X1', '-S1:2']);
  });

  it('finds the wire under the cursor within the tolerance', () => {
    expect(wireNear(schema(), { x: 15, y: 11 }, 2)).toBe(10);
    expect(wireNear(schema(), { x: 15, y: 20 }, 2)).toBeUndefined();
  });
});

describe('same-name trace (magnifier over an element)', () => {
  it('matches names ignoring the leading dash and case', () => {
    expect(nameKey(' -KM1 ')).toBe('KM1');
    expect(nameKey('km1')).toBe('KM1');
    expect(nameKey('-')).toBe('');
  });

  it('finds the coil and every contact named KM1, not KM2', () => {
    const s = schemaOf([], [
      el(9000, 0, 0, { id: 1, name: '-KM1' }),
      el(8000, 20, 0, { id: 2, name: 'KM1' }),
      el(8001, 40, 0, { id: 3, name: '-km1' }),
      el(9000, 60, 0, { id: 4, name: '-KM2' }),
      el(8000, 80, 0, { id: 5, name: '' }),
    ]);
    expect(sameNameElements(s, 2)).toEqual([1, 2, 3]);
    expect(sameNameElements(s, 4)).toEqual([4]);
    expect(sameNameElements(s, 5)).toEqual([]);
  });
});
