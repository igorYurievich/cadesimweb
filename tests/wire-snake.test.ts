import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  createSnakeState, directionOfKey, SNAKE_COLS, SNAKE_MIN_STEP_MS, SNAKE_START_STEP_MS, spawnTarget, step,
  stepDelayMs, togglePause, turn, type SnakeState,
} from '../src/ui/easter-snake/snake-logic';
import {
  matchSecret, readSnakeHighscore, readSnakeSound, saveSnakeHighscore, saveSnakeSound,
  SNAKE_HIGHSCORE_KEY, SNAKE_UNLOCKED_KEY, unlockSnake, type KeyValueStore,
} from '../src/ui/easter-snake/snake-unlock';
import { isCorner, snakePath } from '../src/ui/easter-snake/snake-motion';
import { loadSnakeFacts, pickFactIndex } from '../src/ui/easter-snake/snake-facts';
import { SNAKE_TEXT } from '../src/ui/i18n/snake-text';

// Пасхалка «Змейка по проводам»: модель игры, секретный код и рекорд (без DOM).

const memoryStore = (): KeyValueStore & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); } };
};

/** Змейка в заданных клетках, цель далеко — чтобы проверять столкновения. */
const stateWith = (snake: SnakeState['snake'], direction: SnakeState['direction']): SnakeState => ({
  ...createSnakeState(() => 0), snake, direction, target: { x: SNAKE_COLS - 1, y: 0 },
});

describe('змейка: модель игры', () => {
  it('старт: 3 сегмента, движение вправо, цель не на змейке', () => {
    const state = createSnakeState(() => 0.5);
    expect(state.snake).toHaveLength(3);
    expect(state.direction).toBe('right');
    expect(state.snake.some((cell) => cell.x === state.target.x && cell.y === state.target.y)).toBe(false);
  });

  it('разворот на 180° запрещён, поворот срабатывает на следующем шаге', () => {
    const state = createSnakeState(() => 0);
    const head = state.snake[0]!;
    turn(state, 'left');
    step(state, () => 0);
    expect(state.snake[0]).toEqual({ x: head.x + 1, y: head.y });
    turn(state, 'up');
    step(state, () => 0);
    expect(state.snake[0]).toEqual({ x: head.x + 1, y: head.y - 1 });
  });

  it('два быстрых поворота не дают развернуться в себя', () => {
    const state = createSnakeState(() => 0);
    turn(state, 'up');
    turn(state, 'left');
    expect(state.queued).toEqual(['up', 'left']);
    step(state, () => 0);
    expect(step(state, () => 0)).toBe('move');
  });

  it('сбор элемента: +1 сегмент и +10 кВт', () => {
    const state = createSnakeState(() => 0);
    const head = state.snake[0]!;
    state.target = { x: head.x + 1, y: head.y };
    expect(step(state, () => 0)).toBe('eat');
    expect(state.snake).toHaveLength(4);
    expect(state.score).toBe(10);
    expect(state.eaten).toBe(1);
  });

  it('удар о стенку и о свой хвост — короткое замыкание', () => {
    const edge = SNAKE_COLS - 1;
    const wall = stateWith([{ x: edge, y: 5 }, { x: edge - 1, y: 5 }, { x: edge - 2, y: 5 }], 'right');
    expect(step(wall, () => 0)).toBe('crash');
    expect(wall.phase).toBe('over');
    expect(wall.crash).toEqual({ x: SNAKE_COLS - 1, y: 5 });
    const loop = stateWith([{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 5, y: 6 }, { x: 4, y: 6 }], 'left');
    turn(loop, 'down');
    expect(step(loop, () => 0)).toBe('crash');
    expect(loop.crash).toEqual({ x: 5, y: 6 });
  });

  it('в клетку уходящего хвоста входить можно', () => {
    const state = stateWith([{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 5, y: 6 }], 'down');
    expect(step(state, () => 0)).toBe('move');
  });

  it('пауза останавливает шаги', () => {
    const state = createSnakeState(() => 0);
    togglePause(state);
    expect(step(state, () => 0)).toBeUndefined();
    togglePause(state);
    expect(step(state, () => 0)).toBe('move');
  });

  it('скорость: 130 мс, быстрее каждые 5 элементов, не меньше 65 мс', () => {
    expect(stepDelayMs(0)).toBe(SNAKE_START_STEP_MS);
    expect(stepDelayMs(4)).toBe(SNAKE_START_STEP_MS);
    expect(stepDelayMs(5)).toBeLessThan(SNAKE_START_STEP_MS);
    expect(stepDelayMs(500)).toBe(SNAKE_MIN_STEP_MS);
  });

  it('цель появляется только в свободной клетке', () => {
    const snake = Array.from({ length: SNAKE_COLS }, (_, x) => ({ x, y: 0 }));
    expect(spawnTarget(snake, () => 0)).toEqual({ x: 0, y: 1 });
  });

  it('управление: стрелки и WASD', () => {
    expect(directionOfKey('ArrowUp')).toBe('up');
    expect(directionOfKey('KeyA')).toBe('left');
    expect(directionOfKey('KeyQ')).toBeUndefined();
  });
});

