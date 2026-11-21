import { describe, expect, it } from 'vitest';
import { createEngineInput, simulate } from '@engine/index';
import { el, schemaOf, seg } from './builders';

/**
 * Двигатель Dahlander 1003 и двухобмоточный 1005: питание 3004 (L1 L2 L3) в (0, 0), двигатель в (30, 30).
 * U1 V1 W1 — (30|36|42, 30), U2 V2 W2 — (30|36|42, 54).
 */
const TERMINALS = [[0, 0, 'U1'], [6, 0, 'V1'], [12, 0, 'W1'], [18, 0, 'PE'], [0, 24, 'U2'], [6, 24, 'V2'], [12, 24, 'W2']] as const;

function build(code: number, opts: { low?: boolean; high?: boolean; star?: boolean }) {
  const source = el(3004, 0, 0, { id: 1, name: '-X', terminals: [[0, 0, 'L1'], [6, 0, 'L2'], [12, 0, 'L3']] });
  const motor = el(code, 30, 30, { id: 2, name: '-M1', terminals: TERMINALS });
  const wires = [];
  for (let k = 0; k < 3; k += 1) {
    const sx = k * 6;
    const mx = 30 + k * 6;
    if (opts.low) { const y = 8 + k * 6; wires.push(seg(sx, 0, sx, y), seg(sx, y, mx, y), seg(mx, y, mx, 30)); }
    if (opts.high) { const y = 70 + k * 6; wires.push(seg(sx, 0, sx, y), seg(sx, y, mx, y), seg(mx, y, mx, 54)); }
  }
  // Перемычка U1–V1–W1 (точка двойной звезды) — сверху, над двигателем, без фазы.
  if (opts.star) wires.push(seg(30, 30, 30, 27), seg(36, 30, 36, 27), seg(42, 30, 42, 27), seg(30, 27, 42, 27));
  return schemaOf(wires, [source, motor]);
}

const motorOf = (code: number, opts: Parameters<typeof build>[1]) => simulate(createEngineInput(build(code, opts))).motors[2];

describe('two-speed motors', () => {
  it('Dahlander: low speed in delta on U1 V1 W1', () => {
    expect(motorOf(1003, { low: true })).toEqual({ running: true, faulted: false, speed: 'low' });
  });

  it('Dahlander: high speed (double star) on U2 V2 W2 with U1 V1 W1 bridged', () => {
    expect(motorOf(1003, { high: true, star: true })).toEqual({
      running: true, faulted: false, speed: 'high', directionTerminals: [4, 5, 6],
    });
  });

  it('Dahlander: U2 V2 W2 fed without the star bridge does not run', () => {
    expect(motorOf(1003, { high: true })).toEqual({ running: false, faulted: true });
  });

  it('Dahlander: both windings fed at once is a fault', () => {
    expect(motorOf(1003, { low: true, high: true })).toEqual({ running: false, faulted: true });
  });

  it('two-winding motor 1005: low on U1 V1 W1, high on U2 V2 W2 (no bridge needed)', () => {
    expect(motorOf(1005, { low: true })?.speed).toBe('low');
    expect(motorOf(1005, { high: true })?.speed).toBe('high');
    expect(motorOf(1005, { low: true, high: true })).toEqual({ running: false, faulted: true });
  });
});

describe('Dahlander: palette badge', () => {
  it('has the green verified badge in Motores', async () => {
    const { hasVerifiedBadge } = await import('@model/catalog-verification');
    expect(hasVerifiedBadge('motors', 32831)).toBe(true);
    expect(hasVerifiedBadge('motors', 32994)).toBe(true);
  });
});

describe('Power electronics: verified resistors', () => {
  it('Resistencia I and III have the green badge', async () => {
    const { hasVerifiedBadge } = await import('@model/catalog-verification');
    expect(hasVerifiedBadge('power-electronics', 33002)).toBe(true);
    expect(hasVerifiedBadge('power-electronics', 33003)).toBe(true);
  });
});
