/**
 * Провод важнее области захвата элемента.
 * Невидимая рамка символа (symbol-hit-area.ts) шире рисунка и лежит поверх слоя проводов,
 * поэтому провод, проведённый рядом с элементом или поверх него, раньше нельзя было выделить:
 * клик доставался элементу. Теперь клик по пустой рамке рядом с проводом выделяет провод;
 * клик по линиям символа или внутрь его фигуры по-прежнему выделяет элемент.
 */
import type { Schema } from '@model/types';
import type { Selectable } from './constants';
import type { Point, Viewport } from './viewport';
import { screenToSheet } from './viewport';
import { svgPoint } from './canvas-primitives';
import { getSelectionHit } from './selection';

/** Допуск попадания по проводу в пикселях экрана. */
export const WIRE_HIT_PX = 5;

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x; const dy = b.y - a.y;
  const length2 = dx * dx + dy * dy;
  const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Ближайший к точке листа провод (не точка соединения) в пределах допуска. */
export function nearestWireAt(schema: Schema, point: Point, tolerance: number): number | undefined {
  let best: { id: number; distance: number } | undefined;
  for (const wire of schema.wires) {
    if (wire.kind === 'junction') continue;
    const distance = distanceToSegment(point, wire.from, wire.to);
    if (distance <= tolerance && (!best || distance < best.distance)) best = { id: wire.id, distance };
  }
  return best?.id;
}

/**
 * Клик пришёлся внутрь замкнутой фигуры самого символа (ромб источника, круг мотора, корпус)?
 * Тогда элемент важнее провода. Пустая рамка захвата вокруг рисунка фигурой не считается.
 */
export function pointInsideSymbolShape(target: EventTarget | null, clientX: number, clientY: number): boolean {
  if (!(target instanceof Element)) return false;
  const symbol = target.closest('[data-element-id]');
  if (!symbol) return false;
  for (const shape of symbol.querySelectorAll<SVGGeometryElement>('.symbol-body path, .symbol-body rect, .symbol-body circle, .symbol-body ellipse, .symbol-body polygon')) {
    const matrix = shape.getScreenCTM();
    if (!matrix || typeof shape.isPointInFill !== 'function') continue;
    const local = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
    try { if (shape.isPointInFill(local)) return true; } catch { /* фигура без геометрии */ }
  }
  return false;
}

/**
 * Что выделяет клик в редакторе. Провод рядом с точкой перекрывает элемент,
 * если клик попал в пустую рамку захвата, а не в нарисованный символ.
 */
export function pickCanvasHit(
  target: EventTarget | null, schema: Schema, point: Point, tolerance: number, insideShape = false,
): Selectable | undefined {
  const hit = getSelectionHit(target);
  if (hit?.kind !== 'element' || insideShape) return hit;
  // Линии и подписи символа — сам элемент; провод выигрывает только на прозрачной рамке.
  if (!(target as Element).classList?.contains('hit-area')) return hit;
  const wireId = nearestWireAt(schema, point, tolerance);
  return wireId === undefined ? hit : { kind: 'wire', id: wireId };
}

/** Точка листа под указателем и допуск в единицах листа для текущего масштаба. */
export function pointerSheetHit(event: MouseEvent, svg: SVGSVGElement, viewSize: Point, viewport: Viewport): { point: Point; tolerance: number } {
  const point = screenToSheet(svgPoint(event, svg, viewSize), viewport);
  return { point, tolerance: WIRE_HIT_PX / Math.max(viewport.scale, 1e-6) };
}
