/**
 * Сравнение данных так, как их сравнило бы JSON.stringify(a) === JSON.stringify(b), но без
 * построения строк: память таймеров сравнивается в каждом кадре, а у большой схемы она велика.
 * Порядок ключей важен, поля со значением undefined и функции пропускаются, NaN и ±Infinity
 * считаются как null — ровно как в JSON.
 */

type Json = unknown;

const skipped = (value: Json): boolean =>
  value === undefined || typeof value === 'function' || typeof value === 'symbol';

/** Как значение выглядит после JSON: нечисловые числа становятся null. */
function scalar(value: Json): Json {
  return typeof value === 'number' && !Number.isFinite(value) ? null : value;
}

/** Ключи, которые попали бы в JSON; `ignore` — поля, которые сравнивать не нужно. */
function presentKeys(value: Record<string, Json>, ignore?: ReadonlySet<string>): string[] {
  return Object.keys(value).filter((key) => !skipped(value[key]) && !ignore?.has(key));
}

function arraysEqual(a: readonly Json[], b: readonly Json[], ignore?: ReadonlySet<string>): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    // В массиве пропущенные значения пишутся как null.
    const x = skipped(a[i]) ? null : a[i];
    const y = skipped(b[i]) ? null : b[i];
    if (!jsonEqual(x, y, ignore)) return false;
  }
  return true;
}

function objectsEqual(a: Record<string, Json>, b: Record<string, Json>, ignore?: ReadonlySet<string>): boolean {
  const keysA = presentKeys(a, ignore);
  const keysB = presentKeys(b, ignore);
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i += 1) {
    const key = keysA[i] as string;
    if (key !== keysB[i] || !jsonEqual(a[key], b[key], ignore)) return false;
  }
  return true;
}

/** `ignore` — имена полей объектов на любой глубине, которые не участвуют в сравнении. */
export function jsonEqual(a: Json, b: Json, ignore?: ReadonlySet<string>): boolean {
  if (a === b) return true;
  const x = scalar(a);
  const y = scalar(b);
  if (x === null || y === null || typeof x !== 'object' || typeof y !== 'object') return x === y;
  if (Array.isArray(x) || Array.isArray(y)) return Array.isArray(x) && Array.isArray(y) && arraysEqual(x, y, ignore);
  return objectsEqual(x as Record<string, Json>, y as Record<string, Json>, ignore);
}
