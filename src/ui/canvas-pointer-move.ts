import type { AppContext } from './context';
import type { Schema } from '@model/types';
import type { DragState, Selectable } from './constants';
import type { Point, Viewport } from './viewport';
import { clampDeltaToSheet, clampPointToSheet, elementExtent } from './bounds';
import { panBy, screenToSheet } from './viewport';
import { snapDrawingPoint } from './wire-routing';
import { svgPoint } from './canvas-primitives';
import { normalizedBounds } from './helpers';
import { updateMarqueeSelection } from './selection';

export interface CanvasPointerMoveSetup {
  svg: SVGSVGElement; viewSize(): Point; viewport(): Viewport; setViewport(value: Viewport): void;
  drag(): DragState | undefined; setPointerSheetPosition(value: Point): void; setDraftCursor(value: Point | undefined): void;
  cursorCoords: HTMLOutputElement | null; nodeTool(): boolean; drawNodeCursor(point: Point): void;
  moveGhost(event: MouseEvent): void; wireDrawing(): boolean; drawDraft(): void;
  drawViewport(): void; scheduleMovePreview(): void; renderSchema(): void;
}

export function setupCanvasPointerMove(ctx: AppContext, deps: CanvasPointerMoveSetup): void {
  deps.svg.addEventListener('pointermove', (event) => {
    const pointerScreen = svgPoint(event, deps.svg, deps.viewSize());
    let pointerSheetPosition = screenToSheet(pointerScreen, deps.viewport());
    deps.setPointerSheetPosition(pointerSheetPosition);
    if (deps.cursorCoords) deps.cursorCoords.value = `X: ${pointerSheetPosition.x.toFixed(1)}  Y: ${pointerSheetPosition.y.toFixed(1)}`;
    let drag = deps.drag();
    if (!drag) deps.moveGhost(event);
    if (deps.nodeTool() && !drag) deps.drawNodeCursor(pointerSheetPosition);
    if (!drag || drag.pointerId !== event.pointerId) {
      if (!drag && deps.wireDrawing()) {
        const raw = clampPointToSheet(screenToSheet(svgPoint(event, deps.svg, deps.viewSize()), deps.viewport()), ctx.schema.sheet);
        deps.setDraftCursor(clampPointToSheet(snapDrawingPoint(raw, ctx.schema).point, ctx.schema.sheet));
        deps.drawDraft();
      }
      return;
    }
    const screen = svgPoint(event, deps.svg, deps.viewSize());
    const sheetPoint = screenToSheet(screen, deps.viewport());
    const schema = ctx.schema;
    if (drag.mode === 'pan') {
      const panned = panBy(deps.viewport(), { x: screen.x - drag.last.x, y: screen.y - drag.last.y });
      deps.setViewport(panned);
      pointerSheetPosition = screenToSheet(screen, deps.viewport());
      deps.setPointerSheetPosition(pointerSheetPosition);
      drag.last = screen; deps.drawViewport();
    } else if (drag.mode === 'move') {
      const group = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
      const grow = (x0: number, y0: number, x1: number, y1: number): void => {
        group.minX = Math.min(group.minX, x0); group.minY = Math.min(group.minY, y0);
        group.maxX = Math.max(group.maxX, x1); group.maxY = Math.max(group.maxY, y1);
      };
      for (const object of drag.objects) {
        if (object.item.kind === 'element' && object.position) {
          const element = schema.elements.find((candidate) => candidate.id === object.item.id);
          if (!element) continue;
          const ext = elementExtent(element);
          grow(object.position.x + ext.minX, object.position.y + ext.minY, object.position.x + ext.maxX, object.position.y + ext.maxY);
        } else if (object.item.kind === 'wire' && object.from && object.to) {
          grow(Math.min(object.from.x, object.to.x), Math.min(object.from.y, object.to.y), Math.max(object.from.x, object.to.x), Math.max(object.from.y, object.to.y));
        }
      }
      const delta = Number.isFinite(group.minX)
        ? clampDeltaToSheet({ x: sheetPoint.x - drag.start.x, y: sheetPoint.y - drag.start.y }, group, schema.sheet)
        : { x: 0, y: 0 };
      for (const object of drag.objects) {
        if (object.item.kind === 'element' && object.position) {
          const element = schema.elements.find((candidate) => candidate.id === object.item.id);
          if (element) element.position = { x: object.position.x + delta.x, y: object.position.y + delta.y };
        } else if (object.item.kind === 'wire' && object.from && object.to) {
          const wire = schema.wires.find((candidate) => candidate.id === object.item.id);
          if (wire) {
            wire.from = { x: object.from.x + delta.x, y: object.from.y + delta.y };
            wire.to = { x: object.to.x + delta.x, y: object.to.y + delta.y };
          }
        }
      }
      deps.scheduleMovePreview();
    } else if (drag.mode === 'resize') {
      const wire = schema.wires.find((candidate) => candidate.id === drag.wireId);
      if (wire) wire[drag.end] = clampPointToSheet(sheetPoint, schema.sheet);
      deps.renderSchema();
    } else {
      drag.current = sheetPoint;
      deps.renderSchema();
    }
  });
}

export interface CanvasPointerEndSetup {
  svg: SVGSVGElement; viewSize(): Point; viewport(): Viewport; drag(): DragState | undefined;
  setDrag(value: DragState | undefined): void; dragSnapshot(): Schema | undefined;
  setDragSnapshot(value: Schema | undefined): void; selected: Map<string, Selectable>;
  cancelMovePreview(): void; commitSchema(before: Schema): void; renderSchema(): void;
}

export function setupCanvasPointerEnd(ctx: AppContext, deps: CanvasPointerEndSetup): (event: PointerEvent) => void {
  return (event) => {
    const drag = deps.drag();
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.mode === 'marquee') {
      const end = screenToSheet(svgPoint(event, deps.svg, deps.viewSize()), deps.viewport());
      const threshold = 4 / deps.viewport().scale;
      if (Math.hypot(end.x - drag.start.x, end.y - drag.start.y) > threshold) {
        updateMarqueeSelection(ctx.schema, deps.selected, normalizedBounds(drag.start, drag.current), drag.additive);
      }
    }
    deps.cancelMovePreview();
    const snapshot = deps.dragSnapshot();
    if (snapshot) deps.commitSchema(snapshot);
    deps.setDragSnapshot(undefined); deps.setDrag(undefined);
    deps.svg.classList.remove('is-panning'); deps.renderSchema();
    if (deps.svg.hasPointerCapture(event.pointerId)) deps.svg.releasePointerCapture(event.pointerId);
  };
}