describe('змейка: код, рекорд, звук', () => {
  it('пароли: ФИО — змейка, 4962 — «Старая школа»', () => {
    const store = memoryStore();
    expect(matchSecret('Igor Lipskiy Vyatchin')).toBe('snake');
    expect(matchSecret('  igor   LIPSKIY vyatchin ')).toBe('snake');
    expect(matchSecret(' 4962 ')).toBe('old-school');
    expect(matchSecret('1234')).toBeUndefined();
    expect(matchSecret('Igor')).toBeUndefined();
    unlockSnake(store);
    expect(store.data.get(SNAKE_UNLOCKED_KEY)).toBe('true');
  });

  it('рекорд сохраняется, только если он выше', () => {
    const store = memoryStore();
    expect(readSnakeHighscore(store)).toBe(0);
    expect(saveSnakeHighscore(50, store)).toBe(true);
    expect(saveSnakeHighscore(30, store)).toBe(false);
    expect(store.data.get(SNAKE_HIGHSCORE_KEY)).toBe('50');
    store.data.set(SNAKE_HIGHSCORE_KEY, 'мусор');
    expect(readSnakeHighscore(store)).toBe(0);
  });

  it('звук по умолчанию включён и запоминается', () => {
    const store = memoryStore();
    expect(readSnakeSound(store)).toBe(true);
    saveSnakeSound(false, store);
    expect(readSnakeSound(store)).toBe(false);
  });
});

describe('змейка: сборка и тексты', () => {
  it('игра — ленивый кусок: меню не импортирует окно статически', () => {
    const entry = readFileSync(new URL('../src/ui/easter-snake/snake-entry.ts', import.meta.url), 'utf8');
    expect(entry).toContain("import('./snake-modal')");
    expect(entry).not.toMatch(/^import .*snake-(modal|render|logic|motion|sound|view)/m);
  });

  it('тексты игры есть на всех пяти языках', () => {
    const keys = Object.keys(SNAKE_TEXT.ru).sort();
    for (const text of Object.values(SNAKE_TEXT)) expect(Object.keys(text).sort()).toEqual(keys);
  });
});

describe('змейка: плавное движение и отклик', () => {
  const moving = (): SnakeState => stateWith([{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 4, y: 6 }], 'right');

  it('голова едет в клетку следующего шага, хвост подтягивается, тело — на клетках', () => {
    expect(snakePath(moving(), 0.5)).toEqual([{ x: 5.5, y: 5 }, { x: 5, y: 5 }, { x: 4, y: 5 }, { x: 4, y: 5.5 }]);
    expect(isCorner(snakePath(moving(), 0.5), 2)).toBe(true);
  });

  it('поворот в начале шага виден сразу: голова уже едет в новую сторону', () => {
    const state = moving();
    turn(state, 'up', false);
    const path = snakePath(state, 0.2);
    expect(path[0]).toEqual({ x: 5, y: 4.8 });
    expect(isCorner(path, 1)).toBe(true);
    step(state, () => 0);
    expect(state.snake[0]).toEqual({ x: 5, y: 4 });
  });

  it('поворот в конце шага: текущий шаг доезжает прямо, поворот — на следующей клетке', () => {
    const state = moving();
    turn(state, 'up', true);
    expect(state.queued).toEqual(['right', 'up']);
    expect(snakePath(state, 0.8)[0]).toEqual({ x: 5.8, y: 5 });
    step(state, () => 0);
    step(state, () => 0);
    expect(state.snake[0]).toEqual({ x: 6, y: 4 });
  });

  it('разворот на 180° запрещён и при отложенном повороте', () => {
    const state = moving();
    turn(state, 'left', true);
    expect(state.queued).toEqual([]);
  });

  it('перед стенкой голова только касается её, а при росте хвост стоит', () => {
    const edge = SNAKE_COLS - 1;
    const wall = stateWith([{ x: edge, y: 5 }, { x: edge - 1, y: 5 }, { x: edge - 2, y: 5 }], 'right');
    expect(snakePath(wall, 0.9)[0]!.x).toBeCloseTo(edge + 0.4);
    const eating = moving();
    eating.target = { x: 6, y: 5 };
    expect(snakePath(eating, 0.5).at(-1)).toEqual({ x: 4, y: 6 });
  });
});

describe('змейка: факты на экране рекорда', () => {
  const langs = ['es', 'en', 'it', 'ru', 'fr'] as const;

  it('по 50 фактов на каждом языке, числа и годы совпадают с русским текстом', async () => {
    const ru = await loadSnakeFacts('ru');
    expect(ru).toHaveLength(50);
    const numbers = (text: string): string[] => text.match(/\d+/g) ?? [];
    for (const lang of langs) {
      const facts = await loadSnakeFacts(lang);
      expect(facts).toHaveLength(50);
      facts.forEach((fact, index) => expect(numbers(fact), `${lang} #${index + 1}`).toEqual(numbers(ru[index]!)));
    }
  });

  it('случайный факт не повторяется два раза подряд', () => {
    for (let previous = 0; previous < 50; previous += 1) {
      for (const value of [0, 0.3, 0.5, 0.99999]) {
        const index = pickFactIndex(50, previous, () => value);
        expect(index).not.toBe(previous);
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(50);
      }
    }
    expect(pickFactIndex(50, undefined, () => 0.99999)).toBe(49);
  });
});
