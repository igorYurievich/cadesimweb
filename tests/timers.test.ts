import { describe, expect, it } from 'vitest';
import { createEngineInput, simulate } from '@engine/index';
import { el, schemaOf, seg } from './builders';

function timerCircuit(powered: boolean) {
  const source = el(3007, 0, 0, {
    id: 1, name: '-X',
    terminals: [[0, 0, 'L1'], [6, 0, 'L2'], [12, 0, 'L3'], [18, 0, 'N'], [24, 0, 'PE']],
  });
  const timer = el(9004, 30, 12, { id: 2, name: '-KT1', terminals: [[0, 0, 'A1'], [6, 0, 'A2']] });
  timer.params = { scale: 0, time: 5 };
  const wires = powered ? [
    seg(0, 0, 0, 12), seg(0, 12, 30, 12),
    seg(18, 0, 18, 18, { kind: 'neutral' }), seg(18, 18, 36, 18, { kind: 'neutral' }), seg(36, 18, 36, 12, { kind: 'neutral' }),
  ] : [];
  return schemaOf(wires, [source, timer]);
}

describe('on-delay timer (5.7a)', () => {
  it('counts simulated seconds and completes at its configured duration', () => {
    const schema = timerCircuit(true);
    const start = simulate(createEngineInput(schema, 0));
    expect(start.memory.timers[2]).toMatchObject({ phase: 'counting' });
    expect(start.memory.timers[2]).toEqual({ phase: 'counting', elapsed: 0, lastTime: 0 });
    const middle = simulate({ ...createEngineInput(schema, 3), memory: start.memory });
    expect(middle.memory.timers[2]).toEqual({ phase: 'counting', elapsed: 3, lastTime: 3 });
    const done = simulate({ ...createEngineInput(schema, 5), memory: middle.memory });
    expect(done.memory.timers[2]).toEqual({ phase: 'done', elapsed: 5, lastTime: 5 });
  });

  it('resets immediately when power is removed and starts a fresh count', () => {
    const powered = timerCircuit(true);
    const atTwo = simulate(createEngineInput(powered, 2));
    const off = simulate({ ...createEngineInput(timerCircuit(false), 4), memory: atTwo.memory });
    expect(off.memory.timers[2]).toEqual({ phase: 'idle', elapsed: 0, lastTime: 4 });
    const restarted = simulate({ ...createEngineInput(powered, 7), memory: off.memory });
    expect(restarted.memory.timers[2]).toEqual({ phase: 'counting', elapsed: 0, lastTime: 7 });
  });
});

function delayedLampCircuit() {
  const source = el(3007, 0, 0, { id: 1, name: '-X', terminals: [[0, 0, 'L1'], [6, 0, 'L2'], [12, 0, 'L3'], [18, 0, 'N'], [24, 0, 'PE']] });
  const timer = el(9004, 30, 12, { id: 2, name: 'KT1', terminals: [[0, 0, 'A1'], [6, 12, 'A2']] });
  timer.params = { scale: 0, time: 5 };
  const contact = el(7004, 48, 12, { id: 3, name: 'KT1', terminals: [[0, 0, '67'], [6, 0, '68']] });
  const lamp = el(9008, 66, 12, { id: 4, name: 'H1', terminals: [[0, 0, 'X1'], [6, 0, 'X2']] });
  return schemaOf([
    seg(0, 0, 0, -30), seg(0, -30, 30, -30), seg(30, -30, 30, 12),
    seg(30, 12, 48, 12), seg(54, 12, 66, 12),
    seg(18, 0, 18, 30, { kind: 'neutral' }), seg(18, 30, 84, 30, { kind: 'neutral' }),
    seg(36, 30, 36, 24, { kind: 'neutral' }),
    seg(72, 30, 72, 12, { kind: 'neutral' }),
  ], [source, timer, contact, lamp]);
}

describe('timed auxiliary contact (5.7b)', () => {
  it('keeps 7004 open until the matching timer reaches done, then closes it in the relay loop', () => {
    const schema = delayedLampCircuit();
    const start = simulate(createEngineInput(schema, 0));
    expect(start.contacts[3]).toBe(false);
    expect(start.lamps[4]).toBe(false);

    const before = simulate({ ...createEngineInput(schema, 4), memory: start.memory });
    expect(before.memory.timers[2]).toMatchObject({ phase: 'counting', elapsed: 4 });
    expect(before.contacts[3]).toBe(false);
    expect(before.lamps[4]).toBe(false);

    const after = simulate({ ...createEngineInput(schema, 5), memory: before.memory });
    expect(after.memory.timers[2]?.phase).toBe('done');
    expect(after.contacts[3]).toBe(true);
    expect(after.lamps[4]).toBe(true);
    expect(after.stable).toBe(true);
  });
});
