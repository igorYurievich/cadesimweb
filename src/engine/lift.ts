/**
 * Лифт на 5 этажей (model/lift.ts): движение кабины и дверей за кадр, датчики и аварии.
 *
 *  - Мотор подъёма -M1 тянет кабину со скоростью, пропорциональной частоте: 10–25 Гц — рабочий диапазон.
 *    Ниже 10 Гц кабина не трогается (мало момента). Выше 25 Гц или от сети без ПЧ кабина срывается
 *    и летит до удара о потолок или буфер приямка — авария до остановки симуляции.
 *  - Мотор обесточен — тормоз держит кабину на месте. Проезжая уровень этажа, кабина за кадр
 *    не перескакивает его: останавливается точно на уровне, датчик этажа успевает сработать.
 *  - Кабина поехала с незакрытой дверью — авария. Дверь закрывается на человека в проёме — авария.
 *  - Человек в проёме — клик по лифту в симуляции (inputs.toggled[id лифта]).
 * Состояние — EngineMemory.timers[id лифта].lift, как частота преобразователя (vfd.ts).
 */

import {
  LIFT_BOTTOM_LIMIT, LIFT_DOOR_EDGE, LIFT_DOOR_TIME, LIFT_FLOOR_ROLES, LIFT_MAX_HZ, LIFT_MIN_HZ, LIFT_ROLES,
  LIFT_RUNAWAY_SPEED, LIFT_SENSOR_ZONE, LIFT_SPEED_PER_HZ, LIFT_SQUEEZE_AT, LIFT_TOP_LIMIT, LIFT_TYPE,
  type LiftRole, liftRoleName, normalizeLiftName,
} from '../model/lift';
import type { Schema, SchemaElement } from '../model/types';
import { liftDrive, type LiftDrive } from './lift-drive';
import type { LiftMemory, MotorState, NetState, TerminalKey, TimerState, UserInputs } from './types';

export const LIFT_START: Readonly<LiftMemory> = {
  pos: 0, door: 0, speed: 0, runaway: 0, hz: 0, stalled: false, sheave: 0,
};

export const liftMemory = (lift: Pick<SchemaElement, 'id'>, timers: Readonly<Record<number, TimerState>>): LiftMemory =>
  timers[lift.id]?.lift ?? LIFT_START;

/** Человек стоит в проёме двери (клик по лифту в симуляции). */
export const liftPersonPresent = (lift: Pick<SchemaElement, 'id'>, inputs: UserInputs): boolean =>
  inputs.toggled[lift.id] === true;

/** Какие встроенные датчики сейчас срабатывают. */
export function liftActiveRoles(memory: LiftMemory, person: boolean): Set<LiftRole> {
  const active = new Set<LiftRole>();
  LIFT_FLOOR_ROLES.forEach((role, floor) => {
    if (Math.abs(memory.pos - floor) <= LIFT_SENSOR_ZONE + 1e-9) active.add(role);
  });
  if (memory.door >= 1 - LIFT_DOOR_EDGE) active.add('doorOpen');
  if (memory.door <= LIFT_DOOR_EDGE) active.add('doorClosed');
  if (person && memory.door > LIFT_DOOR_EDGE) active.add('photo');
  return active;
}

const SENSOR_ROLES = LIFT_ROLES.filter((role) => role !== 'hoist' && role !== 'door');

/** Нормализованные имена сработавших датчиков всех лифтов схемы. */
export function liftActiveSensorNames(
  schema: Schema, inputs: UserInputs, timers: Readonly<Record<number, TimerState>>,
): Set<string> {
  const names = new Set<string>();
  for (const lift of schema.elements) {
    if (lift.typeCode !== LIFT_TYPE) continue;
    const active = liftActiveRoles(liftMemory(lift, timers), liftPersonPresent(lift, inputs));
    for (const role of SENSOR_ROLES) if (active.has(role)) names.add(normalizeLiftName(liftRoleName(lift, role)));
  }
  return names;
}

/**
 * Входы с датчиками лифта: датчик схемы с именем сработавшего встроенного датчика считается зажатым,
 * как если бы его держали мышью (детекторы, приёмник и барьер срабатывают по inputs.pressed).
 */
export function withLiftSensors(
  schema: Schema, inputs: UserInputs, timers: Readonly<Record<number, TimerState>>,
): UserInputs {
  if (!schema.elements.some((element) => element.typeCode === LIFT_TYPE)) return inputs;
  const names = liftActiveSensorNames(schema, inputs, timers);
  if (names.size === 0) return inputs;
  const pressed = { ...inputs.pressed };
  for (const element of schema.elements) {
    if (element.typeCode !== LIFT_TYPE && names.has(normalizeLiftName(element.name))) pressed[element.id] = true;
  }
  return { ...inputs, pressed };
}

