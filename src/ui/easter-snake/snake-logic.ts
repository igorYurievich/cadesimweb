/**
 * Пасхалка «Змейка по проводам»: чистая модель игры, без DOM и таймеров.
 * Окно (snake-modal.ts) вызывает step() по своему таймеру и рисует state (snake-render.ts).
 */

export const SNAKE_COLS = 24;
export const SNAKE_ROWS = 18;
export const SNAKE_START_LENGTH = 3;
export const SNAKE_POINTS_PER_ITEM = 10;
/** Шаг игры в мс: старт, ускорение каждые 5 элементов, предел. */
export const SNAKE_START_STEP_MS = 130;
export const SNAKE_MIN_STEP_MS = 65;
const SPEEDUP_EVERY = 5;
const SPEEDUP_MS = 10;

export type Direction = 'up' | 'down' | 'left' | 'right';
export interface Cell { readonly x: number; readonly y: number }
export type SnakePhase = 'running' | 'paused' | 'over';

export interface SnakeState {
  /** Голова — первый элемент. */
  snake: Cell[];
  direction: Direction;
  /** Повороты, нажатые между шагами: два быстрых нажатия не теряются и не дают разворот на 180°. */
  queued: Direction[];
  target: Cell;
  score: number;
  eaten: number;
  phase: SnakePhase;
  /** Клетка удара (искра короткого замыкания) после проигрыша. */
  crash?: Cell;
}

export type Random = () => number;

const DELTA: Readonly<Record<Direction, Cell>> = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};
const OPPOSITE: Readonly<Record<Direction, Direction>> = { up: 'down', down: 'up', left: 'right', right: 'left' };

const sameCell = (a: Cell, b: Cell): boolean => a.x === b.x && a.y === b.y;

/** Случайная свободная клетка; undefined — поле занято целиком. */
export function spawnTarget(snake: readonly Cell[], random: Random): Cell | undefined {
  const busy = new Set(snake.map((cell) => cell.y * SNAKE_COLS + cell.x));
  const free: number[] = [];
  for (let index = 0; index < SNAKE_COLS * SNAKE_ROWS; index += 1) if (!busy.has(index)) free.push(index);
  if (free.length === 0) return undefined;
  const index = free[Math.min(free.length - 1, Math.floor(random() * free.length))]!;
  return { x: index % SNAKE_COLS, y: Math.floor(index / SNAKE_COLS) };
}

export function createSnakeState(random: Random = Math.random): SnakeState {
  const y = Math.floor(SNAKE_ROWS / 2);
  const headX = Math.floor(SNAKE_COLS / 3);
  const snake = Array.from({ length: SNAKE_START_LENGTH }, (_, index) => ({ x: headX - index, y }));
  return {
    snake, direction: 'right', queued: [], score: 0, eaten: 0, phase: 'running',
    target: spawnTarget(snake, random) ?? { x: 0, y: 0 },
  };
}

/**
 * Запомнить поворот. Разворот на 180° и повтор текущего направления игнорируются.
 * later — импульс уже прошёл бо́льшую часть шага: поворот выполняется на следующей клетке,
 * а текущий шаг доезжает прямо (иначе голова на экране прыгнула бы назад).
 */
export function turn(state: SnakeState, direction: Direction, later = false): void {
  if (state.phase !== 'running') return;
  const last = state.queued[state.queued.length - 1] ?? state.direction;
  if (direction === last || direction === OPPOSITE[last] || state.queued.length >= 2) return;
  if (later && state.queued.length === 0) state.queued.push(state.direction);
  state.queued.push(direction);
}

/** Куда импульс войдёт следующим шагом (с учётом нажатого поворота): для шага и для плавной отрисовки. */
export interface NextMove {
  direction: Direction;
  cell: Cell;
  eats: boolean;
  /** Стенка или свой хвост: этот шаг будет коротким замыканием. */
  blocked: boolean;
  outside: boolean;
}

export function peekNext(state: SnakeState): NextMove {
  const direction = state.queued[0] ?? state.direction;
  const head = state.snake[0]!;
  const delta = DELTA[direction];
  const cell = { x: head.x + delta.x, y: head.y + delta.y };
  const eats = sameCell(cell, state.target);
  // Хвост уходит из своей клетки в этом же шаге, поэтому в неё можно войти (если не растём).
  const body = eats ? state.snake : state.snake.slice(0, -1);
  const outside = cell.x < 0 || cell.y < 0 || cell.x >= SNAKE_COLS || cell.y >= SNAKE_ROWS;
  return { direction, cell, eats, outside, blocked: outside || body.some((part) => sameCell(part, cell)) };
}

export function stepDelayMs(eaten: number): number {
  return Math.max(SNAKE_MIN_STEP_MS, SNAKE_START_STEP_MS - Math.floor(eaten / SPEEDUP_EVERY) * SPEEDUP_MS);
}

export type StepEvent = 'move' | 'eat' | 'crash';

/** Один шаг импульса. Возвращает, что случилось (для звука и вспышки). */
export function step(state: SnakeState, random: Random = Math.random): StepEvent | undefined {
  if (state.phase !== 'running') return undefined;
  const move = peekNext(state);
  state.queued.shift();
  state.direction = move.direction;
  if (move.blocked) {
    state.phase = 'over';
    state.crash = move.outside ? state.snake[0] : move.cell;
    return 'crash';
  }
  state.snake = [move.cell, ...(move.eats ? state.snake : state.snake.slice(0, -1))];
  const eats = move.eats;
  if (!eats) return 'move';
  state.score += SNAKE_POINTS_PER_ITEM;
  state.eaten += 1;
  const target = spawnTarget(state.snake, random);
  if (!target) state.phase = 'over';
  else state.target = target;
  return 'eat';
}

export function togglePause(state: SnakeState): void {
  if (state.phase === 'running') state.phase = 'paused';
  else if (state.phase === 'paused') state.phase = 'running';
}

const KEY_DIRECTIONS: Readonly<Record<string, Direction>> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
};

/** Направление по event.code: стрелки и WASD (по физической клавише, при любой раскладке). */
export function directionOfKey(code: string): Direction | undefined {
  return KEY_DIRECTIONS[code];
}
