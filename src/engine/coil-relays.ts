/**
 * Логика катушек панели «Bobinas…» (model/coil-relays.ts). Контакты 7000–7003 с тем же именем следуют за выходом.
 *  - 9001 бистабильная: A1–A2 включает, B1–A2 выключает; без питания состояние держится. Оба входа сразу —
 *    состояние не меняется.
 *  - 9002 импульсное реле (Telerruptor): каждый новый импульс на A1–A2 переключает выход.
 *  - 9003 катушка электроклапана: как катушка 9000, выход = питание A1–A2.
 *  - 9007 реле-прерыватель: пока A1–A2 под питанием, выход включён полупериод и выключен полупериод
 *    (начинает с включения).
 *  - 9015 генератор импульсов: то же, но время включения и паузы задаются отдельно.
 *  - 9014 реле времени (Interruptor horario): по часам компьютера (UserInputs.clock) в отмеченные дни недели
 *    в «Tiempo conexión» включается, в «Tiempo desconexión» выключается; «Inactivo» отменяет своё событие.
 *    Состояние — последнее событие программы за прошедшую неделю. Без питания A1–A2 выход выключен.
 *  - 9016 счётчик: питание A1–A2; новый импульс на C–A2 прибавляет 1, на D–A2 отнимает 1, R–A2 сбрасывает в 0.
 *    Счёт дошёл до «Límite de conexión» — выход включается, до «Límite de desconexión» — выключается
 *    (как в окне свойств CADe SIMU). Без питания выход выключен, счёт сохраняется.
 * Уровни входов — ключи @COIL<id>:<k> в карте катушек (как @STAIR у минутника); состояние, отсчёт и уровни
 * входов прошлого кадра — в EngineMemory.timers по id элемента, выход — в поле q.
 */

import {
  BISTABLE_COIL, COIL_RELAY_TYPES, FLASHER_RELAY, IMPULSE_RELAY, PULSE_COUNTER, PULSE_GENERATOR, TIME_SWITCH,
  VALVE_COIL, coilRelayNumber, pulseTimes, timeSwitchProgram,
} from '../model/coil-relays';
import type { Schema, SchemaElement } from '../model/types';
import type { BehaviorLink, TypeBehavior } from './behaviors';
import { isEnergized } from './loads';
import { terminalKey, type NetState, type TerminalKey, type TimerState } from './types';

/** Входы по типу: пары клемм, напряжение между которыми считается сигналом. */
const INPUTS: Readonly<Record<number, ReadonlyArray<readonly [number, number]>>> = {
  [BISTABLE_COIL]: [[0, 2], [1, 2]],
  [IMPULSE_RELAY]: [[0, 1]],
  [VALVE_COIL]: [[0, 1]],
  [FLASHER_RELAY]: [[0, 1]],
  [TIME_SWITCH]: [[0, 1]],
  [PULSE_GENERATOR]: [[0, 1]],
  // A1–A2 питание, C, D, R — относительно A2.
  [PULSE_COUNTER]: [[0, 4], [1, 4], [2, 4], [3, 4]],
};

const DAY = 24 * 3600;
const WEEK = 7 * DAY;

const loadsOf = (typeCode: number): BehaviorLink[] =>
  (INPUTS[typeCode] ?? []).map(([a, b]) => ({ terminals: [a, b], kind: 'load', control: 'always' }));

export const COIL_RELAY_BEHAVIORS: readonly TypeBehavior[] = [...COIL_RELAY_TYPES]
  .map((typeCode) => ({ typeCode, links: loadsOf(typeCode) }));

const isCoilRelay = (element: SchemaElement): boolean => COIL_RELAY_TYPES.has(element.typeCode);

export const coilInputKey = (element: SchemaElement, index: number): string => `@COIL${element.id}:${index}`;

const inputKeys = (element: SchemaElement): string[] =>
  (INPUTS[element.typeCode] ?? []).map((_, index) => coilInputKey(element, index));

/** Ключи входов и имена выходов (для порядка пересчёта в relay-loop.ts). */
export function coilRelayKeys(schema: Schema): string[] {
  return schema.elements.filter(isCoilRelay)
    .flatMap((element) => (element.name === '' ? inputKeys(element) : [...inputKeys(element), element.name]));
}

/** Выход катушки: у клапана — питание в этом проходе, у остальных — сохранённое состояние. */
export function coilRelayActive(
  element: SchemaElement,
  coils: Readonly<Record<string, boolean>>,
  timers: Readonly<Record<number, TimerState>>,
): boolean {
  if (element.typeCode === VALVE_COIL) return coils[coilInputKey(element, 0)] ?? false;
  return timers[element.id]?.q ?? false;
}

/** Выставляет уровни входов и выходы-имена (вызывается из relay-pass.ts). */
export function applyCoilRelayInputs(
  schema: Schema,
  terminalNet: Readonly<Record<TerminalKey, number>>,
  netById: ReadonlyMap<number, NetState>,
  timers: Readonly<Record<number, TimerState>>,
  next: Record<string, boolean>,
): void {
  const netOf = (element: SchemaElement, index: number): NetState | undefined => {
    const id = terminalNet[terminalKey(element.id, index)];
    return id === undefined ? undefined : netById.get(id);
  };
  for (const element of schema.elements) {
    if (!isCoilRelay(element)) continue;
    (INPUTS[element.typeCode] ?? []).forEach(([a, b], index) => {
      const na = netOf(element, a);
      const nb = netOf(element, b);
      next[coilInputKey(element, index)] = Boolean(na && nb && isEnergized(na, nb).energized);
    });
    if (element.name === '') continue;
    next[element.name] = (next[element.name] ?? false) || coilRelayActive(element, next, timers);
  }
}

