/** Большая схема для замеров скорости: копии учебного примера рядом друг с другом. */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { importCad } from '../../src/model/cad-import';
import type { Schema } from '../../src/model/types';

/** Ejemplo 10: контакторы, таймеры, моторы — 44 элемента. */
export const PERF_EXAMPLE = 'src/data/examples/Ejemplos/Ejemplo 10.cad';

/**
 * Склеивает `copies` копий схемы со сдвигом по x. Имена получают суффикс копии, чтобы копии
 * были независимыми цепями, а не одной схемой с общими катушками.
 */
export function tiledSchema(copies: number, file = PERF_EXAMPLE): Schema {
  const base = importCad(readFileSync(resolve(process.cwd(), file), 'utf8')).schema;
  const xs = [...base.elements.map((e) => e.position.x), ...base.wires.flatMap((w) => [w.from.x, w.to.x])];
  const width = Math.ceil((Math.max(...xs) - Math.min(...xs) + 60) / 6) * 6;
  const maxId = Math.max(0, ...base.elements.map((e) => e.id), ...base.wires.map((w) => w.id)) + 1;
  const result: Schema = { ...base, elements: [], wires: [] };
  for (let copy = 0; copy < copies; copy += 1) {
    const dx = copy * width;
    const suffix = copy === 0 ? '' : `_${copy}`;
    for (const element of base.elements) {
      result.elements.push({
        ...structuredClone(element),
        id: element.id + copy * maxId,
        name: element.name === '' ? '' : `${element.name}${suffix}`,
        position: { x: element.position.x + dx, y: element.position.y },
      });
    }
    for (const wire of base.wires) {
      result.wires.push({
        ...structuredClone(wire),
        id: wire.id + copy * maxId,
        from: { x: wire.from.x + dx, y: wire.from.y },
        to: { x: wire.to.x + dx, y: wire.to.y },
      });
    }
  }
  return result;
}
