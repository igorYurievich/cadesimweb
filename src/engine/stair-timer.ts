/**
 * Автомат лестничного освещения Alst 8 (8110, model/stair-timer.ts).
 *  - Вход по выбранному подключению: «3 hilos» — катушка между P и 4, кнопка замыкает 4 на N (учебник,
 *    рис. 2.5); «4 hilos» — катушка между 4 и N, кнопка подаёт на 4 фазу. Нужно питание P–N.
 *    Операнд @STAIR<id> в карте катушек.
 *  - Контакт P–3 замыкается сразу с импульсом и держится выдержку колеса после отпускания кнопки;
 *    новое нажатие перезапускает отсчёт. Пропало питание P–N — контакт отпускает сразу.
 *  - Синий движок «☼» (клик в симуляции, inputs.toggled) замыкает P–3 постоянно, как в аппарате.
 * Отсчёт хранится в EngineMemory.timers по id аппарата, как у блоков с выдержкой (delay-blocks.ts).
 */

import {
  STAIR_TIMER_2D, STAIR_TIMER_INDEX, stairTimerKey, stairTimerMinutes, stairTimerWiring,
} from '../model/stair-timer';
import type { Schema, SchemaElement } from '../model/types';
import type { BehaviorLink, TypeBehavior } from './behaviors';
import { isEnergized } from './loads';
import { terminalKey, type NetState, type TerminalKey, type TimerState } from './types';

export const STAIR_TIMER_BEHAVIORS: readonly TypeBehavior[] = [{
  typeCode: STAIR_TIMER_2D,
  links: [
    { terminals: [STAIR_TIMER_INDEX.P, STAIR_TIMER_INDEX.LAMP], kind: 'switch', control: 'coil-name' },
    { terminals: [STAIR_TIMER_INDEX.P, STAIR_TIMER_INDEX.LAMP], kind: 'switch', control: 'toggled' },
  ] satisfies BehaviorLink[],
}];

const isStairTimer = (element: SchemaElement): boolean => element.typeCode === STAIR_TIMER_2D;

/** Операнды входов всех аппаратов листа (для списка катушек relay-loop.ts). */
export const stairTimerKeys = (schema: Schema): string[] => schema.elements.filter(isStairTimer).map(stairTimerKey);

/** Выдержка в секундах. */
export const stairTimerSeconds = (element: SchemaElement): number => stairTimerMinutes(element) * 60;

/** Выставляет @STAIR<id>: аппарат запитан (P–N) и катушка под напряжением (P–4 у 3 проводов, 4–N у 4 проводов). */
export function applyStairTimerInputs(
  schema: Schema,
  terminalNet: Readonly<Record<TerminalKey, number>>,
  netById: ReadonlyMap<number, NetState>,
  next: Record<string, boolean>,
): void {
  const netOf = (element: SchemaElement, index: number): NetState | undefined => {
    const id = terminalNet[terminalKey(element.id, index)];
    return id === undefined ? undefined : netById.get(id);
  };
  const energized = (a?: NetState, b?: NetState): boolean => Boolean(a && b && isEnergized(a, b).energized);
  for (const element of schema.elements) {
    if (!isStairTimer(element)) continue;
    const phase = netOf(element, STAIR_TIMER_INDEX.P);
    const neutral = netOf(element, STAIR_TIMER_INDEX.N);
    const button = netOf(element, STAIR_TIMER_INDEX.BUTTON);
    const coil = stairTimerWiring(element) === 4 ? energized(button, neutral) : energized(phase, button);
    next[stairTimerKey(element)] = energized(phase, neutral) && coil;
  }
}

/** Контакт P–3 замкнут отсчётом (без учёта движка постоянного света). */
export function stairTimerActive(element: SchemaElement, timers: Readonly<Record<number, TimerState>>): boolean {
  const phase = timers[element.id]?.phase;
  return phase === 'done' || phase === 'releasing';
}

const sinceLast = (prior: TimerState, now: number): number =>
  Math.max(0, now - (Number.isFinite(prior.lastTime) ? prior.lastTime as number : now));

/** Состояние: done — кнопка держится, releasing — идёт выдержка после отпускания, idle — свет выключен. */
function nextState(prior: TimerState | undefined, pulse: boolean, powered: boolean, duration: number, now: number):
TimerState {
  if (pulse) return { phase: 'done', elapsed: 0, lastTime: now, powered: true };
  const idle: TimerState = { phase: 'idle', elapsed: 0, lastTime: now, powered };
  if (!powered || (prior?.phase !== 'done' && prior?.phase !== 'releasing')) return idle;
  const releaseElapsed = prior.phase === 'releasing'
    ? Math.max(0, prior.releaseElapsed ?? 0) + sinceLast(prior, now)
    : 0;
  if (releaseElapsed >= duration) return idle;
  return { phase: 'releasing', elapsed: 0, releaseElapsed, lastTime: now, powered };
}

/**
 * Обновляет отсчёт по устойчивому состоянию входов. Питание P–N для продолжения выдержки берётся из сетей:
 * при пропаже фазы на P свет гаснет, как у настоящего минутника.
 */
export function advanceStairTimers(
  schema: Schema,
  coils: Readonly<Record<string, boolean>>,
  nets: readonly NetState[],
  terminalNet: Readonly<Record<TerminalKey, number>>,
  time: number,
  previous: Readonly<Record<number, TimerState>>,
): Record<number, TimerState> {
  const result: Record<number, TimerState> = { ...previous };
  const now = Number.isFinite(time) ? time : 0;
  const byId = new Map(nets.map((net) => [net.id, net] as const));
  const net = (element: SchemaElement, index: number) => byId.get(terminalNet[terminalKey(element.id, index)] ?? -1);
  for (const element of schema.elements) {
    if (!isStairTimer(element)) continue;
    const p = net(element, STAIR_TIMER_INDEX.P);
    const n = net(element, STAIR_TIMER_INDEX.N);
    const powered = Boolean(p && n && isEnergized(p, n).energized);
    const pulse = coils[stairTimerKey(element)] ?? false;
    result[element.id] = nextState(previous[element.id], pulse, powered, stairTimerSeconds(element), now);
  }
  return result;
}
