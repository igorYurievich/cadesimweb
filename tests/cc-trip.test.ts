import { describe, expect, it } from 'vitest';
import { createEmptyInputs, createEngineInput, simulate } from '@engine/index';
import { CC_TRIP_TYPES, findShortCircuitTrips } from '@engine/cc-trip';
import { el, schemaOf, seg } from './builders';

const n = { kind: 'neutral' } as const;
const Q0 = 2; const F1 = 3; const S1 = 4; const H1 = 5;

/**
 * L → Q0 → шина; от шины: лампа H1 и групповой F1 (или просто провод, если withF1 = false);
 * за F1 выключатель S1 прямо на N — при S1 = вкл. КЗ L–N. f1Type — тип группового аппарата.
 */
function circuit(withF1 = true, f1Type = 6000) {
  const source = el(3003, 0, 0, { id: 1, terminals: [[0, 0, 'L'], [6, 0, 'N']] });
  const q0 = el(6000, 0, 10, { id: Q0, name: '-Q0', terminals: [[0, 0, '1'], [0, 12, '2']] });
  const f1 = el(f1Type, 30, 30, { id: F1, name: '-F1', terminals: f1Type === 6005
    ? [[0, 0, 'N'], [6, 0, '1'], [0, 12, 'N'], [6, 12, '2']] : [[0, 0, '1'], [0, 12, '2']] });
  const s1 = el(8008, 30, 50, { id: S1, name: '-S1', terminals: [[0, 0, '13'], [0, 12, '14']] });
  const h1 = el(9008, 0, 50, { id: H1, name: '-H1', terminals: [[0, 0, 'X1'], [0, 12, 'X2']] });
  const wires = [
    seg(0, 0, 0, 10), seg(0, 22, 0, 30), seg(0, 30, 30, 30), seg(0, 30, 0, 50),
    ...(withF1 ? [seg(30, 42, 30, 50)] : [seg(30, 30, 30, 50)]),
    seg(30, 62, 30, 80),
    seg(6, 0, 6, 5, n), seg(6, 5, 90, 5, n), seg(90, 5, 90, 80, n), seg(90, 80, 0, 80, n), seg(0, 62, 0, 80, n),
  ];
  return schemaOf(wires, [source, q0, ...(withF1 ? [f1] : []), s1, h1]);
}

function run(schema: ReturnType<typeof circuit>, shorted: boolean) {
  const input = createEngineInput(schema);
  const inputs = createEmptyInputs();
  if (shorted) inputs.toggled[S1] = true;
  const engineInput = { ...input, inputs };
  return { engineInput, state: simulate(engineInput) };
}

describe('breakers trip on short circuit (option «Opciones»)', () => {
  it('no short circuit — nothing trips', () => {
    const { engineInput, state } = run(circuit(), false);
    expect(state.lamps[H1]).toBe(true);
    expect(findShortCircuitTrips(engineInput, state)).toEqual([]);
  });

  it('trips the breaker nearest to the fault (F1), the main Q0 stays on and the lamp keeps burning', () => {
    const { engineInput, state } = run(circuit(), true);
    expect(state.faults.some((fault) => fault.kind === 'short-circuit')).toBe(true);
    const trips = findShortCircuitTrips(engineInput, state);
    expect(trips.map((trip) => trip.id)).toEqual([F1]);
    expect(trips[0]?.pairs).toEqual(['L1–N']);
    const after = simulate({ ...engineInput, inputs: { ...engineInput.inputs, toggled: { ...engineInput.inputs.toggled, [F1]: false } } });
    expect(after.faults.some((fault) => fault.kind === 'short-circuit')).toBe(false);
    expect(after.lamps[H1]).toBe(true);
  });

  it('without a branch breaker the upstream main breaker Q0 trips', () => {
    const { engineInput, state } = run(circuit(false), true);
    expect(findShortCircuitTrips(engineInput, state).map((trip) => trip.id)).toEqual([Q0]);
  });

  it('only breakers with a magnetic release trip: not differentials, not thermal relays', () => {
    for (const type of [6000, 6004, 6008, 6012, 6015, 6017]) expect(CC_TRIP_TYPES.has(type)).toBe(true);
    for (const type of [6005, 6006, 6007, 6018]) expect(CC_TRIP_TYPES.has(type)).toBe(false);
  });
});
