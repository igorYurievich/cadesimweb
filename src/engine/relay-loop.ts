/** Цикл обновления катушек до устойчивого состояния (этап 5.5b). */

import type { Schema } from '../model/types';
import { drivesNamedRelay } from './sensors';
import { solvePass } from './relay-pass';
import { cachedNets } from './topology';
import { jsonEqual } from './json-equal';
import type { RelayPassResult } from './relay-pass';
import type { Fault, TimerState, UserInputs } from './types';
import { advanceTimers } from './timers';
import { advanceDelayBlocks } from './delay-blocks';
import { advanceStairTimers, stairTimerKeys } from './stair-timer';
import { LOCK_PREFIX, beginPlcScan, endPlcScan, logoRelayNames } from './plc';
import { s7RelayNames } from './s7-1200';
import { ladderManualNames } from './ladder-manual';
import { advancePlcBlocks } from './plc-blocks';
import { advanceVfds, vfdKeys } from './vfd';
import { advanceGrafcet, grafcetRelayNames } from './grafcet';
import { photoEmitterKeys } from './photo-beam';
import { electronicRelayKeys } from './electronic-relays';
import { advanceCoilRelays, coilRelayKeys } from './coil-relays';
import { advanceLifts, withLiftSensors } from './lift';

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
    if (!drivesNamedRelay(element) || element.name === '' || seen.has(element.name)) continue;
    seen.add(element.name);
    names.push(element.name);
  }
  // Операнды, которые задаёт LOGO: «запитан» и входы I1…I8 (plc.ts); входы минутников (stair-timer.ts).
  for (const name of [...logoRelayNames(schema), ...stairTimerKeys(schema), ...s7RelayNames(schema), ...vfdKeys(schema),
    ...grafcetRelayNames(schema), ...photoEmitterKeys(schema), ...ladderManualNames(schema),
    ...electronicRelayKeys(schema), ...coilRelayKeys(schema)]) {
    if (!seen.has(name)) names.push(name);
    seen.add(name);
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
  beginPlcScan(schema, names, initialCoils, coils);

  // Граф цепей один на весь кадр: геометрия внутри цикла не меняется.
  const graph = cachedNets(schema);
  let pass: RelayPassResult | undefined;
  let iterations = 0;
  let stable = false;
  let timers: Record<number, TimerState> = { ...initialTimers };

  // Settle contactors before advancing time. A timer contact can remove power
  // from its own coil; resetting that timer during this same relay transition
  // would reopen its NO contact before the opposite contactor seals in.
  const settleRelays = (): boolean => {
    while (iterations < limit) {
      // Датчики лифта срабатывают по положению кабины (lift.ts), как зажатые мышью.
      pass = solvePass(schema, withLiftSensors(schema, inputs, timers), coils, timers, graph);
      iterations += 1;
      // Закреплённые в этом кадре операнды Set / Reset (plc.ts) живут до конца кадра.
      for (const key of Object.keys(pass.coils)) {
        if (key.startsWith(LOCK_PREFIX)) coils[key] = pass.coils[key] ?? false;
      }
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
    const coilTimers = advanceTimers(schema, pass.nets, pass.terminalNet, time, timers);
    // Блоки с выдержкой 2D считают от устойчивого состояния своих катушек.
    const delayTimers = advanceStairTimers(
      schema, coils, pass.nets, pass.terminalNet, time,
      advanceCoilRelays(schema, coils, time, advanceDelayBlocks(schema, coils, time, coilTimers), inputs.clock),
    );
    // Блоки Ladder: таймеры, счётчики, биестабильный и делитель (plc-blocks.ts).
    // Преобразователи частоты: частота по рампам (vfd.ts).
    const plcTimers = advancePlcBlocks(schema, pass.nets, pass.terminalNet, time, delayTimers);
    const vfdTimers = advanceVfds(schema, coils, time, plcTimers);
    // Лифт: кабина и двери по моторам схемы (lift.ts).
    const blockTimers = advanceLifts(schema, pass, inputs, time, vfdTimers);
    // GRAFCET: переходы по устойчивому состоянию схемы, раз за кадр (grafcet.ts).
    const nextTimers = advanceGrafcet(schema, pass.terminalNet, coils, inputs, time, blockTimers);
    const timersChanged = !jsonEqual(nextTimers, timers);
    timers = nextTimers;
    // Recalculate timed contacts after elapsed time changes, but advance timers
    // only once per simulation frame so the handoff is resolved atomically.
    if (timersChanged) stable = settleRelays();
  }
  pass ??= solvePass(schema, withLiftSensors(schema, inputs, timers), coils, timers, graph);

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

  endPlcScan(schema, coils);
  return { pass, coils, stable, iterations, timers };
}
