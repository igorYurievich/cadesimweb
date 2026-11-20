/**
 * Запись блоков контактов с выдержкой 2D (7020 ON delay, 7021 OFF delay) в .cad.
 * В образце 2d-simbolos.cad флагов клемм нет, тексты `-KM1##··#0#5#9#1#5#`: texts[4] — шкала, texts[5] — выдержка, с.
 * Остальные поля (9#1#5) не разгаданы: у записи из файла остаются как были, у новой — как в образце.
 */

import type { CadRecord } from './cad-format';
import { DELAY_BLOCK_DEFAULT_TIME } from './realistic-2d-types';
import type { SchemaElement } from './types';

const SCALE_FIELD = 4;
const TIME_FIELD = 5;
const SAMPLE_TAIL: readonly string[] = ['9', '1', '5'];

/** Шкала и выдержка из параметров записи (то, что импорт собрал в extra по порядку). */
export function delayBlockParams(extra: readonly string[]): SchemaElement['params'] {
  const scale = Number(extra[0] ?? 0);
  const time = Number(extra[1] ?? DELAY_BLOCK_DEFAULT_TIME);
  return {
    scale: Number.isFinite(scale) ? scale : 0,
    time: Number.isFinite(time) ? time : DELAY_BLOCK_DEFAULT_TIME,
  };
}

/** Заполняет тексты и флаги записи блока: клемм в записи нет, параметры — в texts[4..8]. */
export function writeDelayBlockRecord(record: CadRecord, element: SchemaElement, isNew: boolean): void {
  record.nums.fill(0, 0, 8);
  record.texts[2] = '';
  record.texts[3] = '';
  record.texts[SCALE_FIELD] = String(element.params.scale ?? 0);
  record.texts[TIME_FIELD] = String(element.params.time ?? DELAY_BLOCK_DEFAULT_TIME);
  if (isNew) SAMPLE_TAIL.forEach((value, index) => { record.texts[TIME_FIELD + 1 + index] = value; });
}
