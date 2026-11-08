import type { WireKind } from '@model/types';
import type { Point } from './viewport';
import { SVG_NS, WIRE_COLORS } from './constants';

type DrawKind = Exclude<WireKind, 'junction'>;
interface DraftRoute { route: Point[]; kind: DrawKind }
export interface WireDraftSetup {
  layer: SVGGElement; isDrawing(): boolean; points(): Point[]; cursor(): Point | undefined;
  buildRoutes(points: readonly Point[]): DraftRoute[]; thickness(): number;
}

export function setupWireDraft(deps: WireDraftSetup): () => void {
  return () => {
    deps.layer.replaceChildren();
    const draftPoints = deps.points();
    if (!deps.isDrawing() || draftPoints.length === 0) return;
    const draftCursor = deps.cursor();
    const preview = draftCursor && (draftCursor.x !== draftPoints[draftPoints.length - 1]?.x || draftCursor.y !== draftPoints[draftPoints.length - 1]?.y)
      ? [...draftPoints, draftCursor]
      : draftPoints;
    for (const { route, kind } of deps.buildRoutes(preview)) for (let i = 1; i < route.length; i += 1) {
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', String(route[i - 1]?.x)); line.setAttribute('y1', String(route[i - 1]?.y));
      line.setAttribute('x2', String(route[i]?.x)); line.setAttribute('y2', String(route[i]?.y));
      line.setAttribute('stroke', WIRE_COLORS[kind]); line.setAttribute('stroke-width', String(Math.max(1, deps.thickness()) * 1.35));
      line.setAttribute('stroke-dasharray', '3 2'); line.setAttribute('vector-effect', 'non-scaling-stroke');
      line.setAttribute('class', 'wire-draft'); deps.layer.append(line);
    }
    for (const point of draftPoints) {
      const marker = document.createElementNS(SVG_NS, 'circle');
      marker.setAttribute('cx', String(point.x)); marker.setAttribute('cy', String(point.y));
      marker.setAttribute('r', '1.5'); marker.setAttribute('class', 'wire-draft-point'); deps.layer.append(marker);
    }
  };
}
