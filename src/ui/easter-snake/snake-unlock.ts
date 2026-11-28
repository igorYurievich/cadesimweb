/**
 * Пасхалки окна «Ayuda → Пароль»: ФИО автора открывает «Змейку по проводам», код 4962 даёт
 * достижение «Старая школа». Здесь же хранение рекорда змейки.
 * Лежит в стартовой сборке (нужен меню), поэтому крошечный; сама игра — отдельный кусок (snake-modal.ts).
 */

/** Пароль змейки: ФИО автора; регистр и лишние пробелы не важны. */
export const SNAKE_PASSWORD = 'Igor Lipskiy Vyatchin';
export const OLD_SCHOOL_CODE = '4962';
export const SNAKE_UNLOCKED_KEY = 'webcade_easter_snake_unlocked';
export const SNAKE_HIGHSCORE_KEY = 'webcade_snake_highscore';
export const SNAKE_SOUND_KEY = 'webcade_snake_sound';

/** Хранилище задаётся явно, чтобы тесты подставляли мок вместо localStorage. */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;

const browserStore = (): KeyValueStore | undefined => {
  try { return globalThis.localStorage; } catch { return undefined; }
};

function read(key: string, store = browserStore()): string | null {
  try { return store?.getItem(key) ?? null; } catch { return null; }
}

function write(key: string, value: string, store = browserStore()): void {
  try { store?.setItem(key, value); } catch { /* Без хранилища работает до перезагрузки. */ }
}

export type SecretCode = 'snake' | 'old-school';

const normalize = (value: string): string => value.trim().replace(/\s+/g, ' ').toLowerCase();

/** Что открывает введённый пароль; undefined — неверный. */
export function matchSecret(value: string): SecretCode | undefined {
  const text = normalize(value);
  if (text === normalize(SNAKE_PASSWORD)) return 'snake';
  if (text === OLD_SCHOOL_CODE) return 'old-school';
  return undefined;
}

export const unlockSnake = (store?: KeyValueStore): void => write(SNAKE_UNLOCKED_KEY, 'true', store);

export function readSnakeHighscore(store?: KeyValueStore): number {
  const value = Number(read(SNAKE_HIGHSCORE_KEY, store));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/** Записать счёт, если он выше рекорда. true — новый рекорд. */
export function saveSnakeHighscore(score: number, store?: KeyValueStore): boolean {
  if (score <= readSnakeHighscore(store)) return false;
  write(SNAKE_HIGHSCORE_KEY, String(score), store);
  return true;
}

export const readSnakeSound = (store?: KeyValueStore): boolean => read(SNAKE_SOUND_KEY, store) !== '0';
export const saveSnakeSound = (on: boolean, store?: KeyValueStore): void => {
  write(SNAKE_SOUND_KEY, on ? '1' : '0', store);
};