/** Новое положение кабины без срыва: уровень этажа на пути не перескакивается. */
function travel(pos: number, step: number): number {
  const next = pos + step;
  for (let floor = 0; floor < LIFT_FLOOR_ROLES.length; floor += 1) {
    const crossesUp = step > 0 && pos < floor - 1e-9 && next >= floor;
    const crossesDown = step < 0 && pos > floor + 1e-9 && next <= floor;
    if (crossesUp || crossesDown) return floor;
  }
  return next;
}

/** Ход кабины за dt: срыв, работа от ПЧ или стоянка на тормозе. */
function moveCabin(prior: LiftMemory, hoist: LiftDrive, dt: number): LiftMemory {
  const next: LiftMemory = { ...prior, speed: 0, stalled: false, hz: hoist.dir === 0 ? 0 : hoist.hz ?? 50 };
  let runaway = prior.runaway;
  if (runaway === 0 && hoist.dir !== 0 && (hoist.hz === undefined || hoist.hz > LIFT_MAX_HZ + 1e-6)) {
    runaway = hoist.dir;
    next.cause = hoist.hz === undefined ? 'mains' : 'overspeed';
  }
  next.runaway = runaway;
  if (runaway !== 0) {
    next.speed = runaway * LIFT_RUNAWAY_SPEED;
    next.pos = prior.pos + next.speed * dt;
  } else if (hoist.dir !== 0 && (hoist.hz ?? 0) < LIFT_MIN_HZ) {
    next.stalled = true;
  } else if (hoist.dir !== 0) {
    next.speed = hoist.dir * (hoist.hz ?? 0) * LIFT_SPEED_PER_HZ;
    next.pos = travel(prior.pos, next.speed * dt);
  }
  // Шкив: один оборот на этаж хода кабины.
  next.sheave = (((prior.sheave + 360 * (next.pos - prior.pos)) % 360) + 360) % 360;
  if (next.pos >= LIFT_TOP_LIMIT) return { ...next, pos: LIFT_TOP_LIMIT, speed: 0, fault: 'crash-top', cause: next.cause ?? 'limit' };
  if (next.pos <= LIFT_BOTTOM_LIMIT) {
    return { ...next, pos: LIFT_BOTTOM_LIMIT, speed: 0, fault: 'crash-bottom', cause: next.cause ?? 'limit' };
  }
  return next;
}

/** Ход дверей за dt; дверь, закрывающаяся на человека, зажимает его — авария. */
function moveDoor(state: LiftMemory, door: LiftDrive, person: boolean, dt: number): LiftMemory {
  if (door.dir === 0) return state;
  const raw = state.door + (door.dir * dt) / LIFT_DOOR_TIME;
  let position = raw < 1e-9 ? 0 : raw > 1 - 1e-9 ? 1 : raw;
  if (door.dir < 0 && person && state.door > LIFT_DOOR_EDGE && position <= LIFT_SQUEEZE_AT) {
    position = LIFT_SQUEEZE_AT;
    return { ...state, door: position, fault: 'squeeze' };
  }
  return { ...state, door: position };
}

export interface LiftPass {
  motors: Readonly<Record<number, MotorState>>;
  terminalNet: Readonly<Record<TerminalKey, number>>;
  nets: readonly NetState[];
}

/** Состояние лифтов на кадр (relay-loop.ts, после преобразователей частоты). */
export function advanceLifts(
  schema: Schema, pass: LiftPass, inputs: UserInputs, time: number, previous: Readonly<Record<number, TimerState>>,
): Record<number, TimerState> {
  if (!schema.elements.some((element) => element.typeCode === LIFT_TYPE)) return { ...previous };
  const result: Record<number, TimerState> = { ...previous };
  const now = Number.isFinite(time) ? time : 0;
  const nets = new Map(pass.nets.map((net) => [net.id, net] as const));
  for (const lift of schema.elements) {
    if (lift.typeCode !== LIFT_TYPE) continue;
    const prior = previous[lift.id];
    const memory = liftMemory(lift, previous);
    const dt = Math.max(0, now - (Number.isFinite(prior?.lastTime) ? prior!.lastTime as number : now));
    let next: LiftMemory = memory;
    if (!memory.fault) {
      const drive = (role: LiftRole) => liftDrive(schema, pass.motors, liftRoleName(lift, role), pass.terminalNet, nets);
      next = moveCabin(memory, drive('hoist'), dt);
      if (!next.fault && next.speed !== 0 && next.runaway === 0 && memory.door > LIFT_DOOR_EDGE) {
        next = { ...next, pos: memory.pos, speed: 0, fault: 'door-open' };
      }
      if (!next.fault) next = moveDoor(next, drive('door'), liftPersonPresent(lift, inputs), dt);
    } else {
      next = { ...memory, speed: 0, hz: 0, stalled: false };
    }
    result[lift.id] = { phase: next.speed !== 0 ? 'counting' : 'idle', elapsed: 0, lastTime: now, lift: next };
  }
  return result;
}
