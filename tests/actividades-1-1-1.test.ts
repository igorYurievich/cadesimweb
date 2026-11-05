import { describe, expect, it } from 'vitest';
import { CadScenario } from './scenario';
import { fixture } from './helpers';

function activity(): CadScenario {
  return new CadScenario(fixture('a1_1_1.cad'));
}

describe('Actividad 1.1.1 — escenario `.cad` real (5.8a)', () => {
  it('starts M1 when S2 is pressed', () => {
    const scenario = activity();
    const state = scenario.press('S2');

    expect(state.coils['-KM1']).toBe(true);
    expect(state.motors[scenario.elementId('M1', 1000)]).toEqual({ running: true, faulted: false });
    expect(state.stable).toBe(true);
  });

  it('holds M1 after S2 is released through the KM1 auxiliary contact', () => {
    const scenario = activity();
    scenario.press('S2');
    const state = scenario.release('S2');

    expect(state.coils['-KM1']).toBe(true);
    expect(state.contacts[scenario.elementId('KM1', 7000)]).toBe(true);
    expect(state.motors[scenario.elementId('M1', 1000)]?.running).toBe(true);
  });

  it('advances time through the scenario helper without losing the circuit state', () => {
    const scenario = activity();
    scenario.press('S2');
    const state = scenario.advance(2.5);

    expect(state.time).toBe(2.5);
    expect(state.coils['-KM1']).toBe(true);
  });

  it('stops M1 when S1 is pressed', () => {
    const scenario = activity();
    scenario.press('S2');
    scenario.release('S2');
    const state = scenario.press('S1');

    expect(state.coils['-KM1']).toBe(false);
    expect(state.motors[scenario.elementId('M1', 1000)]?.running).toBe(false);
  });

  it('opens the power poles and changes the thermal alarm when FG1 trips', () => {
    const scenario = activity();
    scenario.press('S2');
    scenario.release('S2');
    const normal = scenario.state;
    const motorId = scenario.elementId('M1', 1000);
    const lampId = scenario.elementId('H', 9008);
    expect(normal.motors[motorId]?.running).toBe(true);
    expect(normal.lamps[lampId]).toBe(false);

    const tripped = scenario.trip('FG1');
    expect(tripped.tripped[scenario.elementId('FG1', 6007)]).toBe(true);
    expect(tripped.motors[motorId]?.running).toBe(false);
    expect(tripped.lamps[lampId]).toBe(true);
  });
});
