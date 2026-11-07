import type { SchemaElement } from '@model/types';
import type { AppContext } from './context';
import type { Point, Viewport } from './viewport';
import { screenToSheet } from './viewport';
import { svgPoint } from './canvas-primitives';
import { createPlacedElement } from './helpers';
import { createElementSymbol } from './symbols';
import { SVG_NS } from './constants';

export interface PlacementGhostSetup {
  svg: SVGSVGElement; after: SVGElement; viewSize(): Point; viewport(): Viewport;
  placementType(): number | undefined; rotation(): 0 | 1 | 2 | 3; wireDrawing(): boolean;
}

export function setupPlacementGhost(ctx: AppContext, deps: PlacementGhostSetup) {
  const layer = document.createElementNS(SVG_NS, 'g');
  layer.setAttribute('id', 'ghost-layer'); layer.setAttribute('class', 'placement-ghost'); layer.setAttribute('pointer-events', 'none');
  deps.after.after(layer);
  let point: Point | undefined;
  const draw = (): void => {
    layer.replaceChildren();
    const type = deps.placementType();
    if (type === undefined || point === undefined || deps.wireDrawing()) return;
    const ghost: SchemaElement = createPlacedElement(type, point, deps.rotation(), ctx.schema);
    ghost.name = '';
    if (ghost.typeCode === 2009) ghost.func = '';
    const symbol = createElementSymbol(ghost);
    if (symbol) layer.append(symbol);
  };
  const move = (event: MouseEvent): void => {
    if (deps.placementType() === undefined) return;
    point = screenToSheet(svgPoint(event, deps.svg, deps.viewSize()), deps.viewport());
    draw();
  };
  const clearPoint = (): void => { point = undefined; draw(); };
  new MutationObserver(() => { if (!deps.svg.classList.contains('is-placing')) point = undefined; draw(); })
    .observe(deps.svg, { attributes: true, attributeFilter: ['class'] });
  return { layer, draw, move, clearPoint };
}
