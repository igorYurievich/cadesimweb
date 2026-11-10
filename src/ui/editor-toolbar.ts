import type { AppContext } from './context';
import { cloneSchema } from './helpers';
import { setupSimulationSpeedControl, type SimulationController } from './sim-controller';
import type { Selectable } from './constants';
import type { Point } from './viewport';

export interface EditorToolbarOptions {
  ctx: AppContext;
  wireKindSelect: HTMLSelectElement;
  wireThicknessSelect: HTMLSelectElement;
  drawWireButton: HTMLButtonElement;
  finishWireButton: HTMLButtonElement;
  undoButton: HTMLButtonElement;
  redoButton: HTMLButtonElement;
  runButton: HTMLButtonElement;
  stopButton: HTMLButtonElement;
  speedButton: HTMLButtonElement;
  selected: Map<string, Selectable>;
  wireDrawing: () => boolean;
  draftPoints: () => Point[];
  undoDraftPoint: () => void;
  drawDraft: () => void;
  updateHistoryButtons: () => void;
  toggleWireDrawing: () => void;
  finishWireDrawing: () => void;
  cancelWireDrawing: () => void;
  nodeTool: () => boolean;
  leaveNodeTool: () => void;
  undo: () => void;
  redo: () => void;
  commitSchema: (before: ReturnType<typeof cloneSchema>) => void;
  renderSchema: () => void;
  simulation: SimulationController;
}

export function setupEditorToolbar(options: EditorToolbarOptions): (direction: -1 | 1) => void {
  const cycleWireKind = (direction: -1 | 1): void => {
    const choices = [...options.wireKindSelect.options].filter((option) => !option.disabled);
    if (!choices.length) return;
    const current = choices.findIndex((option) => option.value === options.wireKindSelect.value);
    const next = (current + direction + choices.length) % choices.length;
    options.wireKindSelect.value = choices[next]!.value;
    options.wireKindSelect.dispatchEvent(new Event('change', { bubbles: true }));
  };
  options.drawWireButton.addEventListener('click', options.toggleWireDrawing);
  options.finishWireButton.addEventListener('click', options.finishWireDrawing);
  options.wireKindSelect.addEventListener('change', () => {
    if (options.wireDrawing()) options.drawDraft();
  });
  options.wireThicknessSelect.addEventListener('change', () => {
    const thickness = Number(options.wireThicknessSelect.value);
    if (!Number.isInteger(thickness) || thickness < 1 || thickness > 4) return;
    const selectedWires = [...options.selected.values()]
      .filter((item) => item.kind === 'wire')
      .map((item) => options.ctx.schema.wires.find((wire) => wire.id === item.id))
      .filter((wire): wire is NonNullable<typeof wire> => wire !== undefined && wire.kind !== 'junction');
    if (selectedWires.length) {
      const before = cloneSchema(options.ctx.schema);
      for (const wire of selectedWires) wire.thickness = thickness;
      options.commitSchema(before);
      options.renderSchema();
    }
    if (options.wireDrawing()) options.drawDraft();
  });
  options.undoButton.addEventListener('click', () => {
    if (options.wireDrawing() && options.draftPoints().length) {
      options.undoDraftPoint();
      options.drawDraft();
      options.updateHistoryButtons();
      return;
    }
    options.undo();
  });
  options.redoButton.addEventListener('click', options.redo);
  options.runButton.addEventListener('click', () => {
    if (options.wireDrawing()) options.cancelWireDrawing();
    if (options.nodeTool()) options.leaveNodeTool();
    options.simulation.startSimulation();
  });
  options.stopButton.addEventListener('click', options.simulation.stopSimulation);
  setupSimulationSpeedControl(options.speedButton, options.simulation);
  options.simulation.updateSimulationControls();
  return cycleWireKind;
}
