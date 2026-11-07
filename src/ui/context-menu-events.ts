import type { SimulationController } from './sim-controller';
import type { Point } from './viewport';

export function setupSimulationContextMenuEvents(svg: SVGSVGElement, menu: HTMLElement, simulation: SimulationController): void {
  window.addEventListener('pointerdown', (event) => {
    if (!menu.hidden && !menu.contains(event.target as Node)) menu.hidden = true;
  });
  svg.addEventListener('contextmenu', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const item = target?.closest<SVGGElement>('[data-element-id]');
    event.preventDefault();
    simulation.showSimulationContextMenu(event, item ? Number(item.dataset.elementId) : undefined);
  });
}

export interface WireContextMenuSetup {
  isDrawing(): boolean; draftPoints(): Point[]; clearDraftCursor(): void;
  drawDraft(): void; updateHistoryButtons(): void; cancelWireDrawing(): void;
}

export function setupWireContextMenu(svg: SVGSVGElement, deps: WireContextMenuSetup): void {
  svg.addEventListener('contextmenu', (event) => {
    if (!deps.isDrawing()) return;
    event.preventDefault();
    const draftPoints = deps.draftPoints();
    if (draftPoints.length) {
      draftPoints.length = 0; deps.clearDraftCursor(); deps.drawDraft(); deps.updateHistoryButtons();
    } else deps.cancelWireDrawing();
  });
}
