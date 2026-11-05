import { describe, it, expect } from 'vitest';
import { computeSwitching, createEmptyInputs, createEngineInput, simulate } from '@engine/index';
import { el, schemaOf, seg } from './builders';

function thermalCircuit() {
  const source = el(3007, 0, 0, {
    id: 1,
    name: '-X',
    terminals: [[0, 0, 'L1'], [6, 0, 'L2'], [12, 0, 'L3'], [18, 0, 'N'], [24, 0, 'PE']],
  });
  const overload = el(6007, 30, 0, {
    id: 2,
    name: 'FG1',
    terminals: [[0, 0, '1'], [6, 0, '3'], [12, 0, '5'], [0, 6, '2'], [6, 6, '4'], [12, 6, '6']],
  });
  const auxiliary = el(8018, 30, 50, {
    id: 3,
    name: 'FG1',
    terminals: [[0, 0, '95'], [9, 0, '97'], [0, 12, '96'], [9, 12, '98']],
  });
  const lamp = el(9008, 50, 62, { id: 4, name: 'H1', terminals: [[0, 0, 'X1'], [6, 0, 'X2']] });
  const motor = el(1000, 60, 24, {
    id: 5,
    name: 'M1',
    terminals: [[0, 0, 'U1'], [6, 0, 'V1'], [12, 0, 'W1'], [18, 0, 'PE']],
  });

  const wires = [];
  for (let index = 0; index < 3; index += 1) {
    const sourceX = index * 6;
    const topX = 30 + index * 6;
    const inputY = -6 - index * 6;
    const outputX = topX;
    const motorX = 60 + index * 6;
    const outputY = 12 + index * 9;
    wires.push(
      seg(sourceX, 0, sourceX, inputY),
      seg(sourceX, inputY, topX, inputY),
      seg(topX, inputY, topX, 0),
      seg(outputX, 6, outputX, outputY),
      seg(outputX, outputY, motorX, outputY),
      seg(motorX, outputY, motorX, 24),
    );
  }
  wires.push(
    // L1 feeds the NO alarm contact, then the lamp.
    seg(0, 0, 0, 50), seg(0, 50, 39, 50), seg(39, 62, 50, 62),
    // Neutral return for the lamp.
    seg(18, 0, 18, 70, { kind: 'neutral' }),
    seg(18, 70, 56, 70, { kind: 'neutral' }),
    seg(56, 70, 56, 62, { kind: 'neutral' }),
  );
  return schemaOf(wires, [source, overload, auxiliary, lamp, motor]);
}

describe('thermal overload (5.6b)', () => {
  it('tripping FG1 opens the motor poles and closes the alarm contact', () => {
    const schema = thermalCircuit();
    const normal = simulate(createEngineInput(schema));
    expect(normal.motors[5]).toEqual({ running: true, faulted: false });
    expect(normal.lamps[4]).toBe(false);
    expect(normal.tripped[2]).toBe(false);

    const inputs = createEmptyInputs();
    inputs.tripped[2] = true;
    const tripped = simulate({ ...createEngineInput(schema), inputs });
    expect(tripped.motors[5]?.running).toBe(false);
    expect(tripped.lamps[4]).toBe(true);
    expect(tripped.tripped[2]).toBe(true);

    const edges = computeSwitching(schema, inputs).edges.filter((edge) => edge.element === 3);
    expect(edges.map((edge) => [edge.a.index, edge.b.index])).toEqual([[1, 3]]);
  });

  it('reset restores the NC contact, motor supply, and lamp state', () => {
    const schema = thermalCircuit();
    const inputs = createEmptyInputs();
    inputs.tripped[2] = true;
    const tripped = simulate({ ...createEngineInput(schema), inputs });
    const reset = simulate({ ...createEngineInput(schema), memory: tripped.memory });

    expect(reset.motors[5]).toEqual({ running: true, faulted: false });
    expect(reset.lamps[4]).toBe(false);
    expect(reset.tripped[2]).toBe(false);
    const edges = computeSwitching(schema, createEmptyInputs()).edges.filter((edge) => edge.element === 3);
    expect(edges.map((edge) => [edge.a.index, edge.b.index])).toEqual([[0, 2]]);
  });
});
