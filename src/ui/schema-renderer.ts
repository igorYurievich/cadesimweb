import type { AppContext } from './context';
import { SVG_NS } from './constants';
import type { DragState, Selectable } from './constants';
import { fullSheet, normalizedBounds, selectionKey } from './helpers';
import { junctionElement, lineElement } from './canvas-primitives';
import { createElementSymbol } from './symbols';
import { stampMetrics } from './helpers';
import type { SimulationController } from './sim-controller';

export interface SchemaRendererSetup {
  root: HTMLElement; svg: SVGSVGElement; wireLayer: SVGGElement; elementLayer: SVGGElement;
  selectionLayer: SVGGElement; selected: Map<string, Selectable>; drag(): DragState | undefined;
  renderSheetFrame(): void; drawDraft(): void; simulation: SimulationController;
  updateHistoryButtons(): void; renderProperties(): void; persistSchema(): void;
}

export function setupSchemaRenderer(ctx: AppContext, deps: SchemaRendererSetup): () => void {
  return () => {
    const { schema } = ctx;
    const { width, height } = schema.sheet;
    const totalHeight = fullSheet(schema.sheet).height;
    for (const id of ['sheet-paper', 'sheet-border']) {
      const rect = deps.root.querySelector<SVGRectElement>(`#${id}`);
      rect?.setAttribute('width', String(width));
      rect?.setAttribute('height', String(totalHeight));
    }
    const gridMargin = stampMetrics(width, height).margin;
    const gridRect = deps.root.querySelector<SVGRectElement>('#sheet-grid');
    gridRect?.setAttribute('x', String(gridMargin)); gridRect?.setAttribute('y', String(gridMargin));
    gridRect?.setAttribute('width', String(Math.max(0, width - gridMargin * 2)));
    gridRect?.setAttribute('height', String(Math.max(0, height - gridMargin * 2)));
    deps.renderSheetFrame();
    deps.simulation.rebuildWireTerminalMap();
    deps.wireLayer.replaceChildren(); deps.elementLayer.replaceChildren(); deps.selectionLayer.replaceChildren();
    const wires = schema.wires.filter((wire) => wire.kind !== 'junction');
    const junctions = schema.wires.filter((wire) => wire.kind === 'junction' && wire.dot);
    for (const wire of wires) {
      const line = lineElement(wire);
      if (deps.selected.has(selectionKey({ kind: 'wire', id: wire.id }))) line.classList.add('is-selected-wire');
      deps.wireLayer.append(line);
    }
    for (const dot of junctions) {
      const circle = junctionElement(dot);
      if (deps.selected.has(selectionKey({ kind: 'wire', id: dot.id }))) circle.classList.add('is-selected-junction');
      deps.wireLayer.append(circle);
    }
    for (const element of schema.elements) {
      const symbol = createElementSymbol(element);
      if (!symbol) continue;
      if (deps.selected.has(selectionKey({ kind: 'element', id: element.id }))) symbol.classList.add('is-selected-element');
      deps.elementLayer.append(symbol);
      if (deps.selected.has(selectionKey({ kind: 'element', id: element.id }))) {
        const hitAreas = [...symbol.querySelectorAll<SVGElement>('.hit-area')];
        const originalDisplay = hitAreas.map((node) => node.getAttribute('display'));
        let bounds: DOMRect | SVGRect;
        try {
          for (const node of hitAreas) node.setAttribute('display', 'none');
          bounds = symbol.getBBox();
        } catch {
          bounds = { x: -1.5, y: -1.5, width: Math.max(3, element.size.w + 3), height: Math.max(3, element.size.h + 3) } as SVGRect;
        } finally {
          hitAreas.forEach((node, index) => {
            const display = originalDisplay[index];
            if (display === null || display === undefined) node.removeAttribute('display');
            else node.setAttribute('display', display);
          });
        }
        const box = document.createElementNS(SVG_NS, 'rect');
        box.setAttribute('x', String(bounds.x - 1.5)); box.setAttribute('y', String(bounds.y - 1.5));
        box.setAttribute('width', String(Math.max(3, bounds.width + 3))); box.setAttribute('height', String(Math.max(3, bounds.height + 3)));
        const transform = symbol.getAttribute('transform');
        if (transform) box.setAttribute('transform', transform);
        box.setAttribute('class', 'element-selection-box'); box.setAttribute('data-box-for', String(element.id)); deps.selectionLayer.append(box);
      }
    }
    for (const item of deps.selected.values()) {
      if (item.kind !== 'wire') continue;
      const wire = schema.wires.find((candidate) => candidate.id === item.id);
      if (!wire || wire.kind === 'junction') continue;
      for (const end of ['from', 'to'] as const) {
        const handle = document.createElementNS(SVG_NS, 'circle');
        handle.setAttribute('cx', String(wire[end].x)); handle.setAttribute('cy', String(wire[end].y));
        handle.setAttribute('r', '2.1'); handle.setAttribute('class', 'wire-end-handle');
        handle.setAttribute('data-wire-end', String(wire.id)); handle.setAttribute('data-end', end); deps.selectionLayer.append(handle);
      }
    }
    const drag = deps.drag();
    if (drag?.mode === 'marquee') {
      const box = normalizedBounds(drag.start, drag.current);
      const marquee = document.createElementNS(SVG_NS, 'rect');
      marquee.setAttribute('x', String(box.minX)); marquee.setAttribute('y', String(box.minY));
      marquee.setAttribute('width', String(Math.max(0.1, box.maxX - box.minX)));
      marquee.setAttribute('height', String(Math.max(0.1, box.maxY - box.minY)));
      marquee.setAttribute('class', 'selection-marquee'); deps.selectionLayer.append(marquee);
    }
    deps.drawDraft(); deps.updateHistoryButtons();
    deps.svg.setAttribute('aria-label', schema.sheet.fileName ? `Схема ${schema.sheet.fileName}` : 'Поле схемы');
    deps.simulation.applySimulationVisuals(); deps.renderProperties(); deps.persistSchema();
  };
}
