import type { Lang } from '@model/catalog';
import { createEmptySchema } from '@model/index';
import type { Schema, SchemaElement, WireSegment } from '@model/types';
import { canRedo, canUndo, createHistory, redoHistory, undoHistory } from './history';
import { renderAppShell } from './app-shell';
import { queryAppElements } from './app-elements';
import { readAppSettings, readInterfaceLanguage } from './settings';
import { createPersistenceController, createViewportPersistenceController, readAutosavedSchema, readSavedDocuments } from './persistence';
import { initializeCanvasViewport } from './canvas-viewport';
import { createDocumentState, renderDocumentTabs, setupAppDocumentTabs, syncActiveDocument } from './documents';
import type { DocumentState } from './documents';
import { createAppContext } from './context';
import { setupAppDialogs } from './app-dialogs';
import { setupAppMenus } from './app-menus';
import { setupSimulation } from './sim-controller';
import { setupEditorToolbar } from './editor-toolbar';
import { setupPlacementEvents } from './placement-events';
import { setupPalette } from './palette';
import { setupPropertiesPanel } from './properties';
import { setupEditorView } from './editor-view';

import { setupSelectionCommands } from './selection-commands';
import { setupCanvasInteractions } from './canvas-interactions';
import { setupViewportControls } from './viewport-controls';
import { setupDocumentOpen, setupDocumentInputEvents } from './document-io';
import { setupNodeTool } from './node-tool';
import { setupToolModes } from './tool-modes';
import { setupAppInterface } from './app-interface';
import { setupKeyboardShortcuts } from './keyboard-shortcuts';
import type { Point, Viewport } from './viewport';
import { buildBundleRoutes, routeHitsComponent, routeInsideSheet } from './wire-planner';
import { createWireEditorCommands } from './wire-editor-commands';
import { createWireRoutePreference } from './wire-route-preference';
import './viewport.css';
import type { Selectable, DragState } from './constants';
import { cloneSchema } from './helpers';
import { INTERFACE_TEXT } from './i18n';

























