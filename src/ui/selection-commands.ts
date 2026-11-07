import type { SchemaElement, WireSegment } from '@model/types';
import { buildTerminals } from '@model/geometry';
import { getCadType } from '@model/cad-types';
import type { AppContext } from './context';
import type { Point } from './viewport';
import type { Selectable } from './constants';
import { clampDeltaToSheet, clampElementPosition, clampPointToSheet, elementExtent } from './bounds';
import { cloneSchema, selectionKey } from './helpers';
import { screenToSheet, snapPointToGrid } from './viewport';
import { CAD_GRID_STEP } from './constants';

export interface SelectionClipboard { elements: SchemaElement[]; wires: WireSegment[]; anchor: Point }
export interface SelectionCommandsSetup {
  selected: Map<string, Selectable>; clipboard(): SelectionClipboard | undefined;
  setClipboard(value: SelectionClipboard | undefined): void; status: HTMLElement;
  simulationMode(): 'edit' | 'run'; pointer(): Point | undefined; viewSize(): Point;
  viewport(): { offsetX: number; offsetY: number; scale: number };
  updateHistoryButtons(): void; commitSchema(before: ReturnType<typeof cloneSchema>): void; renderSchema(): void;
  placementType(): number | undefined; placementRotation(): 0 | 1 | 2 | 3;
  setPlacementRotation(value: 0 | 1 | 2 | 3): void; drawGhost(): void;
}

