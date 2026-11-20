/**
 * Клеммы в хвосте записи .cad (после закрывающего «#»), как у символов 2D.
 *
 * Образец 2d-simbolos.cad: у контактора 7018 восемь слотов A1 A2 1 2 3 4 5 6 и хвост
 * ` 5-1- 6-1-13-1-14-1-21-1-22-1-  -0-  -0-  -0-  -0-  -0`, у дисюнтора 6015 слоты 1 3 5 2 4 6 13 14 и хвост
 * `13-1-14-1-21-1-22-1-  -0-…`. Хвост — пары «метка-флаг» начиная со слота 6 (первые две пары повторяют
 * слоты 6 и 7), метка дополнена пробелами до двух знаков [вывод по двум записям]. Число пар в хвосте у
 * типов разное (11 и 9) — берём как в образце.
 */

export interface TailTerminalSpec {
  /** Номер клеммы, с которой начинается хвост (первые пары повторяют слоты основной записи). */
  start: number;
  /** Число пар в хвосте новой записи, вместе с пустыми. */
  pairs: number;
}

export const TAIL_TERMINALS: Readonly<Record<number, TailTerminalSpec>> = {
  6015: { start: 6, pairs: 9 },
  6016: { start: 6, pairs: 9 },
  7018: { start: 6, pairs: 11 },
};

/** Метки клемм из хвоста по порядку, только с флагом 1. */
export function parseTailLabels(tail: string | undefined): string[] {
  if (!tail) return [];
  const tokens = tail.split('-');
  const labels: string[] = [];
  for (let i = 0; i + 1 < tokens.length; i += 2) {
    if ((tokens[i + 1] ?? '').trim() === '1') labels.push((tokens[i] ?? '').trim());
  }
  return labels;
}

/** Хвост для меток клемм начиная со `start`, дополненный пустыми парами до `pairs`. */
export function buildTail(labels: readonly string[], pairs: number): string {
  const items = labels.map((label) => `${label.padStart(2, ' ')}-1`);
  while (items.length < pairs) items.push('  -0');
  return items.join('-');
}
