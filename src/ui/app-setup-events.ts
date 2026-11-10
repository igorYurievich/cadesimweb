import { setupCanvasInteractions } from './canvas-interactions';
import type { CanvasInteractionsOptions } from './canvas-interactions';
import { setupDocumentInputEvents, setupDocumentOpen } from './document-io';
import { setupViewportControls } from './viewport-controls';
import { setupAppKeyboardShortcuts } from './app-setup-shortcuts';
import type { AppSetupBase } from './app-setup-base';
import type { AppSetupEditor } from './app-setup-editor';
import type { AppSetupCommands } from './app-setup-commands';

function setupDocumentEvents(state: AppSetupBase, editor: AppSetupEditor): void {
  const openDocumentText = setupDocumentOpen(state.ctx, {
    svg: state.elements.svg,
    fileName: state.elements.fileName,
    status: state.elements.status,
    selected: state.selected,
    simulation: state.simulation,
    clearPlacement: () => {
      state.placementType = undefined;
      state.placementRotation = 0;
    },
    clearWireDrawing: () => {
      state.wireDrawing = false;
      state.draftPoints = [];
      state.draftCursor = undefined;
    },
    placeTypeSelect: state.placeTypeSelect,
    persistSchemaNow: state.persistSchemaNow,
    viewSize: () => state.viewSize,
    setViewport: (value) => { state.viewport = value; },
    drawViewport: editor.drawViewport,
    renderSchema: state.renderSchema,
    beforeOpenDocument: (name) => editor.createDocumentTab(name),
  });
  setupDocumentInputEvents(
    state.root,
    state.elements.fileInput,
    openDocumentText,
    state.simulation.stopSimulation,
  );
}

function createCanvasOptions(
  state: AppSetupBase,
  editor: AppSetupEditor,
  commands: AppSetupCommands,
): CanvasInteractionsOptions {
  return {
    ctx: state.ctx,
    svg: state.elements.svg,
    viewSize: () => state.viewSize,
    viewport: () => state.viewport,
    setViewport: (value) => { state.viewport = value; },
    wireLayer: state.elements.wireLayer,
    elementLayer: state.elements.elementLayer,
    selectionLayer: state.elements.selectionLayer,
    setPointerSheetPosition: (value) => { state.pointerSheetPosition = value; },
    setDraftCursor: (value) => { state.draftCursor = value; },
    cursorCoords: state.elements.cursorCoords,
    nodeTool: () => state.nodeTool,
    panTool: () => state.panTool,
    spaceDown: () => state.spaceDown,
    simulation: state.simulation,
    placeNodeAt: commands.placeNodeAt,
    wireDrawing: () => state.wireDrawing,
    draftPoints: () => state.draftPoints,
    drawDraft: editor.drawDraft,
    updateHistoryButtons: editor.updateHistoryButtons,
    finishWireDrawing: state.finishWireDrawing,
    status: state.elements.status,
    placementType: () => state.placementType,
    setPlacementType: (value) => { state.placementType = value; },
    placementRotation: () => state.placementRotation,
    setPlacementRotation: (value) => { state.placementRotation = value; },
    selected: state.selected,
    commitSchema: editor.commitSchema,
    clearActivePaletteCommand: () => { state.activePaletteCommand = undefined; },
    renderPalette: state.renderPalette,
    placeTypeSelect: state.placeTypeSelect,
    renderSchema: state.renderSchema,
    drag: () => state.drag,
    setDrag: (value) => { state.drag = value; },
    dragSnapshot: () => state.dragSnapshot,
    setDragSnapshot: (value) => { state.dragSnapshot = value; },
    openStampEditor: editor.openStampEditor,
    drawNodeCursor: commands.drawNodeCursor,
    moveGhost: editor.moveGhost,
    drawViewport: editor.drawViewport,
    onElbowPreference: (value) => editor.routePreference.observePointer(
      value, state.wireDrawing, state.draftPoints,
    ),
    placing: () => state.placementType !== undefined,
    simulationMode: () => state.simulation.mode,
    openProperties: state.openFloatingProperties,
    activePaletteCommand: (value) => { state.activePaletteCommand = value; },
    setPlacementRotationForDrop: (value) => { state.placementRotation = value; },
    leaveNodeTool: state.leaveNodeTool,
    clearDraftCursor: () => { state.draftCursor = undefined; },
    cancelWireDrawing: state.cancelWireDrawing,
  };
}

function setupCanvasEvents(
  state: AppSetupBase,
  editor: AppSetupEditor,
  commands: AppSetupCommands,
): void {
  setupCanvasInteractions(createCanvasOptions(state, editor, commands));
}

function setupMomentaryInputRelease(state: AppSetupBase): void {
  const releaseAllMomentary = (): void => {
    for (const id of [...state.simulation.heldInputs]) state.simulation.releaseMomentary(id);
  };
  window.addEventListener('pointerup', releaseAllMomentary);
  window.addEventListener('pointercancel', releaseAllMomentary);
}

function setupViewportEvents(state: AppSetupBase, editor: AppSetupEditor): void {
  window.addEventListener('pagehide', state.persistSchemaNow);
  window.addEventListener('pagehide', state.saveViewportNow);
  setupViewportControls(state.ctx, {
    root: state.root,
    svg: state.elements.svg,
    backdrop: state.backdrop,
    viewSize: () => state.viewSize,
    setViewSize: (value) => { state.viewSize = value; },
    viewport: () => state.viewport,
    setViewport: (value) => { state.viewport = value; },
    drawViewport: editor.drawViewport,
  });
}

export function setupAppEvents(
  state: AppSetupBase,
  editor: AppSetupEditor,
  commands: AppSetupCommands,
): void {
  setupDocumentEvents(state, editor);
  setupCanvasEvents(state, editor, commands);
  setupMomentaryInputRelease(state);
  setupAppKeyboardShortcuts(state, editor, commands);
  setupViewportEvents(state, editor);
  state.renderSchema();
}
