import { describe, expect, it } from 'vitest';
import { CadScenario } from './scenario';
import { fixture } from './helpers';

function activity(file: 'a1_3.cad' | 'a1_4.cad'): CadScenario {
  return new CadScenario(fixture(file));
}

describe('Actividad 1.3 — dos motores (5.8b)', () => {
  it('starts both motors independently and S1 stops the control circuit', () => {
    const scenario = activity('a1_3.cad');
    const m1 = scenario.elementId('M1', 1000);
    const m2 = scenario.elementId('M2', 1000);

    scenario.press('S2');
    scenario.release('S2');
    expect(scenario.state.motors[m1]?.running).toBe(true);
    expect(scenario.state.motors[m2]?.running).toBe(false);

    scenario.press('S3');
    scenario.release('S3');
    expect(scenario.state.motors[m1]?.running).toBe(true);
    expect(scenario.state.motors[m2]?.running).toBe(true);

    const stopped = scenario.press('S1');
    expect(stopped.coils['-KM1']).toBe(false);
    expect(stopped.coils['-KM2']).toBe(false);
    expect(stopped.motors[m1]?.running).toBe(false);
    expect(stopped.motors[m2]?.running).toBe(false);
  });

  it('lights the overload alarm and stops the motors when FG1 trips', () => {
    const scenario = activity('a1_3.cad');
    const m1 = scenario.elementId('M1', 1000);
    const m2 = scenario.elementId('M2', 1000);
    scenario.press('S2'); scenario.release('S2');
    scenario.press('S3'); scenario.release('S3');

    const tripped = scenario.trip('FG1');
    expect(tripped.tripped[scenario.elementId('FG1', 6007)]).toBe(true);
    expect(tripped.motors[m1]?.running).toBe(false);
    expect(tripped.motors[m2]?.running).toBe(false);
    expect(tripped.lamps[scenario.elementId('H1', 9008)]).toBe(true);
  });
});

describe('Actividad 1.4 — tres motores (5.8b)', () => {
  it('starts M1, M2, and M3 in order and S4 stops all three', () => {
    const scenario = activity('a1_4.cad');
    const motors = ['M1', 'M2', 'M3'].map((name) => scenario.elementId(name, 1000));

    for (const button of ['S1', 'S2', 'S3']) {
      scenario.press(button);
      scenario.release(button);
    }
    expect(motors.map((id) => scenario.state.motors[id]?.running)).toEqual([true, true, true]);

    const stopped = scenario.press('S4');
    expect(['-KM1', '-KM2', '-KM3'].map((name) => stopped.coils[name])).toEqual([false, false, false]);
    expect(motors.map((id) => stopped.motors[id]?.running)).toEqual([false, false, false]);
  });

  it('lights the alarm and stops all motors when FG2 trips', () => {
    const scenario = activity('a1_4.cad');
    const motors = ['M1', 'M2', 'M3'].map((name) => scenario.elementId(name, 1000));
    for (const button of ['S1', 'S2', 'S3']) {
      scenario.press(button);
      scenario.release(button);
    }

    const tripped = scenario.trip('FG2');
    expect(tripped.tripped[scenario.elementId('FG2', 6007)]).toBe(true);
    expect(motors.map((id) => tripped.motors[id]?.running)).toEqual([false, false, false]);
    expect(tripped.lamps[scenario.elementId('H1', 9008)]).toBe(true);
  });
});
