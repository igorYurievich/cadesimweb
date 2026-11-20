/**
 * Функциональные блоки Ladder (plc-blocks.ts в model): биестабильный, делитель, таймеры, счётчики.
 *
 * Вход блока включён, когда на его клемме есть «+» шины (или фаза). Состояние блока хранится в памяти таймеров
 * по id элемента (TimerState: q, count, inputs — уровни входов прошлого кадра для фронтов, elapsed — время).
 * Пересчёт раз в кадр после устойчивого состояния схемы (relay-loop.ts), как у таймеров 9004.
 * Выход Q, пока блок включён, отдаёт «+» в сеть своей клеммы (plcBlockSources), а имя блока — операнд.
 */

import type { Schema, SchemaElement } from '../model/types';
import { BLOCK_SPECS, PLC_BLOCK, isPlcBlock } from '../model/plc-blocks';
import type { PotentialSource } from './sources';
import type { NetState, TerminalKey, TimerState } from './types';
import { terminalKey } from './types';

const LIVE = new Set(['+', 'L1', 'L2', 'L3']);

const seconds = (element: SchemaElement, key: 'time' | 'time2'): number => {
  const value = Number(element.params[key] ?? 1);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
};

/** Новое состояние блока по уровням входов в этом кадре; dt — прошедшее время, с. */
function step(element: SchemaElement, inputs: boolean[], prior: TimerState | undefined, dt: number): TimerState {
  const before = prior?.inputs ?? inputs.map(() => false);
  const rose = (k: number): boolean => Boolean(inputs[k]) && !before[k];
  const q0 = prior?.q ?? false;
  const elapsed0 = prior?.elapsed ?? 0;
  const run = (q: boolean, elapsed = 0, count = prior?.count ?? 0): TimerState =>
    ({ phase: q ? 'done' : elapsed > 0 ? 'counting' : 'idle', elapsed, q, count, inputs });
  const on = Boolean(inputs[0]);
  const preset = Number(element.params.preset ?? 0);
  const reached = (count: number): boolean => preset > 0 && count >= preset;
  switch (element.typeCode) {
    case PLC_BLOCK.bistable: return run(inputs[1] ? false : inputs[0] ? true : q0);
    case PLC_BLOCK.divider: return run(rose(0) ? !q0 : q0);
    case PLC_BLOCK.ton: {
      const elapsed = on ? elapsed0 + dt : 0;
      return run(on && elapsed >= seconds(element, 'time'), elapsed);
    }
    case PLC_BLOCK.tp: {
      const elapsed = rose(0) && !q0 ? 0 : q0 ? elapsed0 + dt : 0;
      const q = (rose(0) && !q0) || (q0 && elapsed < seconds(element, 'time'));
      return run(q, q ? elapsed : 0);
    }
    case PLC_BLOCK.tof: {
      if (on) return run(true, 0);
      const elapsed = q0 ? elapsed0 + dt : 0;
      return run(q0 && elapsed < seconds(element, 'time'), elapsed);
    }
    case PLC_BLOCK.blink:
    case PLC_BLOCK.pulse: {
      if (!on) return run(false, 0);
      const high = seconds(element, 'time');
      const low = element.typeCode === PLC_BLOCK.pulse ? seconds(element, 'time2') : high;
      const period = high + low;
      const elapsed = period > 0 ? (elapsed0 + (prior?.inputs?.[0] ? dt : 0)) % period : 0;
      return { ...run(elapsed < high, elapsed), phase: 'counting' };
    }
    case PLC_BLOCK.counter: {
      const count = inputs[0] ? 0 : (prior?.count ?? 0) + (rose(1) ? (inputs[2] ? -1 : 1) : 0);
      return run(reached(count), 0, count);
    }
    case PLC_BLOCK.updown: {
      let count = prior?.count ?? 0;
      if (rose(0)) count += 1;
      if (rose(1)) count -= 1;
      if (inputs[3]) count = preset;
      if (inputs[2]) count = 0;
      return run(reached(count), 0, count);
    }
    default: return run(q0);
  }
}

/** Пересчитывает блоки Ladder на момент time; остальные записи памяти не трогает. */
export function advancePlcBlocks(
  schema: Schema,
  nets: readonly NetState[],
  terminalNet: Readonly<Record<TerminalKey, number>>,
  time: number,
  previous: Readonly<Record<number, TimerState>>,
): Record<number, TimerState> {
  const byNet = new Map(nets.map((net) => [net.id, net] as const));
  const result: Record<number, TimerState> = { ...previous };
  const now = Number.isFinite(time) ? time : 0;
  for (const element of schema.elements) {
    const spec = BLOCK_SPECS[element.typeCode];
    if (!spec) continue;
    const inputs = Array.from({ length: spec.inputs }, (_, k) => {
      const net = byNet.get(terminalNet[terminalKey(element.id, k)] ?? -1);
      return Boolean(net?.potentials.some((potential) => LIVE.has(potential)));
    });
    const prior = previous[element.id];
    const dt = Math.max(0, now - (prior?.lastTime ?? now));
    result[element.id] = { ...step(element, inputs, prior, dt), lastTime: now };
  }
  return result;
}

/** «+» на выходах включённых блоков. */
export function plcBlockSources(
  schema: Schema,
  terminalNet: Readonly<Record<TerminalKey, number>>,
  timers: Readonly<Record<number, TimerState>>,
): PotentialSource[] {
  const sources: PotentialSource[] = [];
  for (const element of schema.elements) {
    if (!isPlcBlock(element.typeCode) || !timers[element.id]?.q) continue;
    const index = element.terminals.length - 1;
    const net = terminalNet[terminalKey(element.id, index)];
    if (net !== undefined) sources.push({ terminal: { element: element.id, index }, net, potential: '+' });
  }
  return sources;
}
