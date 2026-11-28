/**
 * Куда попал щуп мультиметра: ближайшая клемма или провод в пределах допуска и их сеть движка.
 * Провод без единой клеммы (висит в воздухе) сети не имеет: щуп касается его, но цепи нет.
 */

import { terminalPosition } from '../model/geometry';
import type { Point, Schema, WireSegment } from '../model/types';
import type { NetsResult } from './graph';
import { SegmentGrid } from './segment-grid';
import { cachedNets } from './topology';
import { terminalKey } from './types';
import { buildWireLinks, pointOnSegment } from './wire-links';
import type { WireLinks } from './wire-links';

export interface ProbeContact {
  /** Сеть движка (индекс в EngineState.nets); undefined — провод без клемм. */
  net: number | undefined;
  /** Точка касания на листе: центр клеммы или ближайшая точка провода. */
  point: Point;
  /** Группа соединённых проводов под щупом (нужна для проводов без клемм); на клемме — undefined. */
  wireGroup?: number;
}

interface WireNetIndex {
  links: WireLinks;
  groupNet: Map<number, number>;
}

/** Группы проводов и их сети на одну версию геометрии (cachedNets отдаёт тот же объект, пока она не менялась). */
const indexCache = new WeakMap<NetsResult, WireNetIndex>();

function wireNetIndex(schema: Schema, graph: NetsResult): WireNetIndex {
  const cached = indexCache.get(graph);
  if (cached) return cached;
  const links = buildWireLinks(schema.wires);
  const grid = new SegmentGrid(schema.wires);
  const groupNet = new Map<number, number>();
  for (const element of schema.elements) {
    if (element.typeCode === 20000) continue;
    element.terminals.forEach((_, index) => {
      const point = terminalPosition(element, index);
      const net = graph.terminalNet[terminalKey(element.id, index)];
      if (!point || net === undefined) return;
      for (const wireIndex of grid.atPoint(point)) {
        const wire = schema.wires[wireIndex] as WireSegment;
        if (!pointOnSegment(point, wire.from, wire.to)) continue;
        const group = links.groupOf.get(wire.id);
        if (group !== undefined) groupNet.set(group, net);
      }
    });
  }
  const index = { links, groupNet };
  indexCache.set(graph, index);
  return index;
}

/** Ближайшая точка отрезка к p. */
export function closestOnSegment(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length));
  return { x: a.x + t * dx, y: a.y + t * dy };
}

/** Клемма или провод под щупом; клемма важнее провода на том же расстоянии. */
export function probeContact(schema: Schema, point: Point, tolerance: number): ProbeContact | undefined {
  const graph = cachedNets(schema);
  let best: { contact: ProbeContact; distance: number } | undefined;
  for (const element of schema.elements) {
    if (element.typeCode === 20000) continue;
    element.terminals.forEach((_, index) => {
      const at = terminalPosition(element, index);
      if (!at) return;
      const distance = Math.hypot(at.x - point.x, at.y - point.y);
      if (distance > tolerance || (best && distance >= best.distance)) return;
      best = { contact: { net: graph.terminalNet[terminalKey(element.id, index)], point: at }, distance };
    });
  }
  let nearestWire: { wire: WireSegment; at: Point; distance: number } | undefined;
  for (const wire of schema.wires) {
    if (wire.kind === 'junction') continue;
    const at = closestOnSegment(point, wire.from, wire.to);
    const distance = Math.hypot(at.x - point.x, at.y - point.y);
    if (distance > tolerance || (nearestWire && distance >= nearestWire.distance)) continue;
    nearestWire = { wire, at, distance };
  }
  if (nearestWire && (!best || nearestWire.distance < best.distance)) {
    const index = wireNetIndex(schema, graph);
    const group = index.links.groupOf.get(nearestWire.wire.id);
    const net = group === undefined ? undefined : index.groupNet.get(group);
    return { net, point: nearestWire.at, wireGroup: group };
  }
  return best?.contact;
}
