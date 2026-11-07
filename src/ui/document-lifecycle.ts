import { createEmptySchema } from '@model/index';
import type { AppContext } from './context';
import { createHistory } from './history';
import type { Point, Viewport } from './viewport';
import { fitViewport } from './viewport';
import type { Selectable } from './constants';
import { cloneSchema, fullSheet } from './helpers';
import type { SimulationController } from './sim-controller';

export interface DocumentLifecycleSetup {
  selected: Map<string, Selectable>; simulation: SimulationController;
  setPlacementType(value: number | undefined): void; clearActivePaletteCommand(): void;
  setPlacementRotation(value: 0 | 1 | 2 | 3): void; setWireDrawing(value: boolean): void;
  clearDraft(): void; placeTypeSelect: HTMLSelectElement | null; fileInput: HTMLInputElement;
  fileName: HTMLElement; status: HTMLElement; persistSchemaNow(): void;
  viewport(): Viewport; setViewport(value: Viewport): void; viewSize(): Point;
  drawViewport(): void; renderSchema(): void; confirmNewDialog: HTMLDialogElement | null;
}

export function setupDocumentLifecycle(ctx: AppContext, deps: DocumentLifecycleSetup) {
  const resetSchema = (): void => {
    ctx.schema = createEmptySchema(); ctx.history = createHistory(cloneSchema(ctx.schema)); deps.selected.clear();
    deps.simulation.resetSimulation();
    deps.setPlacementType(undefined); deps.clearActivePaletteCommand(); deps.setPlacementRotation(0);
    deps.setWireDrawing(false); deps.clearDraft();
    if (deps.placeTypeSelect) deps.placeTypeSelect.value = '';
    deps.fileInput.value = ''; deps.fileName.textContent = 'Новая схема';
    deps.status.removeAttribute('title'); deps.status.textContent = 'Новая схема создана.';
    deps.persistSchemaNow();
    const size = deps.viewSize();
    deps.setViewport(fitViewport(fullSheet(ctx.schema.sheet), { width: size.x, height: size.y }));
    deps.drawViewport(); deps.renderSchema();
  };
  const requestNewSchema = (): void => {
    const schema = ctx.schema;
    const hasContent = Boolean(schema.sheet.fileName || schema.elements.length || schema.wires.length);
    if (hasContent) deps.confirmNewDialog?.showModal(); else resetSchema();
  };
  return { resetSchema, requestNewSchema };
}
