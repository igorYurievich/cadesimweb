import { describe, expect, it } from 'vitest';
import { CadScenario } from './scenario';
import { fixture } from './helpers';

function activity(): CadScenario {
  return new CadScenario(fixture('a1_5.cad'));
}

describe('Actividad 1.5 — arranque secuencial temporizado (5.8c)', () => {
  it('starts M1 immediately, M2 after 5 s, and M3 after the following 10 s', () => {
    const scenario = activity();
    const motors = ['M1', 'M2', 'M3'].map((name) => scenario.elementId(name, 1000));
    const timer1 = scenario.elementId('KM1', 9004);
    const timer2 = scenario.elementId('KM2', 9004);

    let state = scenario.press('S1');
    expect(motors.map((id) => state.motors[id]?.running)).toEqual([true, false, false]);
    expect(state.memory.timers[timer1]?.phase).toBe('counting');

    scenario.release('S1');
    state = scenario.advance(4.9);
    expect(motors.map((id) => state.motors[id]?.running)).toEqual([true, false, false]);

    state = scenario.advance(0.1);
    expect(motors.map((id) => state.motors[id]?.running)).toEqual([true, true, false]);
    expect(state.memory.timers[timer1]?.phase).toBe('done');
    expect(state.memory.timers[timer2]?.phase).toBe('counting');

    state = scenario.advance(9.9);
    expect(motors.map((id) => state.motors[id]?.running)).toEqual([true, true, false]);
    state = scenario.advance(0.1);
    expect(motors.map((id) => state.motors[id]?.running)).toEqual([true, true, true]);
    expect(state.memory.timers[timer2]?.phase).toBe('done');
    expect(state.stable).toBe(true);
  });

  it('resets both timer stages when the stop button removes control power', () => {
    const scenario = activity();
    const timer1 = scenario.elementId('KM1', 9004);
    const timer2 = scenario.elementId('KM2', 9004);
    scenario.press('S1');
    scenario.release('S1');
    scenario.advance(6);
    expect(scenario.state.memory.timers[timer1]?.phase).toBe('done');
    expect(scenario.state.memory.timers[timer2]?.phase).toBe('counting');

    const stopped = scenario.press('S2');
    expect(stopped.memory.timers[timer1]?.phase).toBe('idle');
    expect(stopped.memory.timers[timer2]?.phase).toBe('idle');
    expect(Object.values(stopped.motors).some((motor) => motor.running)).toBe(false);
  });
});
