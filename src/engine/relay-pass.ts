/** Один проход релейного расчёта: контакты, питание, нагрузки, катушки. */

import type { Schema } from '../model/types';
import { getCadType } from '../model/cad-types';
import { buildNets } from './graph';
import { computeSwitching } from './switching';
import { findSources } from './sources';
import { propagatePotentials } from './propagate';
import { evaluateLoads, isEnergized } from './loads';
import type { Fault, NetState, TerminalKey, TimerState, UserInputs } from './types';
import { terminalKey } from './types';
import { evaluateMotors } from './motors';
import { resolveThermalState } from './thermal';

export interface RelayPassResult {
  nets: NetState[];
  terminalNet: Record<TerminalKey, number>;
  coils: Record<string, boolean>;
  contacts: Record<number, boolean>;
  lamps: Record<number, boolean>;
  motors: Record<number, import('./types').MotorState>;
  tripped: Record<number, boolean>;
  faults: Fault[];
  warnings: string[];
}

/** Типовой код механической блокировки (Enclavamiento): имена двух контакторов в name и func. */
const INTERLOCK_TYPE = 2009;

/**
 * Механическая блокировка: пока включён один из двух контакторов, второй включиться не может.
 * `current` — состояние катушек в начале прохода (то, что уже физически притянуто), `next` — то, что
 * цепь хочет выставить; правим `next`. Если оба хотят включиться одновременно, выигрывает первый
 * (имя в name); релейный цикл меняет катушки по одной, так что исход детерминирован.
 */
function applyInterlocks(schema: Schema, current: Readonly<Record<string, boolean>>, next: Record<string, boolean>): void {
  for (const element of schema.elements) {
    if (element.typeCode !== INTERLOCK_TYPE) continue;
    const a = element.name.trim();
    const b = element.func.trim();
    if (a === '' || b === '' || a === b || !(a in next) || !(b in next)) continue;
    const aOn = current[a] ?? false;
    const bOn = current[b] ?? false;
    if (aOn && !bOn) next[b] = false;
    else if (bOn && !aOn) next[a] = false;
    else if (!aOn && !bOn && next[a] && next[b]) next[b] = false;
  }
}

/**
 * Выполняет расчёт с заданными состояниями катушек. Новые состояния катушек
 * становятся входом следующего прохода, поэтому соответствующие контакты
 * меняются на следующей итерации, а не внутри этого прохода.
 */
export function solvePass(
  schema: Schema,
  inputs: UserInputs,
  coils: Readonly<Record<string, boolean>> = {},
  timers: Readonly<Record<number, TimerState>> = {},
): RelayPassResult {
  const graph = buildNets(schema);
  const thermal = resolveThermalState(schema, inputs);
  const switching = computeSwitching(schema, inputs, coils, thermal, timers);
  const sourceResult = findSources(schema, graph.terminalNet);
  const nets = propagatePotentials(graph.nets, graph.terminalNet, sourceResult.sources, switching.edges);
  const loads = evaluateLoads(schema, nets, graph.terminalNet);
  const netById = new Map(nets.map((net) => [net.id, net] as const));
  const nextCoils: Record<string, boolean> = {};

  for (const element of schema.elements) {
    if (getCadType(element.typeCode).family !== 'coil' || element.name === '') continue;
    nextCoils[element.name] ??= false;
    const aId = graph.terminalNet[terminalKey(element.id, 0)];
    const bId = graph.terminalNet[terminalKey(element.id, 1)];
    const a = aId === undefined ? undefined : netById.get(aId);
    const b = bId === undefined ? undefined : netById.get(bId);
    if (a && b && isEnergized(a, b).energized) nextCoils[element.name] = true;
  }

  applyInterlocks(schema, coils, nextCoils);

  return {
    nets,
    terminalNet: graph.terminalNet,
    coils: nextCoils,
    contacts: switching.contacts,
    lamps: loads.lamps,
    motors: evaluateMotors(schema, nets, graph.terminalNet, switching.edges),
    tripped: thermal.tripped,
    faults: loads.faults,
    warnings: [
      ...graph.warnings.map((warning) => warning.message),
      ...switching.warnings,
      ...sourceResult.warnings,
    ],
  };
}
