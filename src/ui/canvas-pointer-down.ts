import { POSITION_SPECS, currentPosition, nextPosition } from '@engine/behaviors';
import { THERMAL_RELAY_TYPES } from '@engine/thermal';
import type { AppContext } from './context';
import type { Point } from './viewport';
import type { DragState, Selectable, StampKey } from './constants';
import { armedByDefaultTypes, latchedTypes } from './constants';
import { STAIR_TIMER_2D } from '@model/stair-timer';
import { VFD_MAX_HZ, isVfd2d, vfdSettings } from '@model/vfd';
import type { SimulationController } from './sim-controller';
import { clampPointToSheet } from './bounds';
import { cloneSchema, createPlacedElement, selectionKey } from './helpers';
import { screenToSheet } from './viewport';
import { snapDrawingPoint, straightenFromAnchor } from './wire-routing';
import { smartWireRouting } from './options-menu';
import { svgPoint } from './canvas-primitives';
import { getSelectionHit, selectedObjects } from './selection';
import { WIRE_HIT_PX, pickCanvasHit, pointInsideSymbolShape } from './wire-hit';
import { currentText, fillText } from './i18n';

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
      const previous = draftPoints[draftPoints.length - 1];
      const free = clampPointToSheet(snapDrawingPoint(raw, schema).point, schema.sheet);
      const snapped = smartWireRouting() ? free : straightenFromAnchor(free, previous);
      if (!previous) draftPoints.push(snapped);
      else if (previous.x !== snapped.x || previous.y !== snapped.y) {
        draftPoints.push(snapped);
        if (!event.shiftKey) { deps.finishWireDrawing(); event.preventDefault(); return; }
      }
      deps.setDraftCursor(undefined); deps.drawDraft(); deps.updateHistoryButtons();
      if (draftPoints.length === 1) deps.status.textContent = currentText().wireStartSet;
      event.preventDefault(); return;
    }
    const placementType = deps.placementType();
    if (event.button === 0 && placementType !== undefined) {
      const { schema } = ctx; const before = cloneSchema(schema);
      const element = createPlacedElement(placementType, screenToSheet(screen, deps.viewport()), deps.placementRotation(), schema);
      schema.elements.push(element);
      const item: Selectable = { kind: 'element', id: element.id };
      deps.selected.clear(); deps.selected.set(selectionKey(item), item); deps.commitSchema(before);
      // Режим размещения остаётся: тот же элемент можно ставить ещё раз, выход — Esc.
      deps.renderSchema();
      deps.status.textContent = fillText(currentText().elementAddedRepeat, { name: element.name });
      event.preventDefault(); return;
    }
    if (event.button === 0 && deps.simulation.mode !== 'edit') {
      const hit = getSelectionHit(event.target); const { schema } = ctx;
      if (hit?.kind === 'element') {
        const element = schema.elements.find((candidate) => candidate.id === hit.id);
        // Преобразователь частоты 2D: панель — RUN / STOP, ▲ / ▼ (±1 Гц), ручка (клик слева −5, справа +5 Гц).
        if (element && isVfd2d(element.typeCode)) {
          const keyNode = event.target instanceof Element ? event.target.closest<SVGGElement>('[data-vfd-key]') : null;
          const pressed = keyNode?.dataset.vfdKey;
          const step = (delta: number): void => {
            const hz = vfdSettings(element).aiHz;
            element.params.vfd_aiHz = Math.min(VFD_MAX_HZ, Math.max(0, Math.round((hz + delta) * 10) / 10));
          };
          if (pressed === 'run') deps.simulation.inputs.toggled[element.id] = true;
          else if (pressed === 'stop') deps.simulation.inputs.toggled[element.id] = false;
          else if (pressed === 'up') step(1);
          else if (pressed === 'down') step(-1);
          else if (pressed === 'rev') {
            // REV/JOG (однофазный 2D): смена направления пуска с панели; при ходе — разворот через ноль по рампе.
            const positions = (deps.simulation.inputs.positions ??= {});
            positions[element.id] = positions[element.id] === 1 ? 0 : 1;
          }
          else if (pressed === 'knob' && keyNode) {
            const box = keyNode.getBoundingClientRect();
            step(event.clientX < box.left + box.width / 2 ? -5 : 5);
          }
          if (pressed) deps.simulation.applySimulationInput();
          event.preventDefault(); return;
        }
        if (element && deps.simulation.isMomentaryType(element.typeCode)) {
          const deviceName = element.name.trim().toLocaleUpperCase();
          if (deviceName !== '') {
            const sameName = (candidate: typeof element): boolean => candidate.id !== element.id
              && candidate.name.trim().toLocaleUpperCase() === deviceName;
            const groupIsLatched = schema.elements.some((candidate) => {
              if (!sameName(candidate)) return false;
              const position = POSITION_SPECS[candidate.typeCode];
              return (deps.simulation.isMaintainedType(candidate.typeCode) && deps.simulation.inputs.toggled[candidate.id] === true)
                || (position !== undefined && (deps.simulation.inputs.positions?.[candidate.id] ?? position.rest) !== position.rest)
                || (THERMAL_RELAY_TYPES.has(candidate.typeCode) && (Boolean(deps.simulation.inputs.tripped[candidate.id]) || deps.simulation.inputs.toggled[candidate.id] === false))
                || ([8016, 8017, 8018, 8019].includes(candidate.typeCode) && Boolean(deps.simulation.inputs.tripped[candidate.id]));
            });
            if (groupIsLatched) {
              const positions = (deps.simulation.inputs.positions ??= {});
              for (const twin of schema.elements) {
                if (!sameName(twin)) continue;
                if (deps.simulation.isMaintainedType(twin.typeCode)) deps.simulation.inputs.toggled[twin.id] = false;
                const position = POSITION_SPECS[twin.typeCode];
                if (position) positions[twin.id] = position.rest;
                if (THERMAL_RELAY_TYPES.has(twin.typeCode)) {
                  delete deps.simulation.inputs.tripped[twin.id];
                  deps.simulation.inputs.toggled[twin.id] = true;
                }
                if ([8016, 8017, 8018, 8019].includes(twin.typeCode)) delete deps.simulation.inputs.tripped[twin.id];
              }
              deps.simulation.applySimulationInput();
            }
          }
          deps.simulation.pressMomentary(element.id); deps.svg.setPointerCapture(event.pointerId); event.preventDefault(); return;
        }
        if (element && POSITION_SPECS[element.typeCode]) {
          const positions = (deps.simulation.inputs.positions ??= {});
          const spec = POSITION_SPECS[element.typeCode]!;
          let current = currentPosition(element.typeCode, positions[element.id]);
          const deviceName = element.name.trim().toLocaleUpperCase();
          const groupOn = deviceName !== '' && schema.elements.some((twin) => {
            if (twin.id === element.id || twin.name.trim().toLocaleUpperCase() !== deviceName) return false;
            const twinSpec = POSITION_SPECS[twin.typeCode];
            return (deps.simulation.isMaintainedType(twin.typeCode) && Boolean(deps.simulation.inputs.toggled[twin.id]))
              || (twinSpec !== undefined && currentPosition(twin.typeCode, positions[twin.id]) !== twinSpec.rest);
          });
          if (current === spec.rest && groupOn) current = nextPosition(element.typeCode, spec.rest);
          const next = nextPosition(element.typeCode, current);
          if (deviceName !== '') for (const twin of schema.elements) {
            if (twin.id === element.id || twin.name.trim().toLocaleUpperCase() !== deviceName) continue;
            const twinSpec = POSITION_SPECS[twin.typeCode];
            if (twinSpec) positions[twin.id] = next === spec.rest ? twinSpec.rest : nextPosition(twin.typeCode, twinSpec.rest);
            if (deps.simulation.isMaintainedType(twin.typeCode)) deps.simulation.inputs.toggled[twin.id] = next !== spec.rest;
          }
          positions[element.id] = next;
          deps.simulation.applySimulationInput(); event.preventDefault(); return;
        }
        if (element && deps.simulation.isMaintainedType(element.typeCode)) {
          const next = !(deps.simulation.inputs.toggled[element.id] ?? false); deps.simulation.inputs.toggled[element.id] = next;
          const deviceName = element.name.trim().toLocaleUpperCase();
          if (deviceName !== '') for (const twin of schema.elements) {
            if (twin.id !== element.id && deps.simulation.isMaintainedType(twin.typeCode)
              && twin.name.trim().toLocaleUpperCase() === deviceName) deps.simulation.inputs.toggled[twin.id] = next;
          }
          deps.simulation.applySimulationInput(); event.preventDefault(); return;
        }
        // Минутник: постоянный свет переключает только синий движок, клик по корпусу ничего не делает.
        const onStairSlider = event.target instanceof Element && event.target.closest('.stair-slider') !== null;
        if (element?.typeCode === STAIR_TIMER_2D && !onStairSlider) { event.preventDefault(); return; }
        if (element && latchedTypes.has(element.typeCode)) {
          const next = !(deps.simulation.inputs.toggled[element.id] ?? armedByDefaultTypes.has(element.typeCode));
          deps.simulation.inputs.toggled[element.id] = next;
          if (element.name.trim() !== '') for (const twin of schema.elements) {
            if (twin.id !== element.id && twin.typeCode === element.typeCode
              && twin.name.trim().toLocaleUpperCase() === element.name.trim().toLocaleUpperCase()) deps.simulation.inputs.toggled[twin.id] = next;
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
        // Провод рядом с точкой клика важнее рамки захвата элемента (wire-hit.ts).
        const hit = pickCanvasHit(event.target, schema, sheetPoint, WIRE_HIT_PX / Math.max(deps.viewport().scale, 1e-6),
          pointInsideSymbolShape(event.target, event.clientX, event.clientY));
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
