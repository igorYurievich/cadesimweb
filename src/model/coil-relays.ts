/**
 * Катушки панели «Bobinas, temporizadores y señalización» со своей логикой (движок — engine/coil-relays.ts).
 * Параметры в записи .cad идут после меток клемм, как у таймера 9004 («шкала#время»):
 *  - 9007 реле-прерыватель: `A1#A2#<шкала>#<полупериод>` (образец `0#1`);
 *  - 9015 генератор импульсов: `A1#A2#<шкала>#<время вкл>#<шкала>#<время паузы>` (образец `0#1#0#1`);
 *  - 9014 реле времени по часам: `A1#A2#<чч вкл>#<мм вкл>#<неактивно>#<чч откл>#<мм откл>#<неактивно>`
 *    (образец interruptor_horario.cad: `08#15#0#17#45#1`), дни недели — коды символов «1»/«0» (49/48)
 *    в nums[2..7], с понедельника по субботу; где хранится воскресенье, пока не известно;
 *  - 9016 счётчик: метки в слотах флагов 0..3 и 6, в texts[6..7] «Límite de conexión» и «Límite de desconexión»
 *    (окно свойств CADe SIMU; FORMATO_CAD.md, § 9).
 * Шкала читается и пишется как есть; время считаем в секундах, как у 9004.
 */

import type { SchemaElement } from './types';

export const BISTABLE_COIL = 9001;
export const IMPULSE_RELAY = 9002;
export const VALVE_COIL = 9003;
export const FLASHER_RELAY = 9007;
export const TIME_SWITCH = 9014;
export const PULSE_GENERATOR = 9015;
export const PULSE_COUNTER = 9016;

export const COIL_RELAY_TYPES: ReadonlySet<number> = new Set([
  BISTABLE_COIL, IMPULSE_RELAY, VALVE_COIL, FLASHER_RELAY, TIME_SWITCH, PULSE_GENERATOR, PULSE_COUNTER,
]);

/** Клеммы счётчика 9016 по порядку меток A1 C D R A2. */
export const COUNTER_INDEX = { A1: 0, C: 1, D: 2, R: 3, A2: 4 } as const;
/** Слоты флагов счётчика в записи (метка A2 лежит в слоте 6, между ними два параметра). */
export const COUNTER_SLOTS: readonly number[] = [0, 1, 2, 3, 6];

/** Слоты дней недели 9014 в nums записи: пн…сб. */
const DAY_SLOTS: readonly number[] = [2, 3, 4, 5, 6, 7];
const CHAR_ON = 49;
const CHAR_OFF = 48;

/** Время по умолчанию, с: как в образце elementos_bobinas.cad (`0#1`). */
export const COIL_RELAY_DEFAULT_TIME = 1;

/** Имена параметров по порядку полей записи. */
const PARAM_FIELDS: Readonly<Record<number, readonly string[]>> = {
  [FLASHER_RELAY]: ['scale', 'time'],
  [PULSE_GENERATOR]: ['scale', 'time', 'scaleOff', 'timeOff'],
  [TIME_SWITCH]: ['onH', 'onM', 'onInactive', 'offH', 'offM', 'offInactive'],
  [PULSE_COUNTER]: ['onLimit', 'offLimit'],
};

/** Параметры свежего элемента: те же поля, что в образце. */
export function coilRelayPlacedParams(typeCode: number): SchemaElement['params'] {
  const fields = PARAM_FIELDS[typeCode];
  if (!fields) return {};
  const params: SchemaElement['params'] = {};
  for (const field of fields) params[field] = field.startsWith('time') ? COIL_RELAY_DEFAULT_TIME : 0;
  if (typeCode === TIME_SWITCH) params.days = '0'.repeat(DAY_SLOTS.length);
  return params;
}

/** Параметры из текстовых полей записи после меток клемм и дни 9014 из nums (cad-import.ts). */
export function coilRelayParamsFromFile(
  typeCode: number,
  extra: readonly string[],
  nums: readonly number[],
): SchemaElement['params'] {
  const fields = PARAM_FIELDS[typeCode];
  const params: SchemaElement['params'] = {};
  fields?.forEach((field, index) => {
    const value = Number(extra[index]);
    if (extra[index] !== undefined && Number.isFinite(value)) params[field] = value;
  });
  if (typeCode === TIME_SWITCH) params.days = DAY_SLOTS.map((slot) => (nums[slot] === CHAR_ON ? '1' : '0')).join('');
  return params;
}

/**
 * Записывает параметры в запись (cad-export.ts). У счётчика они стоят в texts[6..7]. Текст из файла,
 * который читается тем же числом («08»), не переписываем, чтобы запись не менялась без правки.
 */
export function writeCoilRelayParams(record: { texts: string[]; nums: number[] }, element: SchemaElement): void {
  const fields = PARAM_FIELDS[element.typeCode];
  if (!fields) return;
  const start = element.typeCode === PULSE_COUNTER ? 6 : 2 + element.terminals.length;
  fields.forEach((field, index) => {
    const value = element.params[field];
    const at = start + index;
    if (typeof value !== 'number' || at >= record.texts.length) return;
    const old = record.texts[at] ?? '';
    if (old.trim() === '' || Number(old) !== value) record.texts[at] = String(value);
  });
  if (element.typeCode !== TIME_SWITCH || typeof element.params.days !== 'string') return;
  const days = element.params.days;
  DAY_SLOTS.forEach((slot, index) => { record.nums[slot] = days[index] === '1' ? CHAR_ON : CHAR_OFF; });
}

/** Неотрицательное число параметра или значение по умолчанию. */
export function coilRelayNumber(element: SchemaElement, field: string, fallback: number): number {
  const value = Number(element.params[field]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

/** Время включения и паузы, с: у прерывателя оба равны полупериоду. */
export function pulseTimes(element: SchemaElement): { on: number; off: number } {
  const on = coilRelayNumber(element, 'time', COIL_RELAY_DEFAULT_TIME);
  if (element.typeCode !== PULSE_GENERATOR) return { on, off: on };
  return { on, off: coilRelayNumber(element, 'timeOff', COIL_RELAY_DEFAULT_TIME) };
}

/** Программа реле времени: дни (пн = 0) и минуты суток включения и отключения (undefined — «Inactivo»). */
export interface TimeSwitchProgram {
  days: boolean[];
  on: number | undefined;
  off: number | undefined;
}

export function timeSwitchProgram(element: SchemaElement): TimeSwitchProgram {
  const days = String(element.params.days ?? '');
  const at = (h: string, m: string, inactive: string): number | undefined => (coilRelayNumber(element, inactive, 0) > 0
    ? undefined : coilRelayNumber(element, h, 0) * 60 + coilRelayNumber(element, m, 0));
  return {
    days: Array.from({ length: 7 }, (_, index) => days[index] === '1'),
    on: at('onH', 'onM', 'onInactive'),
    off: at('offH', 'offM', 'offInactive'),
  };
}
