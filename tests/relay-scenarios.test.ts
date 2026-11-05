import { describe, it, expect } from 'vitest';
import { computeSwitching, createEmptyInputs, createEngineInput, simulate } from '@engine/index';
import { importCad } from '@model/index';
import { getCadType } from '../src/model/cad-types';
import { el, schemaOf, seg } from './builders';
import { fixture } from './helpers';

function starterLadder() {
  const source = el(3007, 0, 0, {
    id: 1,
    name: '-X',
    terminals: [[0, 0, 'L1'], [6, 0, 'L2'], [12, 0, 'L3'], [18, 0, 'N'], [24, 0, 'PE']],
  });
  const stop = el(8013, 10, 10, { id: 2, name: 'S1', terminals: [[0, 0, '11'], [6, 0, '12']] });
  const start = el(8000, 20, 10, { id: 3, name: 'S2', terminals: [[0, 0, '13'], [6, 0, '14']] });
  const hold = el(2001, 30, 10, {
    id: 4,
    name: 'KM1',
    terminals: [[0, 0, '1'], [6, 0, '3'], [12, 0, '5'], [0, 6, '2'], [6, 6, '4'], [12, 6, '6']],
  });
  const coil = el(9000, 60, 30, { id: 5, name: 'KM1', terminals: [[0, 0, 'A1'], [6, 0, 'A2']] });
  const wires = [
    seg(0, 0, 0, 10, { id: 101 }), seg(0, 10, 10, 10, { id: 102 }),
    seg(16, 10, 20, 10, { id: 103 }), seg(16, 10, 30, 10, { id: 104 }),
    seg(26, 10, 50, 10, { id: 105 }), seg(30, 16, 50, 16, { id: 106 }),
    seg(50, 16, 50, 10, { id: 107 }), seg(50, 10, 60, 10, { id: 108 }),
    seg(60, 10, 60, 30, { id: 109 }),
    seg(18, 0, 18, 40, { id: 110, kind: 'neutral' }),
    seg(18, 40, 66, 40, { id: 111, kind: 'neutral' }),
    seg(66, 40, 66, 30, { id: 112, kind: 'neutral' }),
  ];
  return { schema: schemaOf(wires, [source, stop, start, hold, coil]), ids: { stop: 2, start: 3, hold: 4 } };
}

function interlockedStarters() {
  const source = el(3007, 0, 0, {
    id: 1,
    name: '-X',
    terminals: [[0, 0, 'L1'], [6, 0, 'L2'], [12, 0, 'L3'], [18, 0, 'N'], [24, 0, 'PE']],
  });
  const elements = [source];
  const wires = [seg(0, 0, 0, 50, { id: 101 }), seg(18, 0, 18, 60, { id: 102, kind: 'neutral' }),
    seg(18, 60, 56, 60, { id: 103, kind: 'neutral' }), seg(56, 60, 56, 10, { id: 104, kind: 'neutral' })];
  const ids = { start1: 2, hold1: 3, interlock1: 4, coil1: 5, start2: 6, hold2: 7, interlock2: 8, coil2: 9 };

  const addStarter = (y: number, startId: number, holdId: number, interlockId: number, coilId: number, coilName: string, blockedBy: string): void => {
    elements.push(
      el(8000, 10, y, { id: startId, name: `S${startId}`, terminals: [[0, 0, '13'], [6, 0, '14']] }),
      el(2001, 20, y + 6, { id: holdId, name: coilName, terminals: [[0, 0], [60, 0], [70, 0], [6, 0], [80, 0], [90, 0]] }),
      el(7001, 36, y, { id: interlockId, name: blockedBy, terminals: [[0, 0, '11'], [6, 0, '12']] }),
      el(9000, 50, y, { id: coilId, name: coilName, terminals: [[0, 0, 'A1'], [6, 0, 'A2']] }),
    );
    const base = 110 + y * 10;
    wires.push(
      seg(0, y, 10, y, { id: base }),
      seg(16, y, 30, y, { id: base + 1 }),
      seg(10, y, 10, y + 6, { id: base + 2 }),
      seg(10, y + 6, 20, y + 6, { id: base + 3 }),
      seg(26, y + 6, 30, y + 6, { id: base + 4 }),
      seg(30, y + 6, 30, y, { id: base + 5 }),
      seg(30, y, 36, y, { id: base + 6 }),
      seg(42, y, 50, y, { id: base + 7 }),
    );
  };

  addStarter(10, ids.start1, ids.hold1, ids.interlock1, ids.coil1, 'KM1', 'KM2');
  addStarter(50, ids.start2, ids.hold2, ids.interlock2, ids.coil2, 'KM2', 'KM1');
  return { schema: schemaOf(wires, elements), ids };
}

