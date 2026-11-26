/**
 * Типы .cad панели «Detectores / sensores».
 *
 * Барьер (33025) в образцах не встречался: его код выбран условно, вне диапазонов из образцов.
 * Детекторы (индуктивные, ёмкостные, магнитные, приёмник барьера) описаны в detector-types.ts,
 * фотодатчик Réflex (только веб) — в reflex-sensor.ts.
 */

import type { CadTypeInfo } from './cad-types';
import { DETECTOR_CAD_TYPES } from './detector-types';
import { REFLEX_CAD_TYPE } from './reflex-sensor';

/** Фотоэлектрический датчик-барьер (кнопка 33025). Код условный (confidence 'probable'), см. комментарий файла. */
export const PHOTO_BARRIER_TYPE = 15000;

/**
 * Клеммы барьера: 1 и 2 (питание L, N) сверху, 3 (COM), 4 (NC) и 5 (NO) снизу.
 * 1 и 3 в одной колонке, 2 и 5 в другой, 4 ровно посередине; всё на сетке с шагом 3.
 */
const PHOTO_BARRIER_POINTS = {
  kind: 'points',
  points: [{ x: 0, y: 0 }, { x: 12, y: 0 }, { x: 0, y: 24 }, { x: 6, y: 24 }, { x: 12, y: 24 }],
} as const;

export const SENSOR_TYPES: readonly CadTypeInfo[] = [
  {
    code: PHOTO_BARRIER_TYPE,
    family: 'sensor',
    label: 'Detector de barrera fotoeléctrico (-B)',
    layout: PHOTO_BARRIER_POINTS,
    terminalCount: 5,
    commandIds: [33025],
    confidence: 'probable',
    note: '18×27: корпус 6×6 клеток, выводы 1 2 сверху и 3 4 5 снизу выступают на одну клетку. '
      + 'Питание 1-2 (L, N), переключающий контакт: 3-4 НЗ, 3-5 НО. Код типа условный, образца нет.',
  },
  ...DETECTOR_CAD_TYPES,
  REFLEX_CAD_TYPE,
];