/** Mount the SVG viewer for a CADe SIMU sheet. */
export function mountApp(root: HTMLElement): void {
  const savedDocuments = readSavedDocuments();
  const autosavedSchema = readAutosavedSchema();
  let schema: Schema = savedDocuments?.tabs.find((tab) => tab.id === savedDocuments.activeId)?.schema ?? autosavedSchema ?? createEmptySchema();
  let history = createHistory(cloneSchema(schema));
  const ctx = createAppContext(root, () => schema, (next) => { schema = next; }, () => history, (next) => { history = next; });
  const appSettings = readAppSettings();
  renderAppShell(root, appSettings.theme);

  const { applyPropertiesPanel, openFloatingProperties, toggleDockedProperties } = setupPropertiesPanel(ctx, () => uiText());

  const elements = queryAppElements(root);
  const {
    svg, wireLayer, elementLayer, selectionLayer,
    zoomValue, cursorCoords, status, fileName, fileInput, wireKindSelect, wireThicknessSelect,
    drawWireButton, panToolButton, nodeToolButton, selectToolButton, finishWireButton,
    undoButton, redoButton, paletteGroups, paletteSearch, paletteLanguage, paletteCount,
    runButton, stopButton, simStateValue, speedButton, simulationMessage,
    simulationMessageText, simulationContextMenu, overloadAction, resetInputsAction,
  } = elements;
  fileName.textContent = schema.sheet.fileName || 'Новая схема';
  if (autosavedSchema) status.textContent = 'Автосохранённая схема восстановлена.';
  svg.setAttribute('tabindex', '0');

  const canvasViewport = initializeCanvasViewport(svg, schema);
  let viewSize: Point = canvasViewport.viewSize;
  let viewport: Viewport = canvasViewport.viewport;
  const { backdrop } = canvasViewport;
  const documentState: DocumentState = createDocumentState(savedDocuments, schema, history, viewport, viewSize);
  const documentTabBar = root.querySelector<HTMLElement>('#document-tabs');
  const viewportPersistence = createViewportPersistenceController(() => viewSize, () => viewport);
  const { saveNow: saveViewportNow, schedule: scheduleViewportSave } = viewportPersistence;
  let pointerSheetPosition: Point | undefined;
  let drag: DragState | undefined;
  let spaceDown = false;
  /** Инструмент «Рука»: левая кнопка мыши только двигает лист, элементы и провода не трогаются. */
  let panTool = false;
  /** Инструмент «Узел»: клик по месту соединения проводов ставит точку соединения. */
  let nodeTool = false;
  const { leaveNodeTool, setPanTool, selectTool, setNodeTool } = setupToolModes({ svg, panButton: panToolButton, nodeButton: nodeToolButton, selectButton: selectToolButton, panTool: () => panTool, setPanToolState: (value) => { panTool = value; }, nodeTool: () => nodeTool, setNodeToolState: (value) => { nodeTool = value; }, status, wireDrawing: () => wireDrawing, cancelWireDrawing: () => cancelWireDrawing(), placementType: () => placementType, setPlacementType: (value) => { placementType = value; }, setPlacementRotation: (value) => { placementRotation = value; }, clearActivePaletteCommand: () => { activePaletteCommand = undefined; }, renderPalette: () => renderPalette(), placeTypeSelect: () => placeTypeSelect });
  const selected = new Map<string, Selectable>();
  let clipboard: { elements: SchemaElement[]; wires: WireSegment[]; anchor: Point } | undefined;
  let placementType: number | undefined;
  let activePaletteCommand: number | undefined;
  let paletteLang: Lang = readInterfaceLanguage();
  let placementRotation: 0 | 1 | 2 | 3 = 0;
  let wireDrawing = false;
  const uiText = (): typeof INTERFACE_TEXT.ru => INTERFACE_TEXT[paletteLang] as typeof INTERFACE_TEXT.ru;
  const syncCurrentDocument = (): void => syncActiveDocument(documentState, schema, history, viewport, uiText().new);
  const persistence = createPersistenceController({
    schema: () => schema,
    activeDocumentId: () => documentState.activeDocumentId,
    documents: () => documentState.documents,
    syncCurrentDocument,
    renderDocuments: () => renderDocumentTabs(documentState, documentTabBar, uiText()),
  });
  const { persistSchema, persistSchemaNow, persistDocuments } = persistence;

  let draftPoints: Point[] = [];
  let draftCursor: Point | undefined;
  let dragSnapshot: Schema | undefined;
  let propertySnapshot: Schema | undefined;
  let renderSchema = (): void => undefined;
  const simulation = setupSimulation(ctx, {
    wireLayer, elementLayer, simulationMessage, simulationMessageText, runButton, stopButton, simStateValue, simulationContextMenu, overloadAction, status,
    uiText: () => uiText(), renderSchema: () => renderSchema(), uniformWireColors: () => appSettings.uniformWireColors,
    clearSelection: () => { selected.clear(); renderSchema(); },
  });
  const { translateInterface, toggleTheme, toggleGrid, toggleWireColors } = setupAppInterface({
    root,
    settings: appSettings,
    uiText,
    simulation,
    wireDrawing: () => wireDrawing,
    speedButton,
    applyPropertiesPanel,
    paletteSearch,
    paletteLanguage,
    paletteLang: () => paletteLang,
    zoomValue,
    schema: () => schema,
    fileName,
  });

  const routePreference = createWireRoutePreference();
  const planBundleRoutes = (points: readonly Point[]) =>
    buildBundleRoutes(points, wireKindSelect.value, schema, routePreference.verticalFirst(), routePreference.bundleFlipped());
  const insideSheet = (route: readonly Point[]): boolean => routeInsideSheet(route, schema);
  const hitsComponent = (route: readonly Point[]): boolean => routeHitsComponent(route, schema, elementLayer);
  const editorView = setupEditorView({
    ctx, root, elements, selected,
    clipboardAvailable: () => clipboard !== undefined,
    wireDrawing: () => wireDrawing,
    draftPoints: () => draftPoints,
    draftCursor: () => draftCursor,
    uiText,
    simulation,
    propertySnapshot: () => propertySnapshot,
    setPropertySnapshot: (value) => { propertySnapshot = value; },
    viewport: () => viewport,
    viewSize: () => viewSize,
    scheduleViewportSave,
    planBundleRoutes,
    wireThickness: () => Number(wireThicknessSelect.value),
    placementType: () => placementType,
    placementRotation: () => placementRotation,
    drag: () => drag,
    persistSchema,
  });
  const { updateHistoryButtons, commitSchema, restoreHistory, renderProperties, stampEditor,
    drawViewport, drawDraft, layer: ghostLayer, draw: drawGhost, move: moveGhost } = editorView;
  const { open: openStampEditor } = stampEditor;
  renderSchema = editorView.renderSchema;
  const { createDocumentTab } = setupAppDocumentTabs({
    state: documentState,
    tabBar: documentTabBar,
    elements: { fileInput, fileName, status },
    schemaState: {
      schema: () => schema,
      setSchema: (value) => { schema = value; },
      setHistory: (value) => { history = value; },
      setViewport: (value) => { viewport = value; },
      viewSize: () => viewSize,
    },
    uiText,
    persistence: { syncCurrentDocument, persistDocuments, persistSchemaNow },
    simulation: { stopSimulation: simulation.stopSimulation, resetSimulation: simulation.resetSimulation },
    editor: {
      clearSelection: () => selected.clear(),
      clearEditorTools: () => {
        placementType = undefined;
        placementRotation = 0;
        activePaletteCommand = undefined;
        wireDrawing = false;
        draftPoints = [];
        draftCursor = undefined;
        if (placeTypeSelect) placeTypeSelect.value = '';
        svg.classList.remove('is-placing', 'is-drawing-wire');
      },
      renderSchema,
      drawViewport,
      updateHistoryButtons,
      translateInterface,
    },
  });
  const { renderPalette } = setupPalette(ctx, {
    search: paletteSearch, language: paletteLanguage, count: paletteCount, groups: paletteGroups, svg, status,
    paletteLang: () => paletteLang, setPaletteLang: (value) => { paletteLang = value; }, visibleOptionalGroups: appSettings.visibleOptionalGroups,
    activePaletteCommand: () => activePaletteCommand, setActivePaletteCommand: (value) => { activePaletteCommand = value; },
    setPlacement: (value) => { placementType = value; }, resetPlacementRotation: () => { placementRotation = 0; },
    uiText: () => uiText(), leaveNodeTool, isWireDrawing: () => wireDrawing, cancelWireDrawing: () => cancelWireDrawing(),
    drawGhost, translateInterface, renderProperties,
  });
  renderPalette();

  const wireCommands = createWireEditorCommands({
    ctx, svg, status, wireKindSelect, wireThicknessSelect, selected,
    isDrawing: () => wireDrawing,
    setDrawing: (value) => { wireDrawing = value; },
    points: () => draftPoints,
    setPoints: (value) => { draftPoints = value; },
    setCursor: (value) => { draftCursor = value; },
    resetRoutePreference: routePreference.reset,
    flipBundle: routePreference.flipBundle,
    buildRoutes: planBundleRoutes,
    isInsideSheet: insideSheet,
    hitsComponent,
    leaveNodeTool,
    clearPlacement: () => {
      placementType = undefined;
      placementRotation = 0;
      const placeSelect = root.querySelector<HTMLSelectElement>('#place-type');
      if (placeSelect) placeSelect.value = '';
    },
    renderSchema: () => renderSchema(),
    drawDraft,
    updateHistoryButtons,
    commitSchema,
  });
  const { cancel: cancelWireDrawing, toggle: toggleWireDrawing, finish: finishWireDrawing } = wireCommands;

  const { copySelection, cutSelection, pasteSelection, deleteSelected, rotateSelection, nudgeSelection } = setupSelectionCommands(ctx, { selected, clipboard: () => clipboard, setClipboard: (value) => { clipboard = value; }, status, simulationMode: () => simulation.mode, pointer: () => pointerSheetPosition, viewSize: () => viewSize, viewport: () => viewport, updateHistoryButtons, commitSchema, renderSchema, placementType: () => placementType, placementRotation: () => placementRotation, setPlacementRotation: (value) => { placementRotation = value; }, drawGhost });

  const placeTypeSelect = root.querySelector<HTMLSelectElement>('#place-type');
  setupPlacementEvents({
    select: placeTypeSelect,
    svg,
    status,
    leaveNodeTool,
    wireDrawing: () => wireDrawing,
    cancelWireDrawing,
    clearActivePaletteCommand: () => { activePaletteCommand = undefined; },
    setPlacementType: (value) => { placementType = value; },
    setPlacementRotation: (value) => { placementRotation = value; },
    drawGhost,
  });
  setupAppDialogs(ctx, svg, simulationContextMenu, overloadAction, resetInputsAction, simulation);
  const exportActions = setupAppMenus({
    ctx, root, svg, status, fileInput, undoButton, redoButton,
    requestNewSchema: createDocumentTab,
    copySelection, cutSelection, pasteSelection, rotateSelection, deleteSelected,
    toggleTheme, toggleGrid, toggleDockedProperties, toggleWireColors,
    commitSchema, renderSchema,
    setViewport: (value) => { viewport = value; },
    viewSize,
    drawViewport,
  });
  panToolButton?.addEventListener('click', () => setPanTool(!panTool));
  selectToolButton?.addEventListener('click', selectTool);
  nodeToolButton?.addEventListener('click', () => setNodeTool(!nodeTool));
  /** Точка (x, y) лежит на отрезке провода (включая концы). */
  const { drawNodeCursor, placeNodeAt } = setupNodeTool(ctx, { layer: ghostLayer, active: () => nodeTool, wireDrawing: () => wireDrawing, status, commitSchema, renderSchema });
  const cycleWireKind = setupEditorToolbar({
    ctx, wireKindSelect, wireThicknessSelect, drawWireButton, finishWireButton,
    undoButton, redoButton, runButton, stopButton, speedButton, selected,
    wireDrawing: () => wireDrawing,
    draftPoints: () => draftPoints,
    undoDraftPoint: () => { draftPoints.pop(); draftCursor = undefined; },
    drawDraft,
    updateHistoryButtons,
    toggleWireDrawing,
    finishWireDrawing,
    cancelWireDrawing,
    nodeTool: () => nodeTool,
    leaveNodeTool,
    undo: () => { if (canUndo(history)) restoreHistory(undoHistory(history)); },
    redo: () => { if (canRedo(history)) restoreHistory(redoHistory(history)); },
    commitSchema,
    renderSchema,
    simulation,
  });
  drawViewport();

  const openDocumentText = setupDocumentOpen(ctx, { svg, fileName, status, selected, simulation, clearPlacement: () => { placementType = undefined; placementRotation = 0; }, clearWireDrawing: () => { wireDrawing = false; draftPoints = []; draftCursor = undefined; }, placeTypeSelect, persistSchemaNow, viewSize: () => viewSize, setViewport: (value) => { viewport = value; }, drawViewport, renderSchema, beforeOpenDocument: (name) => createDocumentTab(name) });
  setupDocumentInputEvents(root, fileInput, openDocumentText, simulation.stopSimulation);

  setupCanvasInteractions({
    ctx, svg, viewSize: () => viewSize, viewport: () => viewport,
    setViewport: (value) => { viewport = value; }, wireLayer, elementLayer, selectionLayer,
    setPointerSheetPosition: (value) => { pointerSheetPosition = value; },
    setDraftCursor: (value) => { draftCursor = value; }, cursorCoords,
    nodeTool: () => nodeTool, panTool: () => panTool, spaceDown: () => spaceDown,
    simulation, placeNodeAt, wireDrawing: () => wireDrawing,
    draftPoints: () => draftPoints, drawDraft, updateHistoryButtons, finishWireDrawing, status,
    placementType: () => placementType,
    setPlacementType: (value) => { placementType = value; },
    placementRotation: () => placementRotation,
    setPlacementRotation: (value) => { placementRotation = value; },
    selected, commitSchema,
    clearActivePaletteCommand: () => { activePaletteCommand = undefined; },
    renderPalette, placeTypeSelect, renderSchema,
    drag: () => drag, setDrag: (value) => { drag = value; },
    dragSnapshot: () => dragSnapshot, setDragSnapshot: (value) => { dragSnapshot = value; },
    openStampEditor, drawNodeCursor, moveGhost, drawViewport,
    onElbowPreference: (value) => routePreference.observePointer(value, wireDrawing, draftPoints),
    placing: () => placementType !== undefined,
    simulationMode: () => simulation.mode,
    openProperties: openFloatingProperties,
    activePaletteCommand: (value) => { activePaletteCommand = value; },
    setPlacementRotationForDrop: (value) => { placementRotation = value; },
    leaveNodeTool,
    clearDraftCursor: () => { draftCursor = undefined; },
    cancelWireDrawing,
  });
  const releaseAllMomentary = (): void => { for (const id of [...simulation.heldInputs]) simulation.releaseMomentary(id); };
  window.addEventListener('pointerup', releaseAllMomentary);
  window.addEventListener('pointercancel', releaseAllMomentary);
  setupKeyboardShortcuts({ root, simulationContextMenu, fileInput, spaceDown: (value) => { spaceDown = value; }, panTool: () => panTool, setPanTool, nodeTool: () => nodeTool, setNodeTool, selectTool, copySelection, cutSelection, pasteSelection, saveJson: exportActions.saveJson, requestNewSchema: createDocumentTab, undo: (redo) => { if (redo) { if (canRedo(history)) restoreHistory(redoHistory(history)); } else if (wireDrawing && draftPoints.length) { draftPoints.pop(); draftCursor = undefined; routePreference.clearDecision(); drawDraft(); updateHistoryButtons(); } else if (canUndo(history)) restoreHistory(undoHistory(history)); }, wireDrawing: () => wireDrawing, changeWireRoute: (key) => { if (key === 'Tab') routePreference.toggleCorner(); else routePreference.flipBundle(); drawDraft(); }, toggleWireDrawing, cycleWireKind, finishWireDrawing, cancelPlacement: () => { placementType = undefined; placementRotation = 0; activePaletteCommand = undefined; renderPalette(); if (placeTypeSelect) placeTypeSelect.value = ''; svg.classList.remove('is-placing'); status.textContent = 'Режим размещения завершён.'; }, cancelWireDrawing: () => { if (draftPoints.length) { draftPoints = []; draftCursor = undefined; routePreference.clearDecision(); drawDraft(); updateHistoryButtons(); } else cancelWireDrawing(); }, placing: () => placementType !== undefined, selectedCount: () => selected.size, clearSelection: () => { selected.clear(); renderSchema(); }, deleteSelected, rotateSelection, nudgeSelection });
  window.addEventListener('pagehide', persistSchemaNow);
  window.addEventListener('pagehide', saveViewportNow);

  setupViewportControls(ctx, { root, svg, backdrop, viewSize: () => viewSize, setViewSize: (value) => { viewSize = value; }, viewport: () => viewport, setViewport: (value) => { viewport = value; }, drawViewport });
  renderSchema();
}
