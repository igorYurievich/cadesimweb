/** Ограничение объектов полем листа: чистая геометрия без DOM. */
import { pageOfX, pageOrigin, programPageSize } from '@model/program-pages';
import type { Point, SchemaElement } from '@model/types';

/**
 * Поле листа. Листы программ ПЛК (programPages, model/program-pages.ts) лежат справа с шагом PAGE_PITCH:
 * точку или группу на таком листе ограничиваем его полем, а не основным листом.
 */
export interface Area {
  width: number; height: number; programPages?: number; programPageWidth?: number; programPageHeight?: number;
}

/** Лист, на котором лежит координата x: начало и размер (листа программы нет — основной лист). */
const pageFor = (x: number, area: Area): { ox: number; width: number; height: number } => {
  const page = pageOfX(x);
  if (page < 1 || page > (area.programPages ?? 0)) return { ox: 0, width: area.width, height: area.height };
  return { ox: pageOrigin(page), ...programPageSize(area) };
};
export interface Extent { minX: number; minY: number; maxX: number; maxY: number }

/** Ближайшая к точке позиция внутри листа, кратная шагу сетки. */
export function clampPointToSheet(point: Point, area: Area, step = 3): Point {
  const fit = (value: number, max: number): number => {
    const v = Math.min(max, Math.max(0, value));
    const maxOnGrid = Math.floor(max / step) * step;
    return Math.min(maxOnGrid, Math.max(0, Math.round(v / step) * step));
  };
  const { ox, width, height } = pageFor(point.x, area);
  return { x: ox + fit(point.x - ox, width), y: fit(point.y, height) };
}

/** Габариты элемента относительно его позиции: рамка и клеммы. */
export function elementExtent(element: SchemaElement): Extent {
  const ext: Extent = { minX: 0, minY: 0, maxX: element.size.w, maxY: element.size.h };
  for (const t of element.terminals) {
    ext.minX = Math.min(ext.minX, t.offset.x); ext.maxX = Math.max(ext.maxX, t.offset.x);
    ext.minY = Math.min(ext.minY, t.offset.y); ext.maxY = Math.max(ext.maxY, t.offset.y);
  }
  return ext;
}

/** Сдвиг группы (габариты уже в абсолютных координатах) с учётом листа и сетки. */
export function clampDeltaToSheet(delta: Point, group: Extent, area: Area, step = 3): Point {
  const axis = (d: number, min: number, max: number, size: number): number => {
    const lo = -min; const hi = size - max;
    if (hi < lo) return 0;
    let v = Math.round(Math.min(hi, Math.max(lo, d)) / step) * step;
    if (v > hi) v = Math.floor(hi / step) * step;
    if (v < lo) v = Math.ceil(lo / step) * step;
    return v > hi || v < lo ? Math.min(hi, Math.max(lo, d)) : v;
  };
  const { ox, width, height } = pageFor(group.minX, area);
  return { x: axis(delta.x, group.minX - ox, group.maxX - ox, width), y: axis(delta.y, group.minY, group.maxY, height) };
}

/** Позиция элемента, при которой он целиком лежит на листе. */
export function clampElementPosition(position: Point, element: SchemaElement, area: Area, step = 3): Point {
  const ext = elementExtent(element);
  const group = { minX: position.x + ext.minX, minY: position.y + ext.minY, maxX: position.x + ext.maxX, maxY: position.y + ext.maxY };
  const d = clampDeltaToSheet({ x: 0, y: 0 }, group, area, step);
  return { x: position.x + d.x, y: position.y + d.y };
}
