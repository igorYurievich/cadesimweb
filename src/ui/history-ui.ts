import type { Schema } from '@model/types';
import type { AppContext } from './context';
import type { Selectable } from './constants';
import { canRedo, canUndo, commitHistory } from './history';
import { cloneSchema } from './helpers';
import type { SimulationController } from './sim-controller';

export interface HistoryUiSetup {
  root: HTMLElement; undoButton: HTMLButtonElement; redoButton: HTMLButtonElement;
  drawWireButton: HTMLButtonElement; finishWireButton: HTMLButtonElement;
  selected: Map<string, Selectable>; clipboardAvailable(): boolean; wireDrawing(): boolean;
  draftLength(): number; uiText(): { cancel: string; wire: string };
  simulation: SimulationController; renderSchema(): void;
}

export function setupHistoryUi(ctx: AppContext, deps: HistoryUiSetup) {
  const updateHistoryButtons = (): void => {
    deps.undoButton.disabled = !canUndo(ctx.history) && !(deps.wireDrawing() && deps.draftLength() > 0);
    deps.redoButton.disabled = !canRedo(ctx.history);
    const undoMenu = deps.root.querySelector<HTMLButtonElement>('[data-command="undo"]');
    const redoMenu = deps.root.querySelector<HTMLButtonElement>('[data-command="redo"]');
    if (undoMenu) undoMenu.disabled = deps.undoButton.disabled;
    if (redoMenu) redoMenu.disabled = deps.redoButton.disabled;
    const copyMenu = deps.root.querySelector<HTMLButtonElement>('[data-command="copy-selection"]');
    const cutMenu = deps.root.querySelector<HTMLButtonElement>('[data-command="cut-selection"]');
    const pasteMenu = deps.root.querySelector<HTMLButtonElement>('[data-command="paste-selection"]');
    if (copyMenu) copyMenu.disabled = deps.selected.size === 0;
    if (cutMenu) cutMenu.disabled = deps.selected.size === 0;
    if (pasteMenu) pasteMenu.disabled = !deps.clipboardAvailable();
    deps.drawWireButton.textContent = deps.wireDrawing() ? deps.uiText().cancel : deps.uiText().wire;
    deps.finishWireButton.disabled = !deps.wireDrawing() || deps.draftLength() < 2;
  };
  const commitSchema = (before: Schema): void => {
    const next = cloneSchema(ctx.schema);
    if (JSON.stringify(before) !== JSON.stringify(next)) {
      ctx.history = commitHistory(ctx.history, next);
      deps.simulation.resetSimulation();
    }
    updateHistoryButtons();
  };
  const restoreHistory = (nextHistory: typeof ctx.history): void => {
    ctx.history = nextHistory; ctx.schema = cloneSchema(ctx.history.present);
    deps.simulation.resetSimulation(); deps.selected.clear(); deps.renderSchema();
  };
  return { updateHistoryButtons, commitSchema, restoreHistory };
}
