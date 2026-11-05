/** Точка входа движка. На этапе 5.1 это заглушка: возвращает пустое состояние. */

import type { Schema } from '../model/types';
import type {
  EngineInput,
  EngineMemory,
  EngineOptions,
  EngineState,
  UserInputs,
} from './types';
import { solveRelayLoop } from './relay-loop';

export const DEFAULT_OPTIONS: Readonly<EngineOptions> = Object.freeze({
  maxRelayIterations: 50,
});

export function createEmptyInputs(): UserInputs {
  return { pressed: {}, toggled: {}, tripped: {} };
}

export function createEmptyMemory(): EngineMemory {
  return { latches: {}, prevCoils: {}, timers: {} };
}

/** Вход «ничего не нажато, время 0, чистая память». */
export function createEngineInput(schema: Schema, time = 0): EngineInput {
  return { schema, inputs: createEmptyInputs(), time, memory: createEmptyMemory() };
}

/** Пустое состояние: нет сетей, нет потенциалов, ничего не включено. */
export function createEmptyEngineState(time = 0, memory?: EngineMemory): EngineState {
  return {
    time,
    nets: [],
    terminalNet: {},
    coils: {},
    contacts: {},
    lamps: {},
    motors: {},
    tripped: {},
    faults: [],
    warnings: [],
    stable: true,
    iterations: 0,
    memory: memory ? cloneMemory(memory) : createEmptyMemory(),
  };
}

export function resolveOptions(partial?: Partial<EngineOptions>): EngineOptions {
  return { ...DEFAULT_OPTIONS, ...partial };
}

function cloneMemory(m: EngineMemory): EngineMemory {
  const timers: EngineMemory['timers'] = {};
  for (const [id, t] of Object.entries(m.timers)) timers[Number(id)] = { ...t };
  return { latches: { ...m.latches }, prevCoils: { ...m.prevCoils }, timers };
}

/**
 * Считает состояние схемы. Чистая функция: вход не меняется.
 * Запускает релейный цикл до стабилизации или ограничения по итерациям.
 */
export function simulate(input: EngineInput): EngineState {
  const state = createEmptyEngineState(input.time, input.memory);
  const options = resolveOptions(input.options);
  const loop = solveRelayLoop(input.schema, input.inputs, options.maxRelayIterations, input.memory?.prevCoils, input.time, state.memory.timers);
  const pass = loop.pass;
  state.nets = pass.nets;
  state.terminalNet = pass.terminalNet;
  state.coils = loop.coils;
  state.contacts = pass.contacts;
  state.lamps = pass.lamps;
  state.motors = pass.motors;
  state.tripped = pass.tripped;
  state.faults = pass.faults;
  state.warnings = pass.warnings;
  state.stable = loop.stable;
  state.iterations = loop.iterations;
  state.memory.prevCoils = { ...loop.coils };
  state.memory.timers = loop.timers;
  return state;
}
