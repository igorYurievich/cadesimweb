/** Питание ламп и обнаружение коротких замыканий / утечек (этап 5.4b). */

import type { Schema } from '../model/types';
import { getBehavior } from './behaviors';
import type { Fault, NetState, PotentialLabel, TerminalKey } from './types';
import { terminalKey } from './types';

export interface EnergizedResult {
  energized: boolean;
  earthLeak: boolean;
}

const PHASES: readonly PotentialLabel[] = ['L1', 'L2', 'L3'];
const AC_ORDER: readonly PotentialLabel[] = ['L1', 'L2', 'L3', 'N'];

/** Проверяет нагрузку между двумя сетями; сама нагрузка не становится ребром. */
export function isEnergized(a: NetState, b: NetState): EnergizedResult {
  if (a.id === b.id) return { energized: false, earthLeak: false };
  let energized = false;
  let earthLeak = false;
  for (const left of a.potentials) {
    for (const right of b.potentials) {
      if (left === right) continue;
      const phaseToNeutral = (PHASES.includes(left) && right === 'N') || (PHASES.includes(right) && left === 'N');
      const phaseToPhase = PHASES.includes(left) && PHASES.includes(right);
      const dcPair = (left === '+' && right === '-') || (left === '-' && right === '+');
      if (phaseToNeutral || phaseToPhase || dcPair) energized = true;
      if ((PHASES.includes(left) && right === 'PE') || (PHASES.includes(right) && left === 'PE')) {
        energized = true;
        earthLeak = true;
      }
    }
  }
  return { energized, earthLeak };
}

export interface LoadsResult {
  lamps: Record<number, boolean>;
  faults: Fault[];
}

/** Считает лампы и диагностирует замыкания; защитные аппараты не отключает. */
export function evaluateLoads(
  schema: Schema,
  nets: readonly NetState[],
  terminalNet: Record<TerminalKey, number>,
): LoadsResult {
  const byId = new Map(nets.map((net) => [net.id, net] as const));
  const lamps: Record<number, boolean> = {};
  const faults: Fault[] = [];
  const faultKeys = new Set<string>();
  const addFault = (fault: Fault, key: string): void => {
    if (faultKeys.has(key)) return;
    faultKeys.add(key);
    faults.push(fault);
  };

  // Разные AC-потенциалы или оба полюса DC в одной сети означают проводящее КЗ.
  for (const net of nets) {
    const ac = AC_ORDER.filter((p) => net.potentials.includes(p));
    const dc = (['+', '-'] as const).filter((p) => net.potentials.includes(p));
    const pair = ac.length > 1 ? [ac[0], ac[1]] : dc.length > 1 ? [dc[0], dc[1]] : undefined;
    if (pair) {
      const between = pair as [PotentialLabel, PotentialLabel];
      addFault({
        kind: 'short-circuit',
        message: `short-circuit: сеть ${net.id} содержит потенциалы ${between[0]} и ${between[1]}`,
        between,
        nets: [net.id],
      }, `short:${net.id}:${between.join(':')}`);
    }
    if (net.potentials.includes('PE') && net.potentials.some((p) => PHASES.includes(p))) {
      const phase = PHASES.find((p) => net.potentials.includes(p)) as PotentialLabel;
      addFault({
        kind: 'earth-leak',
        message: `earth-leak: сеть ${net.id} соединяет ${phase} с PE`,
        between: [phase, 'PE'],
        nets: [net.id],
      }, `earth:${net.id}`);
    }
  }

  for (const element of schema.elements) {
    const behavior = getBehavior(element.typeCode);
    if (element.typeCode === 9008) lamps[element.id] = false;
    // Motor windings are modeled as three-phase terminals in step 5.6.
    if (element.typeCode === 1000) continue;
    for (const link of behavior.links) {
      if (link.kind !== 'load' || link.terminals.length !== 2) continue;
      const [ia, ib] = link.terminals;
      if (ia === undefined || ib === undefined) continue;
      const netA = terminalNet[terminalKey(element.id, ia)];
      const netB = terminalNet[terminalKey(element.id, ib)];
      const a = netA === undefined ? undefined : byId.get(netA);
      const b = netB === undefined ? undefined : byId.get(netB);
      if (!a || !b) continue;
      const result = isEnergized(a, b);
      if (element.typeCode === 9008) lamps[element.id] = result.energized;
      if (result.earthLeak) {
        const ids = [a.id, b.id].sort((x, y) => x - y);
        const phase = PHASES.find((p) => a.potentials.includes(p) || b.potentials.includes(p)) as PotentialLabel;
        addFault({
          kind: 'earth-leak',
          message: `earth-leak: нагрузка ${element.id} подключена между ${phase} и PE`,
          between: [phase, 'PE'],
          nets: ids,
        }, `earth:${ids.join(':')}`);
      }
    }
  }

  return { lamps, faults };
}
