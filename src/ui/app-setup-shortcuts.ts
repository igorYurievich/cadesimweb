import { canRedo, canUndo, redoHistory, undoHistory } from './history';
import { setupKeyboardShortcuts } from './keyboard-shortcuts';
import type { AppSetupBase } from './app-setup-base';
import type { AppSetupEditor } from './app-setup-editor';
import type { AppSetupCommands } from './app-setup-commands';

function undoAction(state: AppSetupBase, editor: AppSetupEditor, redo: boolean): void {
  if (redo) {
    if (canRedo(state.history)) editor.restoreHistory(redoHistory(state.history));
    return;
  }
  if (state.wireDrawing && state.draftPoints.length) {
    state.draftPoints.pop();
    state.draftCursor = undefined;
    editor.routePreference.clearDecision();
    editor.drawDraft();
    editor.updateHistoryButtons();
  } else if (canUndo(state.history)) {
    editor.restoreHistory(undoHistory(state.history));
  }
}

function cancelPlacement(state: AppSetupBase): void {
  state.placementType = undefined;
  state.placementRotation = 0;
  state.activePaletteCommand = undefined;
  state.renderPalette();
  if (state.placeTypeSelect) state.placeTypeSelect.value = '';
  state.elements.svg.classList.remove('is-placing');
  state.elements.status.textContent = 'Режим размещения завершён.';
}

function cancelWireDrawing(state: AppSetupBase, editor: AppSetupEditor): void {
  if (!state.draftPoints.length) {
    state.cancelWireDrawing();
    return;
  }
  state.draftPoints = [];
  state.draftCursor = undefined;
  editor.routePreference.clearDecision();
  editor.drawDraft();
  editor.updateHistoryButtons();
}

export function setupAppKeyboardShortcuts(
  state: AppSetupBase,
  editor: AppSetupEditor,
  commands: AppSetupCommands,
): void {
  setupKeyboardShortcuts({
    root: state.root,
    simulationContextMenu: state.elements.simulationContextMenu,
    fileInput: state.elements.fileInput,
    spaceDown: (value) => { state.spaceDown = value; },
    panTool: () => state.panTool,
    setPanTool: state.setPanTool,
    nodeTool: () => state.nodeTool,
    setNodeTool: state.setNodeTool,
    selectTool: state.selectTool,
    copySelection: commands.selection.copySelection,
    cutSelection: commands.selection.cutSelection,
    pasteSelection: commands.selection.pasteSelection,
    saveJson: commands.exportActions.saveJson,
    requestNewSchema: editor.createDocumentTab,
    undo: (redo) => undoAction(state, editor, redo),
    wireDrawing: () => state.wireDrawing,
    changeWireRoute: (key) => {
      if (key === 'Tab') editor.routePreference.toggleCorner();
      else editor.routePreference.flipBundle();
      editor.drawDraft();
    },
    toggleWireDrawing: state.toggleWireDrawing,
    cycleWireKind: commands.cycleWireKind,
    finishWireDrawing: state.finishWireDrawing,
    cancelPlacement: () => cancelPlacement(state),
    cancelWireDrawing: () => cancelWireDrawing(state, editor),
    placing: () => state.placementType !== undefined,
    selectedCount: () => state.selected.size,
    clearSelection: () => {
      state.selected.clear();
      state.renderSchema();
    },
    deleteSelected: commands.selection.deleteSelected,
    rotateSelection: commands.selection.rotateSelection,
    nudgeSelection: commands.selection.nudgeSelection,
  });
}
