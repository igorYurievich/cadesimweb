import type { Lang } from '@model/catalog';
import { createEmptySchema } from '@model/index';
import type { Schema, SchemaElement, WireSegment } from '@model/types';
import { createHistory } from './history';
import { renderAppShell } from './app-shell';
import { queryAppElements } from './app-elements';
import { readAppSettings, readInterfaceLanguage } from './settings';
import {
  createPersistenceController,
  createViewportPersistenceController,
  readAutosavedSchema,
  readSavedDocuments,
} from './persistence';
import { initializeCanvasViewport } from './canvas-viewport';
import { createDocumentState, renderDocumentTabs, syncActiveDocument } from './documents';
import { createAppContext } from './context';
import { setupPropertiesPanel } from './properties';
import { setupSimulation } from './sim-controller';
import { setupToolModes } from './tool-modes';
import type { ToolModesSetup } from './tool-modes';
import { setupAppInterface } from './app-interface';
import type { Point, Viewport } from './viewport';
import type { Selectable, DragState } from './constants';
import { cloneSchema } from './helpers';
import { INTERFACE_TEXT } from './i18n';

function createCoreFrame(root: HTMLElement) {
  const savedDocuments = readSavedDocuments();
  const autosavedSchema = readAutosavedSchema();
  let schema: Schema = savedDocuments?.tabs.find((tab) => tab.id === savedDocuments.activeId)?.schema
    ?? autosavedSchema
    ?? createEmptySchema();
  let history = createHistory(cloneSchema(schema));
  const ctx = createAppContext(
    root,
    () => schema,
    (next) => { schema = next; },
    () => history,
    (next) => { history = next; },
  );
  const appSettings = readAppSettings();
  renderAppShell(root, appSettings.theme);
  let paletteLang!: Lang;
  const uiText = (): typeof INTERFACE_TEXT.ru => INTERFACE_TEXT[paletteLang] as typeof INTERFACE_TEXT.ru;
  const propertiesPanel = setupPropertiesPanel(ctx, uiText);
  const elements = queryAppElements(root);
  elements.fileName.textContent = schema.sheet.fileName || 'Новая схема';
  if (autosavedSchema) elements.status.textContent = 'Автосохранённая схема восстановлена.';
  elements.svg.setAttribute('tabindex', '0');
  const canvasViewport = initializeCanvasViewport(elements.svg, schema);
  let viewSize: Point = canvasViewport.viewSize;
  let viewport: Viewport = canvasViewport.viewport;
  const documentState = createDocumentState(savedDocuments, schema, history, viewport, viewSize);
  const documentTabBar = root.querySelector<HTMLElement>('#document-tabs');
  const viewportPersistence = createViewportPersistenceController(() => viewSize, () => viewport);
  return {
    root,
    ctx,
    appSettings,
    elements,
    propertiesPanel,
    documentState,
    documentTabBar,
    backdrop: canvasViewport.backdrop,
    saveViewportNow: viewportPersistence.saveNow,
    scheduleViewportSave: viewportPersistence.schedule,
    get schema() { return schema; },
    set schema(value: Schema) { schema = value; },
    get history() { return history; },
    set history(value) { history = value; },
    get viewSize() { return viewSize; },
    set viewSize(value: Point) { viewSize = value; },
    get viewport() { return viewport; },
    set viewport(value: Viewport) { viewport = value; },
    get paletteLang() { return paletteLang; },
    set paletteLang(value: Lang) { paletteLang = value; },
    uiText,
  };
}

