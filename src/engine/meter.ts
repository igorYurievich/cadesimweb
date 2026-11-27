/**
 * Виртуальный мультиметр: показания по состоянию движка. Без DOM — только расчёт.
 *  - Напряжение между двумя сетями по меткам потенциалов: фаза–фаза 400 В, фаза–N/PE 230 В, «+»–«−» 24 В.
 *  - Прозвонка: есть ли цепь между сетями по проводам и замкнутым контактам (нагрузки цепь не дают).
 */

import type { Schema } from '../model/types';
import { computeSwitching } from './switching';
import { resolveThermalState } from './thermal';
import { cachedNets } from './topology';
import { UnionFind } from './union-find';
import type { NetState, PotentialLabel, TimerState, UserInputs } from './types';
import { terminalKey } from './types';

/** Линейное напряжение сети, В. */
export const LINE_VOLTAGE = 400;
/** Фазное напряжение (фаза–нейтраль), В. */
export const PHASE_VOLTAGE = 230;
/** Напряжение блоков питания постоянного тока, В. */
export const DC_VOLTAGE = 24;

export interface VoltageReading {
  /** Напряжение красного щупа относительно чёрного, В (для постоянного тока со знаком). */
  volts: number;
  /** Постоянное напряжение (между «+» и «−»). */
  dc: boolean;
}

const PHASES: ReadonlySet<PotentialLabel> = new Set(['L1', 'L2', 'L3']);
const AC_ZERO: ReadonlySet<PotentialLabel> = new Set(['N', 'PE']);

/** Напряжение между двумя потенциалами; красный щуп — first. */
function pairVoltage(first: PotentialLabel, second: PotentialLabel): VoltageReading {
  if (first === second) return { volts: 0, dc: first === '+' || first === '-' };
  if (PHASES.has(first) && PHASES.has(second)) return { volts: LINE_VOLTAGE, dc: false };
  if ((PHASES.has(first) && AC_ZERO.has(second)) || (AC_ZERO.has(first) && PHASES.has(second))) {
    return { volts: PHASE_VOLTAGE, dc: false };
  }
  if (first === '+' && second === '-') return { volts: DC_VOLTAGE, dc: true };
  if (first === '-' && second === '+') return { volts: -DC_VOLTAGE, dc: true };
  // N–PE, переменное против постоянного (блок питания развязан от сети): разницы нет.
  return { volts: 0, dc: false };
}

/**
 * Напряжение между сетями щупов. Пустой список — щуп не на проводе или провод обесточен.
 * Если в сети несколько потенциалов (короткое замыкание), берётся наибольшее значение.
 */
export function voltageBetween(red: readonly PotentialLabel[], black: readonly PotentialLabel[]): VoltageReading {
  let best: VoltageReading = { volts: 0, dc: red.some(isDc) && black.some(isDc) };
  for (const first of red) {
    for (const second of black) {
      const reading = pairVoltage(first, second);
      if (Math.abs(reading.volts) > Math.abs(best.volts)) best = reading;
    }
  }
  return best;
}

function isDc(potential: PotentialLabel): boolean {
  return potential === '+' || potential === '-';
}

/** Сеть под напряжением: в ней есть хоть один потенциал. */
export function netIsLive(net: NetState | undefined): boolean {
  return (net?.potentials.length ?? 0) > 0;
}

export interface ContinuityInput {
  schema: Schema;
  inputs: UserInputs;
  coils?: Readonly<Record<string, boolean>>;
  timers?: Readonly<Record<number, TimerState>>;
}

/**
 * Прозвонка: соединены ли сети a и b проводами и замкнутыми контактами при текущем положении аппаратов.
 * Катушки, лампы и обмотки не считаются цепью: прибор показывает обрыв, как на большом сопротивлении.
 */
export function continuity(input: ContinuityInput, a: number, b: number): boolean {
  if (a === b) return true;
  const graph = cachedNets(input.schema);
  const thermal = resolveThermalState(input.schema, input.inputs);
  const switching = computeSwitching(input.schema, input.inputs, input.coils ?? {}, thermal, input.timers ?? {});
  const uf = new UnionFind(graph.nets.length);
  for (const edge of switching.edges) {
    const from = graph.terminalNet[terminalKey(edge.a.element, edge.a.index)];
    const to = graph.terminalNet[terminalKey(edge.b.element, edge.b.index)];
    if (from !== undefined && to !== undefined) uf.union(from, to);
  }
  if (a < 0 || b < 0 || a >= graph.nets.length || b >= graph.nets.length) return false;
  return uf.connected(a, b);
}
