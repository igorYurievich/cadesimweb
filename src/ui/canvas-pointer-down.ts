import { POSITION_SPECS, nextPosition } from '@engine/behaviors';
import type { AppContext } from './context';
import type { Point } from './viewport';
import type { DragState, Selectable, StampKey } from './constants';
import { armedByDefaultTypes, latchedTypes } from './constants';
import type { SimulationController } from './sim-controller';
import { clampPointToSheet } from './bounds';
import { cloneSchema, createPlacedElement, selectionKey } from './helpers';
import { screenToSheet } from './viewport';
import { snapDrawingPoint } from './wire-routing';
import { svgPoint } from './canvas-primitives';
import { getSelectionHit, selectedObjects } from './selection';

export interface CanvasPointerDownSetup {
  svg: SVGSVGElement; viewSize(): Point; viewport(): import('./viewport').Viewport;
  setPointerSheetPosition(value: Point): void; nodeTool(): boolean; panTool(): boolean; spaceDown(): boolean;
  simulation: SimulationController; placeNodeAt(point: Point): void; wireDrawing(): boolean;
  draftPoints(): Point[]; setDraftCursor(value: Point | undefined): void; drawDraft(): void;
  updateHistoryButtons(): void; finishWireDrawing(): void; status: HTMLElement;
  placementType(): number | undefined; setPlacementType(value: number | undefined): void;
  placementRotation(): 0 | 1 | 2 | 3; setPlacementRotation(value: 0 | 1 | 2 | 3): void;
  selected: Map<string, Selectable>; commitSchema(before: ReturnType<typeof cloneSchema>): void;
  clearActivePaletteCommand(): void; renderPalette(): void;
  placeTypeSelect: HTMLSelectElement | null; renderSchema(): void; setDrag(value: DragState | undefined): void;
  drag(): DragState | undefined;
  setDragSnapshot(value: ReturnType<typeof cloneSchema> | undefined): void;
  openStampEditor(key: StampKey): void;
}

