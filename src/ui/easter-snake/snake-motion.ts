/**
 * Плавное движение змейки между шагами игры. Логика остаётся клеточной (snake-logic.ts),
 * а на экране импульс скользит из своих клеток в клетку следующего шага (peekNext).
 * Голова едет туда, куда пойдёт следующий шаг, поэтому нажатый поворот виден сразу,
 * а тело остаётся на клетках — повороты рисуются прямыми углами.
 */
import { peekNext, type SnakeState } from './snake-logic';

export interface Point { readonly x: number; readonly y: number }

/** Перед стенкой или хвостом голова лишь касается препятствия, а не въезжает в него. */
const BLOCKED_REACH = 0.4;

const lerp = (from: Point, to: Point, t: number): Point => ({
  x: from.x + (to.x - from.x) * t,
  y: from.y + (to.y - from.y) * t,
});

/** Линия импульса от головы к хвосту в клетках (дробных); t — доля пройденного шага (0…1). */
export function snakePath(state: SnakeState, t: number): Point[] {
  const { snake } = state;
  const progress = Math.min(1, Math.max(0, t));
  if (state.phase === 'over' || snake.length === 0) return snake.map((cell) => ({ ...cell }));
  const move = peekNext(state);
  const head = lerp(snake[0]!, move.cell, move.blocked ? Math.min(progress, BLOCKED_REACH) : progress);
  // Хвост подтягивается вслед, если змейка не растёт и не упирается.
  if (move.eats || move.blocked || snake.length < 2) return [head, ...snake];
  const tail = lerp(snake[snake.length - 1]!, snake[snake.length - 2]!, progress);
  return [head, ...snake.slice(0, -1), tail];
}

/** Поворот в точке index ломаной: соседи лежат не на одной прямой. */
export function isCorner(path: readonly Point[], index: number): boolean {
  const before = path[index - 1];
  const after = path[index + 1];
  return Boolean(before && after && before.x !== after.x && before.y !== after.y);
}
