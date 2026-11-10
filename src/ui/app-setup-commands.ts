import { canRedo, canUndo, redoHistory, undoHistory } from './history';
import { setupAppDialogs } from './app-dialogs';
import { setupAppMenus } from './app-menus';
import { setupEditorToolbar } from './editor-toolbar';
import { setupPlacementEvents } from './placement-events';
import { setupSelectionCommands } from './selection-commands';
import { setupNodeTool as setupNodeToolController } from './node-tool';
import type { AppSetupBase } from './app-setup-base';
import type { AppSetupEditor } from './app-setup-editor';

function setupSelection(state: AppSetupBase, editor: AppSetupEditor) {
  return setupSelectionCommands(state.ctx, {
    selected: state.selected,
    clipboard: () => state.clipboard,
    setClipboard: (value) => { state.clipboard = value; },
    status: state.elements.status,
    simulationMode: () => state.simulation.mode,
    pointer: () => state.pointerSheetPosition,
    viewSize: () => state.viewSize,
    viewport: () => state.viewport,
    updateHistoryButtons: editor.editorView.updateHistoryButtons,
    commitSchema: editor.editorView.commitSchema,
    renderSchema: state.renderSchema,
    placementType: () => state.placementType,
    placementRotation: () => state.placementRotation,
    setPlacementRotation: (value) => { state.placementRotation = value; },
    drawGhost: editor.drawGhost,
  });
}

function setupPlacement(state: AppSetupBase, editor: AppSetupEditor): void {
  state.placeTypeSelect = state.root.querySelector<HTMLSelectElement>('#place-type');
  setupPlacementEvents({
    select: state.placeTypeSelect,
    svg: state.elements.svg,
    status: state.elements.status,
    leaveNodeTool: state.leaveNodeTool,
    wireDrawing: () => state.wireDrawing,
    cancelWireDrawing: state.cancelWireDrawing,
    clearActivePaletteCommand: () => { state.activePaletteCommand = undefined; },
    setPlacementType: (value) => { state.placementType = value; },
    setPlacementRotation: (value) => { state.placementRotation = value; },
    drawGhost: editor.drawGhost,
  });
}

function setupDialogs(state: AppSetupBase): void {
  setupAppDialogs(
    state.ctx,
    state.elements.svg,
    state.elements.simulationContextMenu,
    state.elements.overloadAction,
    state.elements.resetInputsAction,
    state.simulation,
  );
}

function setupMenus(state: AppSetupBase, editor: AppSetupEditor, selection: ReturnType<typeof setupSelection>) {
  return setupAppMenus({
    ctx: state.ctx,
    root: state.root,
    svg: state.elements.svg,
    status: state.elements.status,
    fileInput: state.elements.fileInput,
    undoButton: state.elements.undoButton,
    redoButton: state.elements.redoButton,
    requestNewSchema: editor.createDocumentTab,
    copySelection: selection.copySelection,
    cutSelection: selection.cutSelection,
    pasteSelection: selection.pasteSelection,
    rotateSelection: selection.rotateSelection,
    deleteSelected: selection.deleteSelected,
    toggleTheme: state.toggleTheme,
    toggleGrid: state.toggleGrid,
    toggleDockedProperties: state.toggleDockedProperties,
    toggleWireColors: state.toggleWireColors,
    commitSchema: editor.editorView.commitSchema,
    renderSchema: state.renderSchema,
    setViewport: (value) => { state.viewport = value; },
    viewSize: state.viewSize,
    drawViewport: editor.editorView.drawViewport,
  });
}

function setupToolButtons(state: AppSetupBase): void {
  state.elements.panToolButton?.addEventListener('click', () => state.setPanTool(!state.panTool));
  state.elements.selectToolButton?.addEventListener('click', state.selectTool);
  state.elements.nodeToolButton?.addEventListener('click', () => state.setNodeTool(!state.nodeTool));
}

function createNodeTool(state: AppSetupBase, editor: AppSetupEditor) {
  return setupNodeToolController(state.ctx, {
    layer: editor.editorView.layer,
    active: () => state.nodeTool,
    wireDrawing: () => state.wireDrawing,
    status: state.elements.status,
    commitSchema: editor.editorView.commitSchema,
    renderSchema: state.renderSchema,
  });
}

function setupToolbar(state: AppSetupBase, editor: AppSetupEditor): (direction: -1 | 1) => void {
  return setupEditorToolbar({
    ctx: state.ctx,
    wireKindSelect: state.elements.wireKindSelect,
    wireThicknessSelect: state.elements.wireThicknessSelect,
    drawWireButton: state.elements.drawWireButton,
    finishWireButton: state.elements.finishWireButton,
    undoButton: state.elements.undoButton,
    redoButton: state.elements.redoButton,
    runButton: state.elements.runButton,
    stopButton: state.elements.stopButton,
    speedButton: state.elements.speedButton,
    selected: state.selected,
    wireDrawing: () => state.wireDrawing,
    draftPoints: () => state.draftPoints,
    undoDraftPoint: () => {
      state.draftPoints.pop();
      state.draftCursor = undefined;
    },
    drawDraft: editor.editorView.drawDraft,
    updateHistoryButtons: editor.editorView.updateHistoryButtons,
    toggleWireDrawing: state.toggleWireDrawing,
    finishWireDrawing: state.finishWireDrawing,
    selectTool: state.selectTool,
    undo: () => {
      if (canUndo(state.history)) editor.editorView.restoreHistory(undoHistory(state.history));
    },
    redo: () => {
      if (canRedo(state.history)) editor.editorView.restoreHistory(redoHistory(state.history));
    },
    commitSchema: editor.editorView.commitSchema,
    renderSchema: state.renderSchema,
    simulation: state.simulation,
  });
}

export function setupAppCommands(state: AppSetupBase, editor: AppSetupEditor) {
  const selection = setupSelection(state, editor);
  setupPlacement(state, editor);
  setupDialogs(state);
  const exportActions = setupMenus(state, editor, selection);
  setupToolButtons(state);
  const nodeTool = createNodeTool(state, editor);
  const cycleWireKind = setupToolbar(state, editor);
  editor.editorView.drawViewport();
  return { selection, exportActions, ...nodeTool, cycleWireKind };
}

export type AppSetupCommands = ReturnType<typeof setupAppCommands>;

