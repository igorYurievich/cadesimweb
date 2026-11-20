/**
 * Схемы, сохранённые веб-версией до исправления начала координат символов 2D (REALISTIC_2D_ORIGIN_DX), хранят
 * клеммы от клеммы 1. При загрузке такой схемы элемент сдвигается так, чтобы клеммы остались на месте
 * (на концах проводов), а смещения клемм берутся из текущей таблицы.
 */

import { getCadType } from './cad-types';
import { buildTerminals } from './geometry';
import { REALISTIC_2D_ORIGIN_DX } from './realistic-2d-types';
import type { Schema } from './types';

export function realign2dTerminals(schema: Schema): void {
  for (const element of schema.elements) {
    if (!REALISTIC_2D_ORIGIN_DX[element.typeCode]) continue;
    const labels = element.terminals.map((terminal) => terminal.label);
    const fresh = buildTerminals(getCadType(element.typeCode), labels.length, element.size, element.rotation, labels);
    const first = element.terminals[0]?.offset;
    const target = fresh[0]?.offset;
    if (!first || !target) continue;
    const dx = first.x - target.x;
    const dy = first.y - target.y;
    if (dx === 0 && dy === 0) continue;
    // Сдвигаем, только если все клеммы смещены одинаково (старая раскладка), иначе схему не трогаем.
    const sameShift = element.terminals.every((terminal, index) =>
      terminal.offset.x - (fresh[index]?.offset.x ?? NaN) === dx
      && terminal.offset.y - (fresh[index]?.offset.y ?? NaN) === dy);
    if (!sameShift) continue;
    element.position = { x: element.position.x + dx, y: element.position.y + dy };
    element.terminals = fresh;
  }
}
