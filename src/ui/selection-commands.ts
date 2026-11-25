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
import { pageOfX, pageOrigin } from '@model/program-pages';
import { cadTypeForCommand } from '@model/cad-types';
import { catalog } from '@model/catalog';
import { terminalPosition } from '@model/geometry';
import { currentPage } from './program-pages-view';
import { currentText, fillText } from './i18n';

/** Типы панели Ladder: контакты, катушки, блоки, шины «+» / «−» (кнопки catalog 'ladder'). */
const LADDER_TYPES: ReadonlySet<number> = new Set(catalog.inGroup('ladder')
  .map((item) => cadTypeForCommand(item.id)?.code).filter((code): code is number => code !== undefined));

/**
 * Из скопированного — только Ladder: его элементы и провода, связанные с их клеммами (по цепочке проводов).
 * Провода, которые идут только к другим аппаратам, отбрасываются.
 */
function ladderOnly(clipboard: SelectionClipboard): SelectionClipboard {
  // Шины «+» / «−» (3008 / 3009) стоят и на силовой схеме: берём только те, к которым по проводам приходят
  // контакты, катушки и блоки Ladder.
  const RAILS = new Set([3008, 3009]);
  const core = clipboard.elements.filter((element) => LADDER_TYPES.has(element.typeCode) && !RAILS.has(element.typeCode));
  const key = (p: Point): string => `${p.x},${p.y}`;
  const reached = new Set<string>();
  for (const element of core) {
    element.terminals.forEach((_, index) => { const p = terminalPosition(element, index); if (p) reached.add(key(p)); });
  }
  const wires: WireSegment[] = [];
  let pending = [...clipboard.wires];
  for (let grew = true; grew;) {
    grew = false;
    const rest: WireSegment[] = [];
    for (const wire of pending) {
      if (reached.has(key(wire.from)) || reached.has(key(wire.to))) {
        wires.push(wire); reached.add(key(wire.from)); reached.add(key(wire.to)); grew = true;
      } else rest.push(wire);
    }
    pending = rest;
  }
  const kept = new Set(wires.map((wire) => wire.id));
  const rails = clipboard.elements.filter((element) => RAILS.has(element.typeCode)
    && element.terminals.some((_, index) => { const p = terminalPosition(element, index); return p !== undefined && reached.has(key(p)); }));
  const ids = new Set([...core, ...rails].map((element) => element.id));
  return {
    elements: clipboard.elements.filter((element) => ids.has(element.id)),
    wires: clipboard.wires.filter((wire) => kept.has(wire.id)),
    anchor: clipboard.anchor,
  };
}

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
  const copySelection = (): boolean => {
    const { schema } = ctx;
    const elements = [...deps.selected.values()]
      .filter((item) => item.kind === 'element')
      .map((item) => schema.elements.find((element) => element.id === item.id))
      .filter((element): element is SchemaElement => Boolean(element && element.typeCode !== 20000));
    const wires = [...deps.selected.values()]
      .filter((item) => item.kind === 'wire')
      .map((item) => schema.wires.find((wire) => wire.id === item.id))
      .filter((wire): wire is WireSegment => Boolean(wire));
    if (!elements.length && !wires.length) return false;
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
    deps.status.textContent = fillText(currentText().copied, { count: elements.length + wires.length });
    return true;
  };

  const pasteSelection = (): void => {
    const copied = deps.clipboard();
    if (!copied) return;
    if (deps.simulationMode() !== 'edit') { deps.status.textContent = currentText().stopBeforePaste; return; }
    const { schema } = ctx;
    // Вставляем на лист, который сейчас на экране (основной или лист программы ПЛК, program-pages.ts).
    const size = deps.viewSize();
    const page = currentPage(schema, deps.viewport(), size);
    // На лист программы — только Ladder: контакты, катушки, блоки, шины «+» / «−» и провода между ними.
    const clipboard = page >= 1 ? ladderOnly(copied) : copied;
    const skipped = copied.elements.length + copied.wires.length - clipboard.elements.length - clipboard.wires.length;
    if (!clipboard.elements.length) {
      deps.status.textContent = currentText().pasteLadderOnly;
      return;
    }
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
      deps.status.textContent = currentText().pasteNoRoom; return;
    }
    // Курсор с другого листа (например, после перехода кнопкой) не годится — тогда в центр вида.
    const lastPointer = deps.pointer();
    const pointer = lastPointer && pageOfX(lastPointer.x) === page
      ? lastPointer : screenToSheet({ x: size.x / 2, y: size.y / 2 }, deps.viewport());
    const target = clampPointToSheet(snapPointToGrid(pointer, 3), schema.sheet);
    // С другого листа: сначала переносим группу на этот лист целиком, потом ограничиваем его полем.
    const anchor = page >= 1 && clipboard !== copied
      ? { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 } : clipboard.anchor;
    const shiftX = pageOrigin(page) - pageOrigin(pageOfX(bounds.minX));
    const shifted = { ...bounds, minX: bounds.minX + shiftX, maxX: bounds.maxX + shiftX };
    const inPage = clampDeltaToSheet({ x: target.x - anchor.x - shiftX, y: target.y - anchor.y }, shifted, schema.sheet);
    const delta = { x: inPage.x + shiftX, y: inPage.y };
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
    const t = currentText();
    deps.status.textContent = fillText(t.pasted, { count: pastedElements.length + pastedWires.length })
      + (skipped > 0 ? ` ${fillText(t.pasteSkipped, { count: skipped })}` : '');
  };

  const deleteSelected = (): void => {
    if (!deps.selected.size) return;
    const { schema } = ctx; const before = cloneSchema(schema);
    const elementIds = new Set([...deps.selected.values()].filter((item) => item.kind === 'element').map((item) => item.id));
    const wireIds = new Set([...deps.selected.values()].filter((item) => item.kind === 'wire').map((item) => item.id));
    schema.elements = schema.elements.filter((element) => !elementIds.has(element.id));
    schema.wires = schema.wires.filter((wire) => !wireIds.has(wire.id));
    deps.selected.clear(); deps.commitSchema(before); deps.renderSchema();
    deps.status.textContent = currentText().selectionDeleted;
  };
  const cutSelection = (): void => {
    if (deps.simulationMode() !== 'edit') { deps.status.textContent = currentText().stopBeforeCut; return; }
    if (!copySelection()) return;
    const clipboard = deps.clipboard();
    if (!clipboard) return;
    const { schema } = ctx; const before = cloneSchema(schema);
    const elementIds = new Set(clipboard.elements.map((element) => element.id));
    const wireIds = new Set(clipboard.wires.map((wire) => wire.id));
    schema.elements = schema.elements.filter((element) => !elementIds.has(element.id));
    schema.wires = schema.wires.filter((wire) => !wireIds.has(wire.id));
    for (const item of [...deps.selected.values()]) {
      if ((item.kind === 'element' && elementIds.has(item.id)) || (item.kind === 'wire' && wireIds.has(item.id))) {
        deps.selected.delete(selectionKey(item));
      }
    }
    deps.commitSchema(before); deps.renderSchema();
    deps.status.textContent = currentText().selectionCut;
  };
  const rotateSelection = (): void => {
    const placementType = deps.placementType();
    if (placementType !== undefined) {
      const rotation = ((deps.placementRotation() + 1) % 4) as 0 | 1 | 2 | 3;
      deps.setPlacementRotation(rotation); deps.drawGhost();
      const name = getCadType(placementType).label;
      deps.status.textContent = fillText(currentText().placingRotated, { name, angle: rotation * 90 });
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
  return { copySelection, cutSelection, pasteSelection, deleteSelected, rotateSelection, nudgeSelection };
}
