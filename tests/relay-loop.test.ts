import { describe, it, expect } from 'vitest';
import { createEngineInput, simulate } from '@engine/index';
import { el, schemaOf, seg } from './builders';

function poweredCoilSchema() {
  const strip = el(3007, 0, 0, {
    name: '-X',
    terminals: [[0, 0, 'L1'], [6, 0, 'L2'], [12, 0, 'L3'], [18, 0, 'N'], [24, 0, 'PE']],
  });
  const coil = el(9000, 30, 12, { name: 'K1', terminals: [[0, 0, 'A1'], [6, 0, 'A2']] });
  return schemaOf([
    seg(0, 0, 0, 12),
    seg(0, 12, 30, 12),
    seg(18, 0, 18, 18),
    seg(18, 18, 36, 18),
    seg(36, 18, 36, 12),
  ], [strip, coil]);
}

describe('relay loop (5.5b)', () => {
  it('updates a powered coil and settles on the next pass', () => {
    const state = simulate(createEngineInput(poweredCoilSchema()));
    expect(state.coils).toEqual({ K1: true });
    expect(state.stable).toBe(true);
    expect(state.iterations).toBe(2);
    expect(state.memory.prevCoils).toEqual({ K1: true });
  });

  it('reports unstable when the iteration limit is reached before settling', () => {
    const state = simulate({ ...createEngineInput(poweredCoilSchema()), options: { maxRelayIterations: 1 } });
    expect(state.stable).toBe(false);
    expect(state.iterations).toBe(1);
    expect(state.faults.some((fault) => fault.kind === 'unstable')).toBe(true);
    expect(state.warnings.some((warning) => warning.includes('unstable'))).toBe(true);
  });

  it('resolves named coils independently of element array order', () => {
    const schema = poweredCoilSchema();
    const a = simulate(createEngineInput(schema));
    const b = simulate(createEngineInput({ ...schema, elements: [...schema.elements].reverse() }));
    expect(b.coils).toEqual(a.coils);
    expect(b.contacts).toEqual(a.contacts);
    expect(b.stable).toBe(a.stable);
  });
});
