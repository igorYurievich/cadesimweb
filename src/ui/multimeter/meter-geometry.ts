/** Геометрия щупов и проводов мультиметра в пикселях окна (clientX / clientY). */

import { PROBE_LENGTH } from './meter-art';

export interface ScreenPoint { x: number; y: number }

export interface ProbePose {
  /** Хвост щупа: отсюда выходит провод. */
  tail: ScreenPoint;
  /** Поворот рисунка щупа (кончик вверх) в градусах. */
  angle: number;
  /** Единичный вектор от кончика к хвосту. */
  direction: ScreenPoint;
}

/** Наклон щупа от вертикали, градусы: красный уходит вправо-вниз, чёрный влево-вниз, как в двух руках. */
const SPREAD = { red: 28, black: -28 } as const;
/** Насколько щуп доворачивается к своему гнезду, градусы (не больше). */
const LEAN_MAX = 14;

/**
 * Кончик щупа стоит в точке касания, корпус смотрит вниз с разворотом в свою сторону и чуть к прибору:
 * два щупа на соседних проводах расходятся и не закрывают друг друга.
 */
export function probePose(tip: ScreenPoint, jack: ScreenPoint, side: 'red' | 'black'): ProbePose {
  const toward = jack.x - tip.x;
  const lean = Math.max(-LEAN_MAX, Math.min(LEAN_MAX, toward / 25));
  // Угол от вертикали: положительный — хвост вправо.
  const fromVertical = ((SPREAD[side] + lean) * Math.PI) / 180;
  const direction = { x: Math.sin(fromVertical), y: Math.cos(fromVertical) };
  const tail = { x: tip.x + direction.x * PROBE_LENGTH, y: tip.y + direction.y * PROBE_LENGTH };
  const angle = (Math.atan2(direction.y, direction.x) * 180) / Math.PI - 90;
  return { tail, angle, direction };
}

/**
 * Провод от гнезда до хвоста щупа: кубическая кривая с провисом. Чем дальше щуп, тем сильнее провис,
 * поэтому провод плавно «вытягивается» и «укорачивается» при перетаскивании.
 */
export function cablePath(jack: ScreenPoint, pose: ProbePose): string {
  const distance = Math.hypot(pose.tail.x - jack.x, pose.tail.y - jack.y);
  const sag = 50 + distance * 0.35;
  const c1 = { x: jack.x, y: jack.y + sag };
  const c2 = { x: pose.tail.x + pose.direction.x * sag, y: pose.tail.y + pose.direction.y * sag };
  const r = (value: number): string => value.toFixed(1);
  const pt = (p: ScreenPoint): string => `${r(p.x)} ${r(p.y)}`;
  return `M${pt(jack)} C${pt(c1)}, ${pt(c2)}, ${pt(pose.tail)}`;
}
