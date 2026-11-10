import { setupAppDocumentTabs } from './documents';
import { setupPalette } from './palette';
import { setupEditorView } from './editor-view';
import { createWireEditorCommands } from './wire-editor-commands';
import { createWireRoutePreference } from './wire-route-preference';
import { buildBundleRoutes, routeHitsComponent, routeInsideSheet } from './wire-planner';
import type { Point } from './viewport';
import type { AppSetupBase } from './app-setup-base';

type EditorView = ReturnType<typeof setupEditorView>;

function setupEditorViewStage(state: AppSetupBase) {
  const routePreference = createWireRoutePreference();
  const planBundleRoutes = (points: readonly Point[]) => buildBundleRoutes(
    points,
    state.elements.wireKindSelect.value,
    state.schema,
    routePreference.verticalFirst(),
    routePreference.bundleFlipped(),
  );
  const insideSheet = (route: readonly Point[]): boolean => routeInsideSheet(route, state.schema);
  const hitsComponent = (route: readonly Point[]): boolean => routeHitsComponent(
    route,
    state.schema,
    state.elements.elementLayer,
  );
  const editorView = setupEditorView({
    ctx: state.ctx,
    root: state.root,
    elements: state.elements,
    selected: state.selected,
    clipboardAvailable: () => state.clipboard !== undefined,
    wireDrawing: () => state.wireDrawing,
    draftPoints: () => state.draftPoints,
    draftCursor: () => state.draftCursor,
    uiText: state.uiText,
    simulation: state.simulation,
    propertySnapshot: () => state.propertySnapshot,
    setPropertySnapshot: (value) => { state.propertySnapshot = value; },
    viewport: () => state.viewport,
    viewSize: () => state.viewSize,
    scheduleViewportSave: state.scheduleViewportSave,
    planBundleRoutes,
    wireThickness: () => Number(state.elements.wireThicknessSelect.value),
    placementType: () => state.placementType,
    placementRotation: () => state.placementRotation,
    drag: () => state.drag,
    persistSchema: state.persistSchema,
  });
  state.renderSchema = editorView.renderSchema;
  return { editorView, routePreference, planBundleRoutes, insideSheet, hitsComponent };
}

function setupDocumentTabs(state: AppSetupBase, editorView: EditorView) {
  const { updateHistoryButtons, drawViewport } = editorView;
  const documentTabs = setupAppDocumentTabs({
    state: state.documentState,
    tabBar: state.documentTabBar,
    elements: {
      fileInput: state.elements.fileInput,
      fileName: state.elements.fileName,
      status: state.elements.status,
    },
    schemaState: {
      schema: () => state.schema,
      setSchema: (value) => { state.schema = value; },
      setHistory: (value) => { state.history = value; },
      setViewport: (value) => { state.viewport = value; },
      viewSize: () => state.viewSize,
    },
    uiText: state.uiText,
    persistence: {
      syncCurrentDocument: state.syncCurrentDocument,
      persistDocuments: state.persistDocuments,
      persistSchemaNow: state.persistSchemaNow,
    },
    simulation: {
      stopSimulation: state.simulation.stopSimulation,
      resetSimulation: state.simulation.resetSimulation,
    },
    editor: {
      clearSelection: () => state.selected.clear(),
      clearEditorTools: () => {
        state.placementType = undefined;
        state.placementRotation = 0;
        state.activePaletteCommand = undefined;
        state.wireDrawing = false;
        state.draftPoints = [];
        state.draftCursor = undefined;
        if (state.placeTypeSelect) state.placeTypeSelect.value = '';
        state.elements.svg.classList.remove('is-placing', 'is-drawing-wire');
      },
      renderSchema: state.renderSchema,
      drawViewport,
      updateHistoryButtons,
      translateInterface: state.translateInterface,
    },
  });
  return documentTabs.createDocumentTab;
}

function setupPaletteStage(state: AppSetupBase, editorView: EditorView): void {
  const drawGhost = editorView.draw;
  const { renderProperties } = editorView;
  const { renderPalette } = setupPalette(state.ctx, {
    search: state.elements.paletteSearch,
    language: state.elements.paletteLanguage,
    count: state.elements.paletteCount,
    groups: state.elements.paletteGroups,
    svg: state.elements.svg,
    status: state.elements.status,
    paletteLang: () => state.paletteLang,
    setPaletteLang: (value) => { state.paletteLang = value; },
    visibleOptionalGroups: state.appSettings.visibleOptionalGroups,
    activePaletteCommand: () => state.activePaletteCommand,
    setActivePaletteCommand: (value) => { state.activePaletteCommand = value; },
    setPlacement: (value) => { state.placementType = value; },
    resetPlacementRotation: () => { state.placementRotation = 0; },
    uiText: state.uiText,
    leaveNodeTool: state.leaveNodeTool,
    isWireDrawing: () => state.wireDrawing,
    cancelWireDrawing: () => state.cancelWireDrawing(),
    drawGhost,
    translateInterface: state.translateInterface,
    renderProperties,
  });
  state.renderPalette = renderPalette;
  renderPalette();
}

function setupWireCommands(
  state: AppSetupBase,
  editorView: EditorView,
  routing: ReturnType<typeof setupEditorViewStage>,
): void {
  const wireCommands = createWireEditorCommands({
    ctx: state.ctx,
    svg: state.elements.svg,
    status: state.elements.status,
    wireKindSelect: state.elements.wireKindSelect,
    wireThicknessSelect: state.elements.wireThicknessSelect,
    selected: state.selected,
    isDrawing: () => state.wireDrawing,
    setDrawing: (value) => { state.wireDrawing = value; },
    points: () => state.draftPoints,
    setPoints: (value) => { state.draftPoints = value; },
    setCursor: (value) => { state.draftCursor = value; },
    resetRoutePreference: routing.routePreference.reset,
    flipBundle: routing.routePreference.flipBundle,
    buildRoutes: routing.planBundleRoutes,
    isInsideSheet: routing.insideSheet,
    hitsComponent: routing.hitsComponent,
    leaveNodeTool: state.leaveNodeTool,
    clearPlacement: () => {
      state.placementType = undefined;
      state.placementRotation = 0;
      const select = state.root.querySelector<HTMLSelectElement>('#place-type');
      if (select) select.value = '';
    },
    renderSchema: state.renderSchema,
    drawDraft: editorView.drawDraft,
    updateHistoryButtons: editorView.updateHistoryButtons,
    commitSchema: editorView.commitSchema,
  });
  state.cancelWireDrawing = wireCommands.cancel;
  state.toggleWireDrawing = wireCommands.toggle;
  state.finishWireDrawing = wireCommands.finish;
}

export function setupAppEditor(state: AppSetupBase) {
  const routing = setupEditorViewStage(state);
  const createDocumentTab = setupDocumentTabs(state, routing.editorView);
  setupPaletteStage(state, routing.editorView);
  setupWireCommands(state, routing.editorView, routing);
  return {
    ...routing,
    ...routing.editorView,
    ghostLayer: routing.editorView.layer,
    drawGhost: routing.editorView.draw,
    moveGhost: routing.editorView.move,
    openStampEditor: routing.editorView.stampEditor.open,
    createDocumentTab,
  };
}

export type AppSetupEditor = ReturnType<typeof setupAppEditor>;
