import { describe, it, expect } from 'vitest';
import { createEmptySchema, importCad } from '@model/index';
import {
  simulate,
  createEngineInput,
  createEmptyEngineState,
  createEmptyInputs,
  createEmptyMemory,
  resolveOptions,
  terminalKey,
  terminalKeyOf,
  createInitialState,
  type EngineState,
} from '@engine/index';
import { fixture } from './helpers';

describe('engine contract (5.1)', () => {
  it('empty schema gives an empty, stable state', () => {
    const st = simulate(createEngineInput(createEmptySchema()));
    expect(st).toEqual(createEmptyEngineState());
    expect(st.stable).toBe(true);
    expect(st.iterations).toBe(0);
    expect(st.nets).toHaveLength(0);
    expect(st.faults).toHaveLength(0);
  });

  it('calculates networks and electrical states for a real schema', () => {
    const { schema } = importCad(fixture('a1_1_1.cad'));
    expect(schema.elements.length).toBeGreaterThan(0);
    const st = simulate(createEngineInput(schema, 2.5));
    expect(st.time).toBe(2.5);
    expect(st.nets.length).toBeGreaterThan(0);
    expect(Object.keys(st.terminalNet).length).toBeGreaterThan(0);
    expect(st.coils['-KM1']).toBe(false);
    expect(Object.keys(st.motors).length).toBeGreaterThan(0);
    expect(Object.keys(st.lamps).length).toBeGreaterThan(0);
    expect(Object.keys(st.contacts).length).toBeGreaterThan(0);
  });

  it('does not mutate the input', () => {
    const { schema } = importCad(fixture('a1_1_1.cad'));
    const input = createEngineInput(schema);
    input.memory!.latches['KM1'] = true;
    const before = JSON.stringify(input);
    simulate(input);
    expect(JSON.stringify(input)).toBe(before);
  });

  it('is deterministic', () => {
    const { schema } = importCad(fixture('a1_1_1.cad'));
    const input = createEngineInput(schema, 1);
    expect(simulate(input)).toEqual(simulate(input));
  });

  it('copies memory instead of sharing it', () => {
    const input = createEngineInput(createEmptySchema());
    input.memory!.latches['KM1'] = true;
    input.memory!.timers[7] = { phase: 'counting', elapsed: 1.5 };
    const st = simulate(input);
    expect(st.memory).toEqual(input.memory);
    expect(st.memory).not.toBe(input.memory);
    expect(st.memory.latches).not.toBe(input.memory!.latches);
    expect(st.memory.timers[7]).not.toBe(input.memory!.timers[7]);
  });

  it('works without memory in the input', () => {
    const st = simulate({ schema: createEmptySchema(), inputs: createEmptyInputs(), time: 0 });
    expect(st.memory).toEqual(createEmptyMemory());
  });

  it('state survives a JSON round trip', () => {
    const st = simulate(createEngineInput(createEmptySchema(), 3));
    const back = JSON.parse(JSON.stringify(st)) as EngineState;
    expect(back).toEqual(st);
  });

  it('terminal keys are stable and invertible', () => {
    expect(terminalKey(12, 3)).toBe('12:3');
    expect(terminalKeyOf({ element: 5, index: 0 })).toBe('5:0');
  });

  it('options: default relay limit is 50 and can be overridden', () => {
    expect(resolveOptions().maxRelayIterations).toBe(50);
    expect(resolveOptions({ maxRelayIterations: 10 }).maxRelayIterations).toBe(10);
  });

  it('session state is still available', () => {
    expect(createInitialState()).toEqual({ mode: 'edit', time: 0 });
  });
});
