import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createEmptyInputs, createEngineInput, simulate } from '@engine/index';
import { LIFT_START, liftActiveRoles, liftMemory } from '@engine/lift';
import type { EngineMemory, EngineState, UserInputs } from '@engine/types';
import { exportCad } from '@model/cad-export';
import { importCad } from '@model/cad-import';
import { LIFT_TYPE, liftRoleName, setLiftRoleName } from '@model/lift';
import type { Schema } from '@model/types';

const EXAMPLE = 'src/data/examples/Ejemplos del autor/Ascensor_5_plantas_con_variador.cad';
const load = (): Schema => importCad(readFileSync(resolve(process.cwd(), EXAMPLE), 'latin1')).schema;
const byName = (schema: Schema, name: string) => schema.elements.find((element) => element.name === name)!;
const liftOf = (schema: Schema) => schema.elements.find((element) => element.typeCode === LIFT_TYPE)!;

/** Прогон симуляции шагами 0,1 с; press — кнопки, которые держат нажатыми первые 0,3 с. */
function runner(schema: Schema) {
  let memory: EngineMemory | undefined;
  let time = 0;
  let last: EngineState | undefined;
  const inputs: UserInputs = createEmptyInputs();
  return {
    inputs,
    run(seconds: number, press: string[] = []) {
      for (let k = 0; k < Math.round(seconds / 0.1); k++) {
        for (const name of press) inputs.pressed[byName(schema, name).id] = k < 3;
        last = simulate({ ...createEngineInput(schema, time), inputs, memory });
        memory = last.memory;
        time += 0.1;
      }
      for (const name of press) inputs.pressed[byName(schema, name).id] = false;
      return liftMemory(liftOf(schema), last!.memory.timers);
    },
  };
}

describe('lift example with VFD', () => {
  it('goes to the called floor and stops level, up and down', { timeout: 30000 }, () => {
    const schema = load();
    const sim = runner(schema);
    let m = sim.run(0.5);
    expect(m.pos).toBe(0);
    m = sim.run(14, ['-S3']);
    expect(m.fault).toBeUndefined();
    expect(m.pos).toBeCloseTo(2, 2);
    expect(m.speed).toBe(0);
    m = sim.run(14, ['-S5']);
    expect(m.fault).toBeUndefined();
    expect(m.pos).toBeCloseTo(4, 2);
    m = sim.run(20, ['-S1']);
    expect(m.fault).toBeUndefined();
    expect(m.pos).toBeCloseTo(0, 2);
  });

  it('opens and closes the doors by the end sensors; a person in the doorway keeps them open', { timeout: 30000 }, () => {
    const schema = load();
    const lift = liftOf(schema);
    const sim = runner(schema);
    let m = sim.run(5, ['-S6']);
    expect(m.door).toBe(1);
    m = sim.run(5, ['-S7']);
    expect(m.door).toBe(0);
    sim.run(5, ['-S6']);
    sim.inputs.toggled[lift.id] = true;
    m = sim.run(5, ['-S7']);
    expect(m.door).toBe(1);
    expect(m.fault).toBeUndefined();
    sim.inputs.toggled[lift.id] = false;
    m = sim.run(1.5, ['-S7']);
    expect(m.door).toBeLessThan(0.7);
    sim.inputs.toggled[lift.id] = true;
    m = sim.run(5);
    expect(m.door).toBe(1);
    expect(m.fault).toBeUndefined();
  });

  it('does not travel while the doors are open', { timeout: 30000 }, () => {
    const schema = load();
    const sim = runner(schema);
    sim.run(5, ['-S6']);
    const m = sim.run(5, ['-S3']);
    expect(m.pos).toBe(0);
    expect(m.fault).toBeUndefined();
  });
});

describe('lift drive faults', () => {
  it('a hoist motor fed from the mains without a VFD runs away and crashes into the top', { timeout: 30000 }, () => {
    const schema = load();
    // -M2 (puertas) va directo de la red: lo usamos como motor de elevación.
    setLiftRoleName(liftOf(schema), 'hoist', '-M2');
    const m = runner(schema).run(4, ['-S6']);
    expect(m.fault).toBe('crash-top');
    expect(m.cause).toBe('mains');
  });

  it('above 25 Hz the cabin overspeeds; below 10 Hz the motor stalls', { timeout: 30000 }, () => {
    const fast = load();
    byName(fast, '-G1').params.vfd_aiHz = 40;
    const m = runner(fast).run(6, ['-S5']);
    expect(m.fault).toBe('crash-top');
    expect(m.cause).toBe('overspeed');
    const slow = load();
    byName(slow, '-G1').params.vfd_aiHz = 5;
    const s = runner(slow).run(4, ['-S3']);
    expect(s.stalled).toBe(true);
    expect(s.pos).toBe(0);
  });
});

describe('lift sensors and names', () => {
  it('reports the floor, door and photocell sensors', () => {
    expect([...liftActiveRoles(LIFT_START, false)].sort()).toEqual(['doorClosed', 'floor1']);
    expect([...liftActiveRoles({ ...LIFT_START, pos: 2.5, door: 1 }, true)].sort()).toEqual(['doorOpen', 'photo']);
    expect([...liftActiveRoles({ ...LIFT_START, pos: 3, door: 0 }, true)]).toEqual(['floor4', 'doorClosed']);
  });

  it('keeps renamed built-in parts in .cad', () => {
    const schema = load();
    const lift = liftOf(schema);
    setLiftRoleName(lift, 'floor3', 'SQ3');
    setLiftRoleName(lift, 'photo', '-BF/1');
    const back = liftOf(importCad(exportCad(schema)).schema);
    expect(liftRoleName(back, 'floor3')).toBe('SQ3');
    expect(liftRoleName(back, 'photo')).toBe('-BF1');
    expect(liftRoleName(back, 'hoist')).toBe('-M1');
  });
});

