/**
 * Фотоэлектрический датчик Réflex 24 V (только веб, кнопка 34013, панель «Detectores / sensores»).
 *
 * В CADe_SIMU такого датчика нет, поэтому код типа .cad условный (15010), рядом с излучателем барьера 15007.
 * Подключение как у индуктивного датчика на 3 провода (PNP): + сверху, − снизу, выход S справа.
 * Корпус больше, чем у детекторов 12×6: внутри ромб, светодиод с фототранзистором и контакт НО (символ автора).
 */

import type { CadTypeInfo } from './cad-types';
import type { Point, Size } from './types';

export const REFLEX_TYPE = 15010;
export const REFLEX_COMMAND = 34013;

/** Клеммы в порядке флагов записи: + (0,0), − (0,18), S (9,6) — на сетке с шагом 3. */
export const REFLEX_POINTS: readonly Point[] = [{ x: 0, y: 0 }, { x: 0, y: 18 }, { x: 9, y: 6 }];
export const REFLEX_LABELS: readonly string[] = ['+', '-', 'S'];
/** Рамка записи .cad: как у детектора на 3 провода (15×15), но корпус выше на две клетки. */
export const REFLEX_FRAME: Size = { w: 15, h: 21 };

export const REFLEX_CAD_TYPE: CadTypeInfo = {
  code: REFLEX_TYPE,
  family: 'detector',
  label: 'Sensor fotoeléctrico réflex (24 V) (-B)',
  layout: { kind: 'points', points: REFLEX_POINTS },
  terminalCount: REFLEX_POINTS.length,
  commandIds: [REFLEX_COMMAND],
  confidence: 'probable',
  note: 'Только веб, код условный. 3 провода PNP: питание + −, контакт НО + → S, пока луч перекрыт (датчик зажат).',
};
