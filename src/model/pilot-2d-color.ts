/**
 * Цвет пилота 2D (8101) в .cad — поле nums[16] записи. По файлам CADe_SIMU (курс «Desafío Ladder») и скриншоту
 * пользователя (IGL21_Final.cad, Ejemplo_Semaforo.cad): 1 и 3 — зелёный, 4 и 6 — красный, 7 и 9 — жёлтый,
 * то есть тройки 1…3, 4…6, 7…9 (2, 5, 8 в образцах не встречались, считаем по тройкам). 0 — новый пилот, зелёный.
 * В веб-версии цвет — params.color (0 зелёный, 1 красный, 2 жёлтый, как у лампы 9008). Исходное число из файла
 * хранится в params.pilotCadColor и пишется обратно как есть, пока цвет не поменяли в свойствах.
 */

import { PILOT_2D } from './realistic-2d-types';

/** Число CADe_SIMU → params.color веб-версии (undefined — неизвестное число). */
const fromCad = (value: number): number | undefined =>
  Number.isInteger(value) && value >= 1 && value <= 9 ? Math.floor((value - 1) / 3) : undefined;
/** params.color веб-версии → число CADe_SIMU (как у большинства пилотов в образцах). */
const TO_CAD: readonly number[] = [1, 4, 7];

type Params = Record<string, unknown>;

/** Параметры цвета пилота по nums[16] записи; 0 (новый пилот) не пишем. */
export function pilotColorParams(value: number): Params {
  if (value === 0) return {};
  const color = fromCad(value);
  return color === undefined ? { pilotCadColor: value } : { pilotCadColor: value, color };
}

/** Значение nums[16] для записи пилота. */
export function pilotCadColorValue(params: Params): number {
  const raw = typeof params.pilotCadColor === 'number' ? params.pilotCadColor : undefined;
  const color = typeof params.color === 'number' ? params.color : undefined;
  if (raw !== undefined && (color === undefined || fromCad(raw) === color)) return raw;
  return color === undefined ? 0 : TO_CAD[color] ?? 0;
}

export const isPilot2d = (typeCode: number): boolean => typeCode === PILOT_2D;
