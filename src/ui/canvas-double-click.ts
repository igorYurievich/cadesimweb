import type { Selectable } from './constants';
import { selectionKey } from './helpers';
import { getSelectionHit } from './selection';

export interface CanvasDoubleClickSetup {
  svg: SVGSVGElement; wireDrawing(): boolean; placing(): boolean; panTool(): boolean; spaceDown(): boolean;
  nodeTool(): boolean; simulationMode(): 'edit' | 'run'; selected: Map<string, Selectable>;
  renderSchema(): void; openProperties(x: number, y: number): void;
}

export function setupCanvasDoubleClick(deps: CanvasDoubleClickSetup): void {
  let lastPress: { time: number; x: number; y: number; id: number } | undefined;
  deps.svg.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || deps.wireDrawing() || deps.placing() || deps.panTool() || deps.nodeTool() || deps.simulationMode() !== 'edit' || deps.spaceDown()) {
      lastPress = undefined; return;
    }
    const hit = document.elementsFromPoint(event.clientX, event.clientY)
      .map((node) => getSelectionHit(node)).find((candidate) => candidate?.kind === 'element');
    if (!hit) { lastPress = undefined; return; }
    const now = performance.now(); const previous = lastPress;
    if (previous && previous.id === hit.id && now - previous.time < 450 && Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < 8) {
      lastPress = undefined;
      const { clientX, clientY } = event;
      setTimeout(() => {
        deps.selected.clear(); deps.selected.set(selectionKey(hit), hit);
        deps.renderSchema(); deps.openProperties(clientX, clientY);
      }, 40);
      return;
    }
    lastPress = { time: now, x: event.clientX, y: event.clientY, id: hit.id };
  });
}