function buzzerSchema() {
  const source = el(3007, 0, 0, {
    id: 1,
    name: '-X',
    terminals: [[0, 0, 'L1'], [6, 0, 'L2'], [12, 0, 'L3'], [18, 0, 'N'], [24, 0, 'PE']],
  });
  const nc = el(7001, 20, 10, { id: 2, name: 'K1', terminals: [[0, 0, '11'], [6, 0, '12']] });
  const coil = el(9000, 30, 10, { id: 3, name: 'K1', terminals: [[0, 0, 'A1'], [6, 0, 'A2']] });
  return schemaOf([
    seg(0, 0, 0, 10, { id: 101 }), seg(0, 10, 20, 10, { id: 102 }), seg(26, 10, 30, 10, { id: 103 }),
    seg(18, 0, 18, 20, { id: 104, kind: 'neutral' }), seg(18, 20, 36, 20, { id: 105, kind: 'neutral' }),
    seg(36, 20, 36, 10, { id: 106, kind: 'neutral' }),
  ], [source, nc, coil]);
}

describe('relay scenarios (5.5c)', () => {
  it('starts KM1 while S2 is pressed', () => {
    const { schema, ids } = starterLadder();
    const inputs = createEmptyInputs();
    inputs.pressed[ids.start] = true;
    const state = simulate({ ...createEngineInput(schema), inputs });
    expect(state.coils.KM1).toBe(true);
    expect(state.contacts[ids.hold]).toBe(true);
    expect(state.stable).toBe(true);
  });

  it('keeps KM1 on through its auxiliary contact after S2 is released', () => {
    const { schema, ids } = starterLadder();
    const inputs = createEmptyInputs();
    inputs.pressed[ids.start] = true;
    const started = simulate({ ...createEngineInput(schema), inputs });
    const held = simulate({ ...createEngineInput(schema), memory: started.memory });
    expect(held.coils.KM1).toBe(true);
    expect(held.contacts[ids.hold]).toBe(true);
    expect(held.stable).toBe(true);
  });

  it('stops KM1 when S1 opens the NC stop contact', () => {
    const { schema, ids } = starterLadder();
    const startInputs = createEmptyInputs();
    startInputs.pressed[ids.start] = true;
    const started = simulate({ ...createEngineInput(schema), inputs: startInputs });
    const stopInputs = createEmptyInputs();
    stopInputs.pressed[ids.stop] = true;
    const stopped = simulate({ ...createEngineInput(schema), inputs: stopInputs, memory: started.memory });
    expect(stopped.coils.KM1).toBe(false);
    expect(stopped.contacts[ids.hold]).toBe(false);
    expect(stopped.stable).toBe(true);
  });

  it('maps CAD type 7001 from Actividad 1.6 to a coil-controlled NC contact', () => {
    const { schema } = importCad(fixture('a1_6.cad'));
    const nc = schema.elements.filter((element) => element.typeCode === 7001);
    expect(new Set(nc.map((element) => element.name))).toEqual(new Set(['-KM1', '-KM2']));
    expect(getCadType(7001)).toMatchObject({ family: 'aux-contact', confidence: 'confirmed' });
    const { schema: mini, ids } = interlockedStarters();
    const released = computeSwitching(mini, createEmptyInputs(), { KM1: false, KM2: false });
    const energizedKm1 = computeSwitching(mini, createEmptyInputs(), { KM1: true, KM2: false });
    expect(released.contacts[ids.interlock1]).toBe(true);
    expect(energizedKm1.contacts[ids.interlock1]).toBe(true);
    expect(energizedKm1.contacts[ids.interlock2]).toBe(false);
  });

  it('interlocks KM1 and KM2 when both start buttons are pressed together', () => {
    const { schema, ids } = interlockedStarters();
    const inputs = createEmptyInputs();
    inputs.pressed[ids.start1] = true;
    inputs.pressed[ids.start2] = true;
    const state = simulate({ ...createEngineInput(schema), inputs });
    expect(state.coils.KM1).toBe(true);
    expect(state.coils.KM2).toBe(false);
    expect(state.contacts[ids.interlock2]).toBe(false);
    expect(state.stable).toBe(true);
  });

  it('does not start KM2 while KM1 is already held in', () => {
    const { schema, ids } = interlockedStarters();
    const inputs = createEmptyInputs();
    inputs.pressed[ids.start2] = true;
    const state = simulate({
      ...createEngineInput(schema),
      inputs,
      memory: { latches: {}, prevCoils: { KM1: true }, timers: {} },
    });
    expect(state.coils.KM1).toBe(true);
    expect(state.coils.KM2).toBe(false);
    expect(state.contacts[ids.interlock2]).toBe(false);
  });

  it('reports unstable for a coil that opens its own NC contact', () => {
    const state = simulate(createEngineInput(buzzerSchema()));
    expect(state.stable).toBe(false);
    expect(state.iterations).toBe(50);
    expect(state.faults.some((fault) => fault.kind === 'unstable')).toBe(true);
  });
});