export function setupSelectionCommands(ctx: AppContext, deps: SelectionCommandsSetup) {
  const copySelection = (): void => {
    const { schema } = ctx;
    const elements = [...deps.selected.values()]
      .filter((item) => item.kind === 'element')
      .map((item) => schema.elements.find((element) => element.id === item.id))
      .filter((element): element is SchemaElement => Boolean(element && element.typeCode !== 20000));
    const wires = [...deps.selected.values()]
      .filter((item) => item.kind === 'wire')
      .map((item) => schema.wires.find((wire) => wire.id === item.id))
      .filter((wire): wire is WireSegment => Boolean(wire));
    if (!elements.length && !wires.length) return;
    const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    const include = (x: number, y: number): void => {
      bounds.minX = Math.min(bounds.minX, x); bounds.minY = Math.min(bounds.minY, y);
      bounds.maxX = Math.max(bounds.maxX, x); bounds.maxY = Math.max(bounds.maxY, y);
    };
    for (const element of elements) {
      const extent = elementExtent(element);
      include(element.position.x + Math.min(extent.minX, element.labelOffset.x), element.position.y + Math.min(extent.minY, element.labelOffset.y));
      include(element.position.x + extent.maxX, element.position.y + extent.maxY);
    }
    for (const wire of wires) { include(wire.from.x, wire.from.y); include(wire.to.x, wire.to.y); }
    deps.setClipboard({ elements: structuredClone(elements), wires: structuredClone(wires), anchor: { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 } });
    deps.updateHistoryButtons();
    deps.status.textContent = `Скопировано объектов: ${elements.length + wires.length}. Наведите курсор и нажмите Ctrl+V.`;
  };

  const pasteSelection = (): void => {
    const clipboard = deps.clipboard();
    if (!clipboard) return;
    if (deps.simulationMode() !== 'edit') { deps.status.textContent = 'Остановите симуляцию перед вставкой объектов.'; return; }
    const { schema } = ctx;
    const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    const include = (x: number, y: number): void => {
      bounds.minX = Math.min(bounds.minX, x); bounds.minY = Math.min(bounds.minY, y);
      bounds.maxX = Math.max(bounds.maxX, x); bounds.maxY = Math.max(bounds.maxY, y);
    };
    for (const element of clipboard.elements) {
      const extent = elementExtent(element);
      include(element.position.x + Math.min(extent.minX, element.labelOffset.x), element.position.y + Math.min(extent.minY, element.labelOffset.y));
      include(element.position.x + extent.maxX, element.position.y + extent.maxY);
    }
    for (const wire of clipboard.wires) { include(wire.from.x, wire.from.y); include(wire.to.x, wire.to.y); }
    if (bounds.maxX - bounds.minX > schema.sheet.width || bounds.maxY - bounds.minY > schema.sheet.height) {
      deps.status.textContent = 'Выделенные объекты не помещаются на этот лист.'; return;
    }
    const size = deps.viewSize();
    const pointer = deps.pointer() ?? screenToSheet({ x: size.x / 2, y: size.y / 2 }, deps.viewport());
    const target = clampPointToSheet(snapPointToGrid(pointer, 3), schema.sheet);
    const delta = clampDeltaToSheet({ x: target.x - clipboard.anchor.x, y: target.y - clipboard.anchor.y }, bounds, schema.sheet);
    const before = cloneSchema(schema);
    let id = Math.max(0, ...schema.elements.map((element) => element.id), ...schema.wires.map((wire) => wire.id)) + 1;
    const pastedElements = structuredClone(clipboard.elements).map((element) => {
      element.id = id++; element.position = { x: element.position.x + delta.x, y: element.position.y + delta.y }; return element;
    });
    const pastedWires = structuredClone(clipboard.wires).map((wire) => {
      wire.id = id++; wire.from = { x: wire.from.x + delta.x, y: wire.from.y + delta.y }; wire.to = { x: wire.to.x + delta.x, y: wire.to.y + delta.y }; return wire;
    });
    schema.elements.push(...pastedElements); schema.wires.push(...pastedWires); deps.selected.clear();
    for (const element of pastedElements) { const item: Selectable = { kind: 'element', id: element.id }; deps.selected.set(selectionKey(item), item); }
    for (const wire of pastedWires) { const item: Selectable = { kind: 'wire', id: wire.id }; deps.selected.set(selectionKey(item), item); }
    deps.commitSchema(before); deps.renderSchema();
    deps.status.textContent = `Вставлено объектов: ${pastedElements.length + pastedWires.length}.`;
  };

  const deleteSelected = (): void => {
    if (!deps.selected.size) return;
    const { schema } = ctx; const before = cloneSchema(schema);
    const elementIds = new Set([...deps.selected.values()].filter((item) => item.kind === 'element').map((item) => item.id));
    const wireIds = new Set([...deps.selected.values()].filter((item) => item.kind === 'wire').map((item) => item.id));
    schema.elements = schema.elements.filter((element) => !elementIds.has(element.id));
    schema.wires = schema.wires.filter((wire) => !wireIds.has(wire.id));
    deps.selected.clear(); deps.commitSchema(before); deps.renderSchema();
    deps.status.textContent = 'Выбранные объекты удалены.';
  };
  const rotateSelection = (): void => {
    const placementType = deps.placementType();
    if (placementType !== undefined) {
      const rotation = ((deps.placementRotation() + 1) % 4) as 0 | 1 | 2 | 3;
      deps.setPlacementRotation(rotation); deps.drawGhost();
      deps.status.textContent = `Размещение: ${getCadType(placementType).label} · поворот ${rotation * 90}° · щёлкните по листу или Esc.`;
      return;
    }
    const { schema } = ctx; const before = cloneSchema(schema);
    for (const item of deps.selected.values()) {
      if (item.kind !== 'element') continue;
      const element = schema.elements.find((candidate) => candidate.id === item.id);
      if (!element) continue;
      element.rotation = ((element.rotation + 1) % 4) as 0 | 1 | 2 | 3;
      element.size = { w: element.size.h, h: element.size.w };
      element.terminals = buildTerminals(getCadType(element.typeCode), element.terminals.length, element.size, element.rotation, element.terminals.map((terminal) => terminal.label));
      element.position = clampElementPosition(element.position, element, schema.sheet);
    }
    deps.commitSchema(before); deps.renderSchema();
  };
  const nudgeSelection = (dx: number, dy: number): void => {
    if (!deps.selected.size || deps.simulationMode() !== 'edit') return;
    const { schema } = ctx;
    const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    const include = (x: number, y: number): void => {
      bounds.minX = Math.min(bounds.minX, x); bounds.minY = Math.min(bounds.minY, y);
      bounds.maxX = Math.max(bounds.maxX, x); bounds.maxY = Math.max(bounds.maxY, y);
    };
    for (const item of deps.selected.values()) {
      if (item.kind === 'element') {
        const element = schema.elements.find((candidate) => candidate.id === item.id); if (!element) continue;
        const extent = elementExtent(element);
        include(element.position.x + Math.min(extent.minX, element.labelOffset.x), element.position.y + Math.min(extent.minY, element.labelOffset.y));
        include(element.position.x + extent.maxX, element.position.y + extent.maxY);
      } else {
        const wire = schema.wires.find((candidate) => candidate.id === item.id); if (!wire) continue;
        include(wire.from.x, wire.from.y); include(wire.to.x, wire.to.y);
      }
    }
    if (!Number.isFinite(bounds.minX)) return;
    const delta = clampDeltaToSheet({ x: dx, y: dy }, bounds, schema.sheet, CAD_GRID_STEP);
    if (!delta.x && !delta.y) return;
    const before = cloneSchema(schema);
    for (const item of deps.selected.values()) {
      if (item.kind === 'element') {
        const element = schema.elements.find((candidate) => candidate.id === item.id);
        if (element) element.position = { x: element.position.x + delta.x, y: element.position.y + delta.y };
      } else {
        const wire = schema.wires.find((candidate) => candidate.id === item.id);
        if (wire) {
          wire.from = { x: wire.from.x + delta.x, y: wire.from.y + delta.y };
          wire.to = { x: wire.to.x + delta.x, y: wire.to.y + delta.y };
        }
      }
    }
    deps.commitSchema(before); deps.renderSchema();
  };
  return { copySelection, pasteSelection, deleteSelected, rotateSelection, nudgeSelection };
}
