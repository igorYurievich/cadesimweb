import { describe, it, expect } from 'vitest';
import { createEngineInput, simulate } from '@engine/index';
import { el, schemaOf, seg } from './builders';

function motorCircuit(phaseTerminals: number[], neutralTerminal?: number) {
  const source = el(3007, 0, 0, {
    id: 1,
    name: '-X',
    terminals: [[0, 0, 'L1'], [6, 0, 'L2'], [12, 0, 'L3'], [18, 0, 'N'], [24, 0, 'PE']],
  });
  const motor = el(1000, 30, 12, {
    id: 2,
    name: '-M1',
    terminals: [[0, 0, 'U1'], [6, 0, 'V1'], [12, 0, 'W1'], [18, 0, 'PE']],
  });
  const wires = [];
  for (const index of phaseTerminals) {
    const sourceX = index * 6;
    const motorX = 30 + index * 6;
    const routeY = 6 + index * 9;
    wires.push(
      seg(sourceX, 0, sourceX, routeY),
      seg(sourceX, routeY, motorX, routeY),
      seg(motorX, routeY, motorX, 12),
    );
  }
  if (neutralTerminal !== undefined) {
    const sourceX = 18;
    const motorX = 30 + neutralTerminal * 6;
    wires.push(
      seg(sourceX, 0, sourceX, 30, { kind: 'neutral' }),
      seg(sourceX, 30, motorX, 30, { kind: 'neutral' }),
      seg(motorX, 30, motorX, 12, { kind: 'neutral' }),
    );
  }
  return schemaOf(wires, [source, motor]);
}

describe('three-phase motors (5.6a)', () => {
  it('runs on three distinct phases; PE connection is optional', () => {
    const state = simulate(createEngineInput(motorCircuit([0, 1, 2])));
    expect(state.motors[2]).toEqual({ running: true, faulted: false });
  });

  it('marks a two-phase supply as faulted without rotation', () => {
    const state = simulate(createEngineInput(motorCircuit([0, 1])));
    expect(state.motors[2]).toEqual({ running: false, faulted: true });
  });

  it('marks one phase plus neutral as faulted without rotation', () => {
    const state = simulate(createEngineInput(motorCircuit([0], 1)));
    expect(state.motors[2]).toEqual({ running: false, faulted: true });
  });

  it('leaves an unpowered motor not faulted', () => {
    const state = simulate(createEngineInput(motorCircuit([])));
    expect(state.motors[2]).toEqual({ running: false, faulted: false });
  });
});