export function setupCanvasPointerDown(ctx: AppContext, deps: CanvasPointerDownSetup): void {
  deps.svg.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 && event.button !== 1) return;
    const draftPoints = deps.draftPoints();
    deps.svg.focus({ preventScroll: true });
    const screen = svgPoint(event, deps.svg, deps.viewSize());
    const pointerSheetPosition = screenToSheet(screen, deps.viewport());
    deps.setPointerSheetPosition(pointerSheetPosition);
    if (deps.nodeTool() && event.button === 0 && !deps.spaceDown() && deps.simulation.mode === 'edit') {
      deps.placeNodeAt(pointerSheetPosition); event.preventDefault(); return;
    }
    const stampKey = (event.target as Element).closest?.('[data-stamp-field]')?.getAttribute('data-stamp-field');
    if (stampKey && event.button === 0 && !deps.panTool() && !deps.wireDrawing() && deps.placementType() === undefined) {
      event.preventDefault(); setTimeout(() => deps.openStampEditor(stampKey as StampKey), 0); return;
    }
    if (deps.panTool() && event.button === 0) {
      deps.setDrag({ mode: 'pan', pointerId: event.pointerId, last: screen });
      deps.svg.classList.add('is-panning'); deps.svg.setPointerCapture(event.pointerId);
      event.preventDefault(); return;
    }
    if (event.button === 0 && deps.wireDrawing()) {
      const { schema } = ctx;
      const raw = clampPointToSheet(screenToSheet(screen, deps.viewport()), schema.sheet);
      const snapped = clampPointToSheet(snapDrawingPoint(raw, schema).point, schema.sheet);
      const previous = draftPoints[draftPoints.length - 1];
      if (!previous) draftPoints.push(snapped);
      else if (previous.x !== snapped.x || previous.y !== snapped.y) {
        draftPoints.push(snapped);
        if (!event.shiftKey) { deps.finishWireDrawing(); event.preventDefault(); return; }
      }
      deps.setDraftCursor(undefined); deps.drawDraft(); deps.updateHistoryButtons();
      if (draftPoints.length === 1) deps.status.textContent = 'Начало задано. Кликните там, где провод должен закончиться (Shift+клик — излом).';
      event.preventDefault(); return;
    }
    const placementType = deps.placementType();
    if (event.button === 0 && placementType !== undefined) {
      const { schema } = ctx; const before = cloneSchema(schema);
      const element = createPlacedElement(placementType, screenToSheet(screen, deps.viewport()), deps.placementRotation(), schema);
      schema.elements.push(element);
      const item: Selectable = { kind: 'element', id: element.id };
      deps.selected.clear(); deps.selected.set(selectionKey(item), item); deps.commitSchema(before);
      deps.setPlacementType(undefined); deps.setPlacementRotation(0); deps.clearActivePaletteCommand(); deps.renderPalette();
      if (deps.placeTypeSelect) deps.placeTypeSelect.value = '';
      deps.svg.classList.remove('is-placing'); deps.renderSchema();
      deps.status.textContent = `Добавлен ${element.name}.`; event.preventDefault(); return;
    }
    if (event.button === 0 && deps.simulation.mode !== 'edit') {
      const hit = getSelectionHit(event.target); const { schema } = ctx;
      if (hit?.kind === 'element') {
        const element = schema.elements.find((candidate) => candidate.id === hit.id);
        if (element && deps.simulation.isMomentaryType(element.typeCode)) {
          deps.simulation.pressMomentary(element.id); deps.svg.setPointerCapture(event.pointerId); event.preventDefault(); return;
        }
        if (element && POSITION_SPECS[element.typeCode]) {
          const positions = (deps.simulation.inputs.positions ??= {});
          const next = nextPosition(element.typeCode, positions[element.id]); positions[element.id] = next;
          if (element.name.trim() !== '') for (const twin of schema.elements) {
            if (twin.id !== element.id && twin.typeCode === element.typeCode && twin.name === element.name) positions[twin.id] = next;
          }
          deps.simulation.applySimulationInput(); event.preventDefault(); return;
        }
        if (element && deps.simulation.isMaintainedType(element.typeCode)) {
          const next = !(deps.simulation.inputs.toggled[element.id] ?? false); deps.simulation.inputs.toggled[element.id] = next;
          if (element.name.trim() !== '') for (const twin of schema.elements) {
            if (twin.id !== element.id && twin.typeCode === element.typeCode && twin.name === element.name) deps.simulation.inputs.toggled[twin.id] = next;
          }
          deps.simulation.applySimulationInput(); event.preventDefault(); return;
        }
        if (element && latchedTypes.has(element.typeCode)) {
          const next = !(deps.simulation.inputs.toggled[element.id] ?? armedByDefaultTypes.has(element.typeCode));
          deps.simulation.inputs.toggled[element.id] = next;
          if (element.name.trim() !== '') for (const twin of schema.elements) {
            if (twin.id !== element.id && twin.typeCode === element.typeCode && twin.name === element.name) deps.simulation.inputs.toggled[twin.id] = next;
          }
          deps.simulation.applySimulationInput(); event.preventDefault(); return;
        }
      }
    }
    // During simulation, left-clicks may operate simulation inputs but must not start editing or dragging schematic objects.
    if (event.button === 0 && deps.simulation.mode !== 'edit' && !deps.spaceDown()) {
      event.preventDefault(); return;
    }
    if (event.button === 1 || deps.spaceDown()) {
      deps.setDrag({ mode: 'pan', pointerId: event.pointerId, last: screen });
      deps.svg.classList.add('is-panning'); event.preventDefault();
    } else {
      const { schema } = ctx;
      const target = event.target instanceof Element ? event.target : null;
      const toggleSelection = event.ctrlKey || event.metaKey;
      const endpoint = target?.closest<SVGCircleElement>('[data-wire-end]');
      const sheetPoint = screenToSheet(screen, deps.viewport());
      if (endpoint) {
        const wireId = Number(endpoint.dataset.wireEnd); const end = endpoint.dataset.end as 'from' | 'to';
        const wire = schema.wires.find((candidate) => candidate.id === wireId);
        if (wire) {
          const item: Selectable = { kind: 'wire', id: wireId };
          if (toggleSelection) {
            const key = selectionKey(item);
            if (deps.selected.has(key)) deps.selected.delete(key); else deps.selected.set(key, item);
            deps.renderSchema(); event.preventDefault(); return;
          }
          if (!deps.selected.has(selectionKey(item))) { deps.selected.clear(); deps.selected.set(selectionKey(item), item); }
          deps.setDragSnapshot(cloneSchema(schema));
          deps.setDrag({ mode: 'resize', pointerId: event.pointerId, wireId, end, original: { ...wire[end] } });
          deps.renderSchema();
        }
      } else {
        const hit = getSelectionHit(event.target);
        if (hit) {
          const key = selectionKey(hit);
          if (toggleSelection) {
            if (deps.selected.has(key)) deps.selected.delete(key); else deps.selected.set(key, hit);
            deps.renderSchema(); event.preventDefault(); return;
          }
          if (event.shiftKey) { if (deps.selected.has(key)) deps.selected.delete(key); else deps.selected.set(key, hit); }
          else if (!deps.selected.has(key)) { deps.selected.clear(); deps.selected.set(key, hit); }
          deps.renderSchema();
          if (deps.selected.has(key)) {
            deps.setDragSnapshot(cloneSchema(schema));
            deps.setDrag({ mode: 'move', pointerId: event.pointerId, start: sheetPoint, objects: selectedObjects(schema, deps.selected) });
          }
        } else {
          const additive = event.shiftKey || toggleSelection;
          if (!additive) deps.selected.clear();
          deps.setDrag({ mode: 'marquee', pointerId: event.pointerId, start: sheetPoint, current: sheetPoint, additive });
          deps.renderSchema();
        }
      }
    }
    if (deps.drag()) deps.svg.setPointerCapture(event.pointerId);
  });
}
