import type { CadTypeInfo } from './cad-types';

// ── Автомат лестничного освещения Alst 8 (минутник на DIN-рейку), только веб ────────────────────────
// По фото пользователя: 1 TE, маркировка клемм «P 3 / N 4», схема на корпусе: P — фаза L, N — нейтраль,
// 4 — кнопки, 3 — лампы. Подключение кнопок выбирается в свойствах (stairTimerWiring): 3 провода — 4 на N
// («a 3 hilos», учебник пользователя, рис. 2.5), 4 провода — 4 на фазу.
// Синее колесо выдержки «<min» и синий движок «◎ авто / ☼ постоянно».
// ALST8: выдержка от 1 до 7 минут [паспорт ALION ALST8]; на колесе видны отметки 1 и 1,5 — остальные по шагу
// шкалы 1…7 мин. Выбрать можно только отметку колеса (STAIR_TIMER_DIAL).
// В CADe_SIMU такого элемента нет: код типа и кнопка свои (кнопки от 34001 — только веб-версия).
// Клеммы по маркировке: сверху P (x = 3) и 3 (x = 9), снизу N и 4; рамка 15×30 и шаг клемм 6, как у автомата
// 1P+N 2D (6017), низ y = 27.

export const STAIR_TIMER_2D = 8110;
export const STAIR_TIMER_COMMAND = 34002;

export const STAIR_TIMER_LABELS: readonly string[] = ['P', '3', 'N', '4'];
export const STAIR_TIMER_INDEX = { P: 0, LAMP: 1, N: 2, BUTTON: 3 } as const;

export const STAIR_TIMER_POINTS = [
  { x: 3, y: 0 }, { x: 9, y: 0 },
  { x: 3, y: 27 }, { x: 9, y: 27 },
];

export const STAIR_TIMER_SIZE = { w: 15, h: 30 } as const;

/** Отметки синего колеса, минуты. */
export const STAIR_TIMER_DIAL: readonly number[] = [1, 1.5, 2, 3, 4, 5, 6, 7];
export const STAIR_TIMER_DEFAULT = 1;

/** Выдержка в минутах: ближайшая отметка колеса (в схеме хранится params.minutes). */
export function stairTimerMinutes(element: { params: Record<string, unknown> }): number {
  const value = Number(element.params.minutes ?? STAIR_TIMER_DEFAULT);
  if (!Number.isFinite(value)) return STAIR_TIMER_DEFAULT;
  return STAIR_TIMER_DIAL.reduce((best, mark) => (Math.abs(mark - value) < Math.abs(best - value) ? mark : best));
}

/**
 * Подключение кнопок: 3 — «a 3 hilos», катушка между P и 4, кнопки замыкают 4 на N (учебник, рис. 2.5);
 * 4 — на 4 провода, катушка между 4 и N, кнопки подают на 4 фазу. По умолчанию 3 (params.wiring).
 */
export type StairWiring = 3 | 4;
export const stairTimerWiring = (element: { params: Record<string, unknown> }): StairWiring =>
  Number(element.params.wiring) === 4 ? 4 : 3;

/** nums[16] в .cad: выдержка в десятых долях минуты, +100 у подключения на 4 провода (15 → 1,5 мин, 3 провода). */
export const stairTimerFileParam = (element: { params: Record<string, unknown> }): number =>
  Math.round(stairTimerMinutes(element) * 10) + (stairTimerWiring(element) === 4 ? 100 : 0);

export function stairTimerParamsFromFile(value: number): { minutes: number; wiring: StairWiring } {
  return { minutes: stairTimerMinutes({ params: { minutes: (value % 100) / 10 } }), wiring: value >= 100 ? 4 : 3 };
}

/** Подпись отметки: 1,5 → «1.5», как на колесе. */
export const dialLabel = (minutes: number): string => String(minutes);

/** Операнд «на входе 4 есть импульс и аппарат запитан» в карте катушек движка. */
export const stairTimerKey = (element: { id: number }): string => `@STAIR${element.id}`;

export const STAIR_TIMER_CAD_TYPE: CadTypeInfo = {
  code: STAIR_TIMER_2D, family: 'control-unit', label: 'Automático de escalera (minutero) 2D',
  layout: { kind: 'points', points: STAIR_TIMER_POINTS }, terminalCount: STAIR_TIMER_POINTS.length,
  commandIds: [STAIR_TIMER_COMMAND], confidence: 'probable',
  note: 'Только веб: Alst 8, P 3 сверху, N 4 снизу; кнопка 4–N (3 провода) или 4–L (4 провода) включает P–3.',
};
