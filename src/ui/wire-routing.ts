import { terminalPosition } from '@model/geometry';
import type { Point, Schema, WireSegment } from '@model/types';

export type SnapTarget = 'terminal' | 'wire' | 'grid';

/** Snap near a terminal first, then project onto an existing orthogonal wire. */
export function snapDrawingPoint(point: Point, schema: Schema, tolerance = 4.5): { point: Point; target: SnapTarget } {
  let best: { point: Point; distance: number } | undefined;
  for (const element of schema.elements) {
    if (element.typeCode === 20000) continue;
    for (let index = 0; index < element.terminals.length; index += 1) {
      const terminal = terminalPosition(element, index);
      if (!terminal) continue;
      const distance = Math.hypot(point.x - terminal.x, point.y - terminal.y);
      if (distance <= tolerance && (!best || distance < best.distance)) best = { point: terminal, distance };
    }
  }
  if (best) return { point: { ...best.point }, target: 'terminal' };

  let wireBest: { point: Point; distance: number } | undefined;
  for (const wire of schema.wires) {
    if (wire.kind === 'junction') continue;
    const dx = wire.to.x - wire.from.x;
    const dy = wire.to.y - wire.from.y;
    let projected: Point | undefined;
    if (Math.abs(dy) < 0.001 && point.x >= Math.min(wire.from.x, wire.to.x) && point.x <= Math.max(wire.from.x, wire.to.x)) {
      projected = { x: point.x, y: wire.from.y };
    } else if (Math.abs(dx) < 0.001 && point.y >= Math.min(wire.from.y, wire.to.y) && point.y <= Math.max(wire.from.y, wire.to.y)) {
      projected = { x: wire.from.x, y: point.y };
    }
    if (!projected) continue;
    const distance = Math.hypot(point.x - projected.x, point.y - projected.y);
    if (distance <= 3 && (!wireBest || distance < wireBest.distance)) wireBest = { point: projected, distance };
  }
  return wireBest ? { point: { ...wireBest.point }, target: 'wire' } : { point: { ...point }, target: 'grid' };
}

/** Inserts one elbow for every diagonal leg; horizontal travel is first unless `verticalFirst`. */
export function orthogonalize(points: readonly Point[], verticalFirst = false): Point[] {
  const out: Point[] = [];
  for (const point of points) {
    const previous = out[out.length - 1];
    if (!previous) { out.push({ ...point }); continue; }
    if (point.x === previous.x && point.y === previous.y) continue;
    if (point.x !== previous.x && point.y !== previous.y) out.push(verticalFirst ? { x: previous.x, y: point.y } : { x: point.x, y: previous.y });
    out.push({ ...point });
  }
  return out;
}

/** Removes repeated points and points lying in the middle of a straight run. */
export function simplifyRoute(points: readonly Point[]): Point[] {
  const out: Point[] = [];
  for (const point of points) {
    const last = out[out.length - 1];
    if (last && last.x === point.x && last.y === point.y) continue;
    out.push({ ...point });
    while (out.length >= 3) {
      const a = out[out.length - 3] as Point; const b = out[out.length - 2] as Point; const c = out[out.length - 1] as Point;
      const straight = (a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y);
      if (!straight) break;
      out.splice(out.length - 2, 1);
    }
  }
  return out;
}

function unitNormal(a: Point, b: Point): Point {
  const dx = Math.sign(b.x - a.x); const dy = Math.sign(b.y - a.y);
  return { x: -dy + 0, y: dx };
}

/**
 * Параллельный маршрут на расстоянии `offset` (справа по ходу при offset > 0).
 * Работает для ортогональных маршрутов: смещение угла — сумма нормалей смежных отрезков.
 */
export function offsetRoute(route: readonly Point[], offset: number): Point[] {
  return route.map((point, i) => {
    const prev = route[i - 1]; const next = route[i + 1];
    const n1 = prev ? unitNormal(prev, point) : { x: 0, y: 0 };
    const n2 = next ? unitNormal(point, next) : { x: 0, y: 0 };
    return { x: point.x + (n1.x + n2.x) * offset, y: point.y + (n1.y + n2.y) * offset };
  });
}

/**
 * Для пучка из нескольких проводов определяет шаг и сторону по клеммам одного элемента
 * (например, ряд 1-3-5 контактора) в начале или в конце маршрута.
 */
export function detectBundleLayout(route: readonly Point[], schema: Schema, fallbackSpacing = 6): { spacing: number; side: 1 | -1 } {
  const probe = (at: Point, from: Point, to: Point): { spacing: number; side: 1 | -1 } | undefined => {
    const n = unitNormal(from, to);
    let best: number | undefined;
    for (const element of schema.elements) {
      if (element.typeCode === 20000) continue;
      const points = element.terminals.map((_, i) => terminalPosition(element, i)).filter((p): p is Point => !!p);
      if (!points.some((p) => Math.hypot(p.x - at.x, p.y - at.y) < 0.01)) continue;
      for (const q of points) {
        const vx = q.x - at.x; const vy = q.y - at.y;
        const along = vx * n.y - vy * n.x; // вдоль направления прокладки
        const across = vx * n.x + vy * n.y;
        if (Math.abs(along) > 0.01 || Math.abs(across) < 2.9) continue;
        if (best === undefined || Math.abs(across) < Math.abs(best)) best = across;
      }
    }
    return best === undefined ? undefined : { spacing: Math.abs(best), side: best > 0 ? 1 : -1 };
  };
  const a = route[0]; const b = route[1];
  const y = route[route.length - 1]; const x = route[route.length - 2];
  return (a && b ? probe(a, a, b) : undefined) ?? (x && y ? probe(y, x, y) : undefined) ?? { spacing: fallbackSpacing, side: 1 };
}

export function isWireInteriorPoint(point: Point, wire: WireSegment, tolerance = 0.001): boolean {
  if (wire.kind === 'junction') return false;
  const horizontal = Math.abs(wire.from.y - wire.to.y) < tolerance;
  const vertical = Math.abs(wire.from.x - wire.to.x) < tolerance;
  const onInterior = (value: number, a: number, b: number): boolean => value > Math.min(a, b) + tolerance && value < Math.max(a, b) - tolerance;
  return (horizontal && Math.abs(point.y - wire.from.y) < tolerance && onInterior(point.x, wire.from.x, wire.to.x))
    || (vertical && Math.abs(point.x - wire.from.x) < tolerance && onInterior(point.y, wire.from.y, wire.to.y));
}
