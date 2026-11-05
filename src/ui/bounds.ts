/** Ограничение объектов полем листа: чистая геометрия без DOM. */
import type { Point, SchemaElement } from '@model/types';

export interface Area { width: number; height: number }
export interface Extent { minX: number; minY: number; maxX: number; maxY: number }

/** Ближайшая к точке позиция внутри листа, кратная шагу сетки. */
export function clampPointToSheet(point: Point, area: Area, step = 3): Point {
  const fit = (value: number, max: number): number => {
    const v = Math.min(max, Math.max(0, value));
    const maxOnGrid = Math.floor(max / step) * step;
    return Math.min(maxOnGrid, Math.max(0, Math.round(v / step) * step));
  };
  return { x: fit(point.x, area.width), y: fit(point.y, area.height) };
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
  return { x: axis(delta.x, group.minX, group.maxX, area.width), y: axis(delta.y, group.minY, group.maxY, area.height) };
}

/** Позиция элемента, при которой он целиком лежит на листе. */
export function clampElementPosition(position: Point, element: SchemaElement, area: Area, step = 3): Point {
  const ext = elementExtent(element);
  const group = { minX: position.x + ext.minX, minY: position.y + ext.minY, maxX: position.x + ext.maxX, maxY: position.y + ext.maxY };
  const d = clampDeltaToSheet({ x: 0, y: 0 }, group, area, step);
  return { x: position.x + d.x, y: position.y + d.y };
}
