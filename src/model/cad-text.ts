import { CAD_TEXT_FIELDS } from './cad-format';
import type { CadRecord } from './cad-format';
import type { SchemaElement } from './types';

/**
 * Текст на схеме (тип 8) в формате CADe_SIMU: nums[8..11] — рамка x1 y1 x2 y2,
 * сам текст — хвост записи, а новые записи получают 8 полей « 0», как в образцах программы.
 */
export function writeTextFrame(record: CadRecord, element: SchemaElement, o: number, fresh: boolean): void {
  record.nums[10 + o] = element.position.x + element.size.w;
  record.nums[11 + o] = element.position.y + element.size.h;
  record.tail = String(element.params.text ?? record.tail ?? '');
  if (fresh) for (let i = 2; i < CAD_TEXT_FIELDS; i += 1) record.texts[i] = ' 0';
}
