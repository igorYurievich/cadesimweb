import type { CadTypeInfo } from './cad-types';
import type { SchemaElement } from './types';

// ── Лифт на 5 этажей (категория «Instalaciones», только веб) ───────────────────────────────────────────
// Объёмный блок без клемм: шахта, кабина, противовес и лебёдка. Встроенные элементы стоят на своих местах
// и привязываются к схеме по имени (как приёмник фотобарьера к излучателю, engine/photo-beam.ts):
//  - мотор подъёма -M1 (трёхфазный, направление по порядку фаз: прямой — вверх) и мотор дверей -M2
//    (прямой порядок — открывает, обратный — закрывает);
//  - индуктивные датчики этажей -B1…-B5, двери открыты -B6, двери закрыты -B7, фотоэлемент у входа -B8.
// Имена меняются в свойствах (params), положения — нет. Движение и аварии — engine/lift.ts.

export const LIFT_TYPE = 8300;
export const LIFT_COMMAND = 34012;
export const LIFT_FLOORS = 5;

/** Рамка блока: машинное помещение сверху, шахта на 5 этажей, приямок снизу. */
export const LIFT_SIZE = { w: 66, h: 156 } as const;

export type LiftRole =
  | 'hoist' | 'door' | 'floor1' | 'floor2' | 'floor3' | 'floor4' | 'floor5' | 'doorOpen' | 'doorClosed' | 'photo';

export const LIFT_ROLES: readonly LiftRole[] = [
  'hoist', 'door', 'floor1', 'floor2', 'floor3', 'floor4', 'floor5', 'doorOpen', 'doorClosed', 'photo',
];

export const LIFT_DEFAULT_NAMES: Readonly<Record<LiftRole, string>> = {
  hoist: '-M1', door: '-M2', floor1: '-B1', floor2: '-B2', floor3: '-B3', floor4: '-B4', floor5: '-B5',
  doorOpen: '-B6', doorClosed: '-B7', photo: '-B8',
};

export const LIFT_FLOOR_ROLES: readonly LiftRole[] = ['floor1', 'floor2', 'floor3', 'floor4', 'floor5'];

/** Ключ имени роли в params лифта. */
const paramKey = (role: LiftRole): string => `name_${role}`;

/** Имя встроенного элемента: из свойств лифта или по умолчанию. */
export function liftRoleName(lift: Pick<SchemaElement, 'params'>, role: LiftRole): string {
  const value = lift.params[paramKey(role)];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : LIFT_DEFAULT_NAMES[role];
}

export function setLiftRoleName(lift: Pick<SchemaElement, 'params'>, role: LiftRole, name: string): void {
  const clean = name.replace(/[#*$/\r\n]/g, '').trim();
  if (clean === '' || clean === LIFT_DEFAULT_NAMES[role]) delete lift.params[paramKey(role)];
  else lift.params[paramKey(role)] = clean;
}

/** Имена сравниваются без учёта регистра и начального «-»: «M1» и «-M1» — один мотор. */
export const normalizeLiftName = (name: string): string => name.trim().toLocaleUpperCase().replace(/^-/, '');

/** Хвост записи .cad: имена ролей через «/» в порядке LIFT_ROLES (§40 FORMATO_CAD). */
export function liftTail(lift: Pick<SchemaElement, 'params'>): string {
  return LIFT_ROLES.map((role) => liftRoleName(lift, role)).join('/');
}

export function liftParamsFromTail(tail: string | undefined): Record<string, string> {
  const params: Record<string, string> = {};
  const parts = (tail ?? '').split('/');
  LIFT_ROLES.forEach((role, index) => {
    const name = parts[index]?.trim() ?? '';
    if (name !== '' && name !== LIFT_DEFAULT_NAMES[role]) params[paramKey(role)] = name;
  });
  return params;
}

// ── Физика кабины (engine/lift.ts) ─────────────────────────────────────────────────────────────────────
// Положение кабины pos — в этажах: 0 — первый этаж, 4 — пятый. За пределами — буферы приямка и потолок.

/** Рабочий диапазон частоты мотора подъёма, Гц. */
export const LIFT_MIN_HZ = 10;
export const LIFT_MAX_HZ = 25;
/** Скорость кабины на 1 Гц, этажей в секунду: 25 Гц — полэтажа в секунду. */
export const LIFT_SPEED_PER_HZ = 0.02;
/** Скорость сорвавшейся кабины (мотор от сети без ПЧ или частота выше 25 Гц), этажей в секунду. */
export const LIFT_RUNAWAY_SPEED = 2.5;
/** Зона индуктивного датчика этажа: ± доля этажа от точного уровня. */
export const LIFT_SENSOR_ZONE = 0.01;
/** Буфер приямка и потолок шахты: здесь кабина бьётся. */
export const LIFT_BOTTOM_LIMIT = -0.25;
export const LIFT_TOP_LIMIT = 4.3;
/** Время полного хода дверей, с. */
export const LIFT_DOOR_TIME = 3;
/** Дверь считается закрытой / открытой у краёв хода (датчики -B7 / -B6). */
export const LIFT_DOOR_EDGE = 0.02;
/** Человек в проёме не даёт закрыть дверь дальше середины: здесь она его зажимает. */
export const LIFT_SQUEEZE_AT = 0.5;

export const LIFT_CAD_TYPE: CadTypeInfo = {
  code: LIFT_TYPE, family: 'installation', label: 'Ascensor 5 plantas',
  layout: { kind: 'none' }, terminalCount: 0, commandIds: [LIFT_COMMAND], confidence: 'probable',
  note: 'Только веб: лифт на 5 этажей без клемм; встроенные -M1 -M2 -B1…-B8 связываются со схемой по имени.',
};