const sinceLast = (prior: TimerState | undefined, now: number): number =>
  Math.max(0, now - (Number.isFinite(prior?.lastTime) ? prior?.lastTime as number : now));

const latched = (q: boolean, inputs: boolean[], now: number): TimerState =>
  ({ phase: q ? 'done' : 'idle', elapsed: 0, lastTime: now, q, inputs });

/** Прерыватель и генератор: отсчёт идёт, пока есть питание. */
function pulseState(element: SchemaElement, prior: TimerState | undefined, inputs: boolean[], now: number): TimerState {
  if (!inputs[0]) return { phase: 'idle', elapsed: 0, lastTime: now, q: false, inputs };
  const elapsed = prior?.phase === 'counting' ? Math.max(0, prior.elapsed) + sinceLast(prior, now) : 0;
  const { on, off } = pulseTimes(element);
  const cycle = on + off;
  const q = on > 0 && (cycle <= 0 || elapsed % cycle < on);
  return { phase: 'counting', elapsed, lastTime: now, q, inputs };
}

/** Включено ли реле времени по последнему событию программы до момента clock (секунды недели). */
export function timeSwitchOn(element: SchemaElement, clock: number): boolean {
  const { days, on, off } = timeSwitchProgram(element);
  const now = ((clock % WEEK) + WEEK) % WEEK;
  let latest = -Infinity;
  let state = false;
  // Неделя назад и сегодня: событие сегодняшнего дня берём, только если его время уже прошло.
  for (let back = 7; back >= 0; back -= 1) {
    const dayStart = (Math.floor(now / DAY) - back) * DAY;
    if (!days[((Math.floor(now / DAY) - back) % 7 + 7) % 7]) continue;
    for (const [minute, value] of [[on, true], [off, false]] as const) {
      const at = minute === undefined ? undefined : dayStart + minute * 60;
      if (at === undefined || at > now || at < latest) continue;
      latest = at;
      state = value;
    }
  }
  return state;
}

function timeSwitchState(element: SchemaElement, inputs: boolean[], now: number, clock: number): TimerState {
  return { phase: 'counting', elapsed: clock, lastTime: now, q: Boolean(inputs[0]) && timeSwitchOn(element, clock), inputs };
}

function counterState(element: SchemaElement, prior: TimerState | undefined, inputs: boolean[], now: number): TimerState {
  const [powered = false, up = false, down = false, reset = false] = inputs;
  const before = prior?.inputs ?? [];
  const last = Math.max(0, prior?.count ?? 0);
  let count = last;
  if (reset) count = 0;
  else if (powered) {
    if (up && !before[1]) count += 1;
    if (down && !before[2]) count = Math.max(0, count - 1);
  }
  // Состояние меняется только когда счёт доходит до предела: между пределами держится.
  let on = prior?.phase === 'done';
  if (count !== last && count === coilRelayNumber(element, 'onLimit', 0)) on = true;
  else if (count !== last && count === coilRelayNumber(element, 'offLimit', 0)) on = false;
  return { phase: on ? 'done' : 'idle', elapsed: 0, lastTime: now, q: powered && on, count, inputs };
}

function nextState(
  element: SchemaElement, prior: TimerState | undefined, inputs: boolean[], now: number, clock: number,
): TimerState {
  const [a = false, b = false] = inputs;
  switch (element.typeCode) {
    case BISTABLE_COIL: return latched(a && !b ? true : b && !a ? false : prior?.q ?? false, inputs, now);
    case IMPULSE_RELAY: {
      const rising = a && !(prior?.inputs?.[0] ?? false);
      return latched(rising ? !(prior?.q ?? false) : prior?.q ?? false, inputs, now);
    }
    case FLASHER_RELAY:
    case PULSE_GENERATOR: return pulseState(element, prior, inputs, now);
    case TIME_SWITCH: return timeSwitchState(element, inputs, now, clock);
    default: return counterState(element, prior, inputs, now);
  }
}

/** Обновляет состояния по устойчивым уровням входов, раз за кадр (relay-loop.ts). */
export function advanceCoilRelays(
  schema: Schema,
  coils: Readonly<Record<string, boolean>>,
  time: number,
  previous: Readonly<Record<number, TimerState>>,
  clock?: number,
): Record<number, TimerState> {
  const result: Record<number, TimerState> = { ...previous };
  const now = Number.isFinite(time) ? time : 0;
  const weekClock = clock !== undefined && Number.isFinite(clock) ? clock : now;
  for (const element of schema.elements) {
    if (!isCoilRelay(element) || element.typeCode === VALVE_COIL) continue;
    const inputs = inputKeys(element).map((key) => coils[key] ?? false);
    result[element.id] = nextState(element, previous[element.id], inputs, now, weekClock);
  }
  return result;
}
