import type { WireSegment } from '@model/types';
import type { AppContext } from './context';
import type { Point } from './viewport';
import { CAD_GRID_STEP, SVG_NS } from './constants';
import { cloneSchema } from './helpers';
import { snapPointToGrid } from './viewport';

export interface NodeToolSetup {
  layer: SVGGElement; active(): boolean; wireDrawing(): boolean;
  status: HTMLElement; commitSchema(before: ReturnType<typeof cloneSchema>): void; renderSchema(): void;
}

export function setupNodeTool(ctx: AppContext, deps: NodeToolSetup) {
  const wireTouchesPoint = (wire: WireSegment, point: Point, tolerance = 0.001): boolean => {
    const { from, to } = wire; const dx = to.x - from.x; const dy = to.y - from.y;
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq === 0) return Math.hypot(point.x - from.x, point.y - from.y) <= tolerance;
    const t = ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSq;
    if (t < -tolerance || t > 1 + tolerance) return false;
    return Math.hypot(point.x - (from.x + t * dx), point.y - (from.y + t * dy)) <= tolerance;
  };
  const hasJunctionAt = (point: Point): boolean => ctx.schema.wires.some((wire) =>
    wire.kind === 'junction' && wire.dot && Math.hypot(wire.from.x - point.x, wire.from.y - point.y) <= 0.01,
  );
  const findNodePoint = (raw: Point): { point: Point; count: number; distance: number } | undefined => {
    const wires = ctx.schema.wires.filter((wire) => wire.kind !== 'junction');
    const candidates: Point[] = [snapPointToGrid(raw, CAD_GRID_STEP)];
    const nearbyWires = wires.filter((wire) =>
      Math.max(wire.from.x, wire.to.x) >= raw.x - CAD_GRID_STEP
      && Math.min(wire.from.x, wire.to.x) <= raw.x + CAD_GRID_STEP
      && Math.max(wire.from.y, wire.to.y) >= raw.y - CAD_GRID_STEP
      && Math.min(wire.from.y, wire.to.y) <= raw.y + CAD_GRID_STEP,
    );
    for (const wire of nearbyWires) for (const end of [wire.from, wire.to]) {
      if (Math.hypot(end.x - raw.x, end.y - raw.y) <= CAD_GRID_STEP) candidates.push({ ...end });
    }
    for (let i = 0; i < nearbyWires.length; i++) for (let j = i + 1; j < nearbyWires.length; j++) {
      const first = nearbyWires[i]!; const second = nearbyWires[j]!;
      const rx = first.to.x - first.from.x; const ry = first.to.y - first.from.y;
      const sx = second.to.x - second.from.x; const sy = second.to.y - second.from.y;
      const denominator = rx * sy - ry * sx;
      if (Math.abs(denominator) < 1e-9) continue;
      const qx = second.from.x - first.from.x; const qy = second.from.y - first.from.y;
      const t = (qx * sy - qy * sx) / denominator;
      const u = (qx * ry - qy * rx) / denominator;
      if (t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9) {
        candidates.push({ x: first.from.x + t * rx, y: first.from.y + t * ry });
      }
    }
    const nearbyCandidates = candidates.filter((point, index) =>
      Math.hypot(point.x - raw.x, point.y - raw.y) <= CAD_GRID_STEP
      && candidates.findIndex((other) => Math.abs(other.x - point.x) < 1e-8 && Math.abs(other.y - point.y) < 1e-8) === index,
    );
    let best: { point: Point; count: number; distance: number } | undefined;
    for (const point of nearbyCandidates) {
      const count = wires.filter((wire) => wireTouchesPoint(wire, point)).length;
      if (count < 2) continue;
      const distance = Math.hypot(point.x - raw.x, point.y - raw.y);
      if (!best || distance < best.distance) best = { point, count, distance };
    }
    return best;
  };
  const drawNodeCursor = (raw: Point | undefined): void => {
    deps.layer.replaceChildren();
    if (!deps.active() || !raw || deps.wireDrawing()) return;
    const target = findNodePoint(raw); const point = target?.point ?? snapPointToGrid(raw, CAD_GRID_STEP);
    const placeable = !!target && !hasJunctionAt(target.point);
    const ring = document.createElementNS(SVG_NS, 'circle');
    ring.setAttribute('cx', String(point.x)); ring.setAttribute('cy', String(point.y)); ring.setAttribute('r', target ? '2.2' : '1.8');
    ring.setAttribute('fill', placeable ? '#1f6fe0' : 'none'); ring.setAttribute('fill-opacity', '0.35');
    ring.setAttribute('stroke', placeable ? '#1f6fe0' : '#7d8996'); ring.setAttribute('stroke-width', '0.5');
    deps.layer.append(ring);
  };
  const placeNodeAt = (raw: Point): void => {
    const best = findNodePoint(raw);
    if (!best) { deps.status.textContent = 'Здесь нет соединения: узел ставится там, где сходятся или пересекаются минимум два провода.'; return; }
    const { point } = best;
    if (hasJunctionAt(point)) {
      deps.status.textContent = 'В этой точке узел уже стоит.'; return;
    }
    const before = cloneSchema(ctx.schema);
    const id = Math.max(0, ...ctx.schema.elements.map((element) => element.id), ...ctx.schema.wires.map((wire) => wire.id)) + 1;
    ctx.schema.wires.push({ id, typeCode: 4001, kind: 'junction', from: { ...point }, to: { ...point }, thickness: 0, dot: true });
    deps.commitSchema(before); deps.renderSchema();
    deps.status.textContent = `Узел поставлен: соединено проводов — ${best.count}.`;
  };
  return { drawNodeCursor, placeNodeAt };
}
