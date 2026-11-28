/** Отрисовка «Змейки по проводам» на canvas: экран осциллографа, импульс-провод, энергоэлемент, искра КЗ. */
import { SNAKE_COLS, SNAKE_ROWS, type Cell, type SnakeState } from './snake-logic';
import { isCorner, type Point } from './snake-motion';

export const SNAKE_CELL = 20;
const HEAD = '#00f0ff';
const TARGET = '#ffd000';
const GRID_MINOR = 'rgba(0, 240, 255, 0.06)';
const GRID_MAJOR = 'rgba(0, 240, 255, 0.16)';

const center = (cell: Cell): [number, number] => [(cell.x + 0.5) * SNAKE_CELL, (cell.y + 0.5) * SNAKE_CELL];

function drawGrid(ctx: CanvasRenderingContext2D): void {
  const width = SNAKE_COLS * SNAKE_CELL;
  const height = SNAKE_ROWS * SNAKE_CELL;
  ctx.fillStyle = '#04110f';
  ctx.fillRect(0, 0, width, height);
  ctx.lineWidth = 1;
  for (let x = 0; x <= SNAKE_COLS; x += 1) {
    ctx.strokeStyle = x % 4 === 0 ? GRID_MAJOR : GRID_MINOR;
    ctx.beginPath(); ctx.moveTo(x * SNAKE_CELL + 0.5, 0); ctx.lineTo(x * SNAKE_CELL + 0.5, height); ctx.stroke();
  }
  for (let y = 0; y <= SNAKE_ROWS; y += 1) {
    ctx.strokeStyle = y % 3 === 0 ? GRID_MAJOR : GRID_MINOR;
    ctx.beginPath(); ctx.moveTo(0, y * SNAKE_CELL + 0.5); ctx.lineTo(width, y * SNAKE_CELL + 0.5); ctx.stroke();
  }
}

/** Энергоэлемент: лампочка с мягкой пульсацией свечения. */
function drawTarget(ctx: CanvasRenderingContext2D, cell: Cell, time: number): void {
  const [cx, cy] = center(cell);
  const pulse = 0.5 + 0.5 * Math.sin(time / 180);
  ctx.save();
  ctx.shadowColor = TARGET;
  ctx.shadowBlur = 6 + pulse * 10;
  ctx.fillStyle = TARGET;
  ctx.beginPath(); ctx.arc(cx, cy - 2, 5.5 + pulse, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#9aa4ad';
  ctx.fillRect(cx - 3, cy + 3, 6, 4);
  ctx.strokeStyle = '#04110f';
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(cx - 2, cy - 2); ctx.lineTo(cx, cy); ctx.lineTo(cx + 2, cy - 2); ctx.stroke();
  ctx.restore();
}

/** Импульс: провод под напряжением, яркость гаснет к хвосту, на поворотах — узлы. */
function drawSnake(ctx: CanvasRenderingContext2D, path: readonly Point[]): void {
  const at = (point: Point): [number, number] => [(point.x + 0.5) * SNAKE_CELL, (point.y + 0.5) * SNAKE_CELL];
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = 8;
  for (let index = path.length - 1; index > 0; index -= 1) {
    const alpha = 0.25 + 0.75 * (1 - index / path.length);
    ctx.strokeStyle = `rgba(0, 240, 255, ${alpha.toFixed(3)})`;
    const [x1, y1] = at(path[index]!);
    const [x2, y2] = at(path[index - 1]!);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    if (isCorner(path, index)) {
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath(); ctx.arc(x1, y1, 5.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  const [hx, hy] = at(path[0]!);
  ctx.shadowColor = HEAD;
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#e6fdff';
  ctx.beginPath(); ctx.arc(hx, hy, 6.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** Искра короткого замыкания: лучи от точки удара, гаснут за ~600 мс. */
function drawSpark(ctx: CanvasRenderingContext2D, cell: Cell, age: number): void {
  const life = 1 - age / 600;
  if (life <= 0) return;
  const [cx, cy] = center(cell);
  ctx.save();
  ctx.strokeStyle = `rgba(255, 240, 160, ${life.toFixed(3)})`;
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 18 * life;
  ctx.lineWidth = 2;
  for (let ray = 0; ray < 10; ray += 1) {
    const angle = (ray / 10) * Math.PI * 2 + ray;
    const reach = (8 + (ray % 3) * 7) * (1.3 - life);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * reach, cy + Math.sin(angle) * reach);
    ctx.stroke();
  }
  ctx.fillStyle = `rgba(255, 255, 255, ${(life * 0.9).toFixed(3)})`;
  ctx.beginPath(); ctx.arc(cx, cy, 6 * life + 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** Что рисовать в этом кадре: состояние игры и плавное положение импульса между шагами. */
export interface SnakeFrame {
  state: SnakeState;
  /** Линия импульса (snake-motion.ts: snakePath). */
  path: readonly Point[];
  /** performance.now() кадра и момент удара (для пульсации и искры). */
  time: number;
  crashAt: number;
}

export function drawSnakeFrame(ctx: CanvasRenderingContext2D, frame: SnakeFrame): void {
  const { state, time } = frame;
  drawGrid(ctx);
  if (state.phase !== 'over' || state.crash) drawTarget(ctx, state.target, time);
  drawSnake(ctx, frame.path);
  if (state.crash) drawSpark(ctx, state.crash, time - frame.crashAt);
}
