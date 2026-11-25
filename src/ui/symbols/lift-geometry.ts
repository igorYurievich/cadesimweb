// ── Геометрия рисунка лифта (рамка 66×156, model/lift.ts) ─────────────────────────────────────────────
// Плоский вид анфас (2D). Общая для рисунка (lift-symbol*.ts) и анимации в симуляции (simulation/element-lift.ts).

/** Шахта: внутренние края стен, низ перекрытия машинного помещения и пол приямка. */
export const SHAFT = { left: 8, right: 52, top: 22, bottom: 152 } as const;

/** Пол кабины на этаже floor (0 — первый). */
export const floorY = (floor: number): number => 146 - 24 * floor;

/** Кабина: от x0 до x1, высота h. */
export const CABIN = { x0: 10, x1: 46, h: 21 } as const;

/** Створки дверей кабины: проём от DOOR.x0 до DOOR.x1. */
export const DOOR = { x0: 18, x1: 38, top: 3 } as const;

/** Противовес за кабиной: верх при кабине на первом этаже. */
export const COUNTERWEIGHT = { x: 26, w: 6, h: 16, top: 34 } as const;
export const counterweightTop = (pos: number): number => COUNTERWEIGHT.top + 24 * pos;

/** Шкив лебёдки в машинном помещении. */
export const SHEAVE = { cx: 25, cy: 15, r: 4 } as const;

/** Точки крепления канатов: под краями шкива (канаты отвесные) — верх кабины и верх противовеса. */
export const cabinRopePoint = (pos: number): { x: number; y: number } => ({
  x: SHEAVE.cx - SHEAVE.r,
  y: floorY(pos) - CABIN.h,
});
export const counterweightRopePoint = (pos: number): { x: number; y: number } => ({
  x: COUNTERWEIGHT.x + COUNTERWEIGHT.w / 2,
  y: counterweightTop(pos),
});

/** Канат: от шкива вниз к точке подвеса. */
export const ropePath = (fromX: number, to: { x: number; y: number }): string =>
  `M ${fromX.toFixed(2)} ${SHEAVE.cy} L ${to.x.toFixed(2)} ${to.y.toFixed(2)}`;

/** Ход створки двери кабины при полном открытии. */
export const DOOR_TRAVEL = (DOOR.x1 - DOOR.x0) / 2 - 0.6;
