/** Цикл обновления катушек до устойчивого состояния (этап 5.5b). */

import type { Schema } from '../model/types';
import { getCadType } from '../model/cad-types';
import { solvePass } from './relay-pass';
import type { RelayPassResult } from './relay-pass';
import type { Fault, TimerState, UserInputs } from './types';
import { advanceTimers } from './timers';

export interface RelayLoopResult {
  pass: RelayPassResult;
  coils: Record<string, boolean>;
  stable: boolean;
  iterations: number;
  timers: Record<number, TimerState>;
}

/** Уникальные имена катушек в порядке создания (id элемента). */
export function relayCoilNames(schema: Schema): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  const elements = schema.elements
    .map((element, index) => ({ element, index }))
    .sort((a, b) => a.element.id - b.element.id || a.index - b.index);
  for (const { element } of elements) {
    if (getCadType(element.typeCode).family !== 'coil' || element.name === '' || seen.has(element.name)) continue;
    seen.add(element.name);
    names.push(element.name);
  }
  return names;
}

/** Пересчитывает по одной катушке за раз; таймеры обновляет между устойчивыми состояниями схемы. */
export function solveRelayLoop(
  schema: Schema,
  inputs: UserInputs,
  maxRelayIterations = 50,
  initialCoils: Readonly<Record<string, boolean>> = {},
  time = 0,
  initialTimers: Readonly<Record<number, TimerState>> = {},
): RelayLoopResult {
  const limit = Number.isFinite(maxRelayIterations) ? Math.max(1, Math.floor(maxRelayIterations)) : 50;
  const names = relayCoilNames(schema);
  if (schema.elements.length === 0 && schema.wires.length === 0) {
    return {
      pass: { nets: [], terminalNet: {}, coils: {}, contacts: {}, lamps: {}, motors: {}, tripped: {}, faults: [], warnings: [] },
      coils: {},
      stable: true,
      iterations: 0,
      timers: { ...initialTimers },
    };
  }
  const coils: Record<string, boolean> = {};
  for (const name of names) coils[name] = initialCoils[name] ?? false;

  let pass: RelayPassResult | undefined;
  let iterations = 0;
  let stable = false;
  let timers: Record<number, TimerState> = { ...initialTimers };

  // Settle contactors before advancing time. A timer contact can remove power
  // from its own coil; resetting that timer during this same relay transition
  // would reopen its NO contact before the opposite contactor seals in.
  const settleRelays = (): boolean => {
    while (iterations < limit) {
      pass = solvePass(schema, inputs, coils, timers);
      iterations += 1;
      const nextName = names.find((name) => (pass!.coils[name] ?? false) !== (coils[name] ?? false));
      if (nextName === undefined) {
        // Keep a canonical name order in serialized state.
        for (const name of names) coils[name] = pass!.coils[name] ?? false;
        return true;
      }
      coils[nextName] = pass.coils[nextName] ?? false;
    }
    return false;
  };

  stable = settleRelays();
  if (stable && pass) {
    const nextTimers = advanceTimers(schema, pass.nets, pass.terminalNet, time, timers);
    const timersChanged = JSON.stringify(nextTimers) !== JSON.stringify(timers);
    timers = nextTimers;
    // Recalculate timed contacts after elapsed time changes, but advance timers
    // only once per simulation frame so the handoff is resolved atomically.
    if (timersChanged) stable = settleRelays();
  }
  pass ??= solvePass(schema, inputs, coils, timers);

  if (!stable) {
    const fault: Fault = {
      kind: 'unstable',
      message: `unstable: релейный цикл не стабилизировался за ${iterations} итераций`,
    };
    pass = {
      ...pass,
      faults: [...pass.faults, fault],
      warnings: [...pass.warnings, fault.message],
    };
  }

  return { pass, coils, stable, iterations, timers };
}
