import type { Schema, WireKind } from '@model/types';
import { detectBundleLayout, offsetRoute, orthogonalize, simplifyRoute } from './wire-routing';
import type { Point } from './viewport';

export type DrawKind = Exclude<WireKind, 'junction'>;
export interface PlannedWireRoute {
  route: Point[];
  kind: DrawKind;
}

export function activeWireKinds(value: string): DrawKind[] {
  if (value === 'three') return ['phase', 'phase', 'phase'];
  if (value === 'threeN') return ['phase', 'phase', 'phase', 'neutral'];
  return [value as DrawKind];
}

export function buildBundleRoutes(
  points: readonly Point[],
  wireKind: string,
  schema: Schema,
  elbowVerticalFirst: boolean,
  bundleFlipped: boolean,
): PlannedWireRoute[] {
  const kinds = activeWireKinds(wireKind);
  const route = simplifyRoute(orthogonalize(points, elbowVerticalFirst));
  if (route.length < 2) return [];
  if (kinds.length === 1) return [{ route, kind: kinds[0] as DrawKind }];

  const layout = detectBundleLayout(route, schema);
  const side = (layout.side * (bundleFlipped ? -1 : 1)) as 1 | -1;
  // Фазы располагаются по порядку слева направо (или сверху вниз), нейтраль — последней.
  const lanes = kinds.map((_, index) => offsetRoute(route, side * layout.spacing * index));
  const firstStart = route[0] as Point;
  const firstEnd = route[1] as Point;
  const vertical = firstStart.x === firstEnd.x;
  const laneKey = (lane: Point[]): number => {
    const start = lane[0] as Point;
    return vertical ? start.x : start.y;
  };
  lanes.sort((a, b) => laneKey(a) - laneKey(b));
  return kinds.map((kind, index) => ({ route: lanes[index] as Point[], kind }));
}

export function routeInsideSheet(route: readonly Point[], schema: Schema): boolean {
  return route.every((point) => point.x >= 0 && point.y >= 0
    && point.x <= schema.sheet.width && point.y <= schema.sheet.height);
}

export function routeHitsComponent(route: readonly Point[], schema: Schema, elementLayer: SVGGElement): boolean {
  const boxes = schema.elements.flatMap((element) => {
    if (element.typeCode === 20000) return [];
    const body = elementLayer.querySelector<SVGGElement>(`[data-element-id="${element.id}"] .symbol-body`);
    if (!body) return [];
    const box = body.getBBox();
    const angle = element.rotation * Math.PI / 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const corners = [
      { x: box.x, y: box.y },
      { x: box.x + box.width, y: box.y },
      { x: box.x, y: box.y + box.height },
      { x: box.x + box.width, y: box.y + box.height },
    ].map((point) => ({
      x: element.position.x + point.x * cos - point.y * sin,
      y: element.position.y + point.x * sin + point.y * cos,
    }));
    return [{
      element,
      minX: Math.min(...corners.map((point) => point.x)),
      maxX: Math.max(...corners.map((point) => point.x)),
      minY: Math.min(...corners.map((point) => point.y)),
      maxY: Math.max(...corners.map((point) => point.y)),
    }];
  });

  for (let index = 1; index < route.length; index += 1) {
    const a = route[index - 1];
    const b = route[index];
    if (!a || !b) continue;
    for (const box of boxes) {
      const horizontalHit = a.y === b.y && a.y > box.minY && a.y < box.maxY
        && Math.min(a.x, b.x) < box.maxX && Math.max(a.x, b.x) > box.minX;
      const verticalHit = a.x === b.x && a.x > box.minX && a.x < box.maxX
        && Math.min(a.y, b.y) < box.maxY && Math.max(a.y, b.y) > box.minY;
      if (!horizontalHit && !verticalHit) continue;

      // Короткий штрих клеммы может входить в корпус символа.
      const terminalEscape = (point: Point, other: Point): boolean => {
        const isTerminal = box.element.terminals.some((terminal) =>
          box.element.position.x + terminal.offset.x === point.x
          && box.element.position.y + terminal.offset.y === point.y);
        if (!isTerminal) return false;
        const towardPositive = horizontalHit ? other.x > point.x : other.y > point.y;
        const coordinate = horizontalHit ? point.x : point.y;
        const min = horizontalHit ? box.minX : box.minY;
        const max = horizontalHit ? box.maxX : box.maxY;
        const depth = towardPositive
          ? coordinate < min ? 0 : max - coordinate
          : coordinate > max ? 0 : coordinate - min;
        return depth >= 0 && depth <= 3;
      };
      if (!terminalEscape(a, b) && !terminalEscape(b, a)) return true;
    }
  }
  return false;
}
