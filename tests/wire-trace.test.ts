import { describe, expect, it } from 'vitest';
import { traceWire, wireNear } from '../src/ui/wire-trace';
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