function createAppFrame(root: HTMLElement) {
  const core = createCoreFrame(root);
  return Object.assign(core, {
    selected: new Map<string, Selectable>(),
    clipboard: undefined as { elements: SchemaElement[]; wires: WireSegment[]; anchor: Point } | undefined,
    placementType: undefined as number | undefined,
    activePaletteCommand: undefined as number | undefined,
    placementRotation: 0 as 0 | 1 | 2 | 3,
    wireDrawing: false,
    pointerSheetPosition: undefined as Point | undefined,
    drag: undefined as DragState | undefined,
    spaceDown: false,
    panTool: false,
    nodeTool: false,
    draftPoints: [] as Point[],
    draftCursor: undefined as Point | undefined,
    dragSnapshot: undefined as Schema | undefined,
    propertySnapshot: undefined as Schema | undefined,
    renderSchema: (): void => undefined,
    renderPalette: (): void => undefined,
    cancelWireDrawing: (): void => undefined,
    toggleWireDrawing: (): void => undefined,
    finishWireDrawing: (): void => undefined,
    placeTypeSelect: null as HTMLSelectElement | null,
    syncCurrentDocument: (): void => syncActiveDocument(
      core.documentState,
      core.schema,
      core.history,
      core.viewport,
      core.uiText().new,
    ),
  });
}

function setupAppToolModes(state: ReturnType<typeof createAppFrame>) {
  const deps: ToolModesSetup = {
    svg: state.elements.svg,
    panButton: state.elements.panToolButton,
    nodeButton: state.elements.nodeToolButton,
    selectButton: state.elements.selectToolButton,
    panTool: () => state.panTool,
    setPanToolState: (value) => { state.panTool = value; },
    nodeTool: () => state.nodeTool,
    setNodeToolState: (value) => { state.nodeTool = value; },
    status: state.elements.status,
    wireDrawing: () => state.wireDrawing,
    cancelWireDrawing: () => state.cancelWireDrawing(),
    placementType: () => state.placementType,
    setPlacementType: (value) => { state.placementType = value; },
    setPlacementRotation: (value) => { state.placementRotation = value; },
    clearActivePaletteCommand: () => { state.activePaletteCommand = undefined; },
    renderPalette: () => state.renderPalette(),
    placeTypeSelect: () => state.placeTypeSelect,
  };
  return setupToolModes(deps);
}

function setupAppBaseControllers(state: ReturnType<typeof createAppFrame>) {
  const persistence = createPersistenceController({
    schema: () => state.schema,
    activeDocumentId: () => state.documentState.activeDocumentId,
    documents: () => state.documentState.documents,
    syncCurrentDocument: state.syncCurrentDocument,
    renderDocuments: () => renderDocumentTabs(state.documentState, state.documentTabBar, state.uiText()),
  });
  const simulation = setupSimulation(state.ctx, {
    wireLayer: state.elements.wireLayer,
    elementLayer: state.elements.elementLayer,
    simulationMessage: state.elements.simulationMessage,
    simulationMessageText: state.elements.simulationMessageText,
    runButton: state.elements.runButton,
    stopButton: state.elements.stopButton,
    simStateValue: state.elements.simStateValue,
    simulationContextMenu: state.elements.simulationContextMenu,
    overloadAction: state.elements.overloadAction,
    status: state.elements.status,
    uiText: state.uiText,
    renderSchema: () => state.renderSchema(),
    uniformWireColors: () => state.appSettings.uniformWireColors,
    clearSelection: () => { state.selected.clear(); state.renderSchema(); },
  });
  const appInterface = setupAppInterface({
    root: state.root,
    settings: state.appSettings,
    uiText: state.uiText,
    simulation,
    wireDrawing: () => state.wireDrawing,
    speedButton: state.elements.speedButton,
    applyPropertiesPanel: state.propertiesPanel.applyPropertiesPanel,
    paletteSearch: state.elements.paletteSearch,
    paletteLanguage: state.elements.paletteLanguage,
    paletteLang: () => state.paletteLang,
    zoomValue: state.elements.zoomValue,
    schema: () => state.schema,
    fileName: state.elements.fileName,
  });
  return { ...persistence, simulation, ...state.propertiesPanel, ...appInterface };
}

export function createAppSetupBase(root: HTMLElement) {
  const state = createAppFrame(root);
  const tools = setupAppToolModes(state);
  state.paletteLang = readInterfaceLanguage();
  const controllers = setupAppBaseControllers(state);
  return Object.assign(state, tools, controllers);
}

export type AppSetupBase = ReturnType<typeof createAppSetupBase>;
