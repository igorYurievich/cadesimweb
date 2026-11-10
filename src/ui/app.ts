import { getCadType } from '@model/cad-types';
import type { Lang } from '@model/catalog';
import { createEmptySchema } from '@model/index';
import { serializeSchemaJson } from '@model/schema-json';
import type { Schema, SchemaElement, WireKind, WireSegment } from '@model/types';
import { canRedo, canUndo, createHistory, redoHistory, undoHistory } from './history';
import { renderAppShell } from './app-shell';
import { createSettingsCommands, readAppSettings } from './settings';
import { readAutosavedSchema, readSavedDocuments, readSavedViewport, writeAutosavedSchema, writeSavedDocuments, writeSavedViewport } from './persistence';
import { createDocumentState, renderDocumentTabs, syncActiveDocument } from './documents';
import type { DocumentState, DocumentTab } from './documents';
import { createAppContext } from './context';
import { setupBetaNotice } from './beta-notice';
import { setupExport } from './export';
import { setupMenus } from './menus';
import { setupSimulation, setupSimulationSpeedControl } from './sim-controller';
import { setupPalette } from './palette';
import { setupPropertiesPanel, setupPropertyFields } from './properties';
import { setupSheetFrame } from './sheet-frame';
import { setupSchemaRenderer } from './schema-renderer';
import { setupWireDraft } from './wire-draft';

import { setupPlacementGhost } from './placement-ghost';
import { setupSelectionCommands } from './selection-commands';
import { setupMovePreview } from './move-preview';
import { setupCanvasPointerMove, setupCanvasPointerEnd } from './canvas-pointer-move';
import { setupCanvasPointerDown } from './canvas-pointer-down';
import { setupCanvasDoubleClick } from './canvas-double-click';
import { setupSimulationContextMenuEvents, setupWireContextMenu } from './context-menu-events';
import { setupViewportControls } from './viewport-controls';
import { setupDocumentOpen, setupDocumentInputEvents } from './document-io';
import { setupNodeTool } from './node-tool';
import { setupPaletteDrop } from './palette-drop';
import { setupStampEditor } from './stamp-editor';
import { setupToolModes } from './tool-modes';
import { setupHistoryUi } from './history-ui';
import { setupInterfaceTranslation } from './interface-translation';
import { setupKeyboardShortcuts } from './keyboard-shortcuts';
import { fitViewport } from './viewport';
import type { Point, Viewport } from './viewport';
import { detectBundleLayout, isWireInteriorPoint, offsetRoute, orthogonalize, simplifyRoute } from './wire-routing';
import './viewport.css';
import { FALLBACK_VIEWPORT, CAD_EXPORT_WARNING_KEY, CAD_GRID_STEP, INTERFACE_LANGUAGE_KEY } from './constants';
import type { Selectable, DragState } from './constants';
import { fullSheet, cloneSchema } from './helpers';
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

  const svg = root.querySelector<SVGSVGElement>('.viewport-svg');
  const sheet = root.querySelector<SVGGElement>('#sheet-transform');
  const wireLayer = root.querySelector<SVGGElement>('#wire-layer');
  const elementLayer = root.querySelector<SVGGElement>('#element-layer');
  const selectionLayer = root.querySelector<SVGGElement>('#selection-layer');
  const draftLayer = root.querySelector<SVGGElement>('#draft-layer');
  const sheetFrame = root.querySelector<SVGGElement>('#sheet-frame');
  const sheetStamp = root.querySelector<SVGGElement>('#sheet-stamp');
  const zoomValue = root.querySelector<HTMLOutputElement>('#zoom-value');
  const cursorCoords = root.querySelector<HTMLOutputElement>('#cursor-coords');
  const status = root.querySelector<HTMLDivElement>('#status');
  const fileName = root.querySelector<HTMLSpanElement>('#file-name');
  const fileInput = root.querySelector<HTMLInputElement>('#cad-file');
  const wireKindSelect = root.querySelector<HTMLSelectElement>('#wire-kind');
  const wireThicknessSelect = root.querySelector<HTMLSelectElement>('#wire-thickness');
  const drawWireButton = root.querySelector<HTMLButtonElement>('#draw-wire');
  const panToolButton = root.querySelector<HTMLButtonElement>('#pan-tool');
  const nodeToolButton = root.querySelector<HTMLButtonElement>('#node-tool');
  const selectToolButton = root.querySelector<HTMLButtonElement>('#select-tool');
  const finishWireButton = root.querySelector<HTMLButtonElement>('#finish-wire');
  const undoButton = root.querySelector<HTMLButtonElement>('#undo');
  const redoButton = root.querySelector<HTMLButtonElement>('#redo');
  const paletteGroups = root.querySelector<HTMLDivElement>('#palette-groups');
  const paletteSearch = root.querySelector<HTMLInputElement>('#palette-search');
  const paletteLanguage = root.querySelector<HTMLSelectElement>('#palette-language');
  const paletteCount = root.querySelector<HTMLSpanElement>('#palette-count');
  const propertyFields = root.querySelector<HTMLDivElement>('#property-fields');
  const runButton = root.querySelector<HTMLButtonElement>('#sim-run');
  const stopButton = root.querySelector<HTMLButtonElement>('#sim-stop');
  const simStateValue = root.querySelector<HTMLSpanElement>('#sim-state');
  const speedButton = root.querySelector<HTMLButtonElement>('#speed-cycle');
  const simulationMessage = root.querySelector<HTMLDivElement>('#simulation-message');
  const simulationMessageText = root.querySelector<HTMLSpanElement>('#simulation-message-text');
  const simulationContextMenu = root.querySelector<HTMLDivElement>('#simulation-context-menu');
  const overloadAction = root.querySelector<HTMLButtonElement>('#simulate-overload');
  const resetInputsAction = root.querySelector<HTMLButtonElement>('#reset-simulation-inputs');
  if (!svg || !sheet || !wireLayer || !elementLayer || !selectionLayer || !draftLayer || !sheetFrame || !sheetStamp || !zoomValue || !status || !fileName || !fileInput || !wireKindSelect || !wireThicknessSelect || !drawWireButton || !finishWireButton || !undoButton || !redoButton || !paletteGroups || !paletteSearch || !paletteLanguage || !paletteCount || !propertyFields || !runButton || !stopButton || !simStateValue || !simulationMessage || !simulationMessageText || !simulationContextMenu || !overloadAction || !resetInputsAction || !speedButton) throw new Error('Не удалось создать поле SVG.');
  fileName.textContent = schema.sheet.fileName || 'Новая схема';
  if (autosavedSchema) status.textContent = 'Автосохранённая схема восстановлена.';
  svg.setAttribute('tabindex', '0');

  const initialRect = svg.getBoundingClientRect();
  let viewSize: Point = { x: initialRect.width || FALLBACK_VIEWPORT.width, y: initialRect.height || FALLBACK_VIEWPORT.height };
  svg.setAttribute('viewBox', `0 0 ${viewSize.x} ${viewSize.y}`);
  const backdrop = svg.querySelector<SVGRectElement>('.viewport-backdrop');
  backdrop?.setAttribute('width', String(viewSize.x));
  backdrop?.setAttribute('height', String(viewSize.y));
  let viewport: Viewport = readSavedViewport(viewSize) ?? fitViewport(fullSheet(schema.sheet), { width: viewSize.x, height: viewSize.y });
  const documentState: DocumentState = createDocumentState(savedDocuments, schema, history, viewport, viewSize);
  const documentTabBar = root.querySelector<HTMLElement>('#document-tabs');
  let viewportSaveTimer: ReturnType<typeof setTimeout> | undefined;
  const saveViewportNow = (): void => {
    if (viewportSaveTimer !== undefined) { clearTimeout(viewportSaveTimer); viewportSaveTimer = undefined; }
    writeSavedViewport(viewSize, viewport);
  };
  const scheduleViewportSave = (): void => {
    if (viewportSaveTimer !== undefined) clearTimeout(viewportSaveTimer);
    viewportSaveTimer = setTimeout(saveViewportNow, 250);
  };
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
  let paletteLang: Lang = (() => {
    try {
      const saved = localStorage.getItem(INTERFACE_LANGUAGE_KEY);
      return saved === 'es' || saved === 'en' || saved === 'it' || saved === 'ru' || saved === 'fr' || saved === 'ar' ? saved : 'es';
    } catch { return 'es'; }
  })();
  let placementRotation: 0 | 1 | 2 | 3 = 0;
  let wireDrawing = false;
  const uiText = (): typeof INTERFACE_TEXT.ru => INTERFACE_TEXT[paletteLang] as typeof INTERFACE_TEXT.ru;
  const syncCurrentDocument = (): void => {
    syncActiveDocument(documentState, schema, history, viewport, uiText().new);
  };
  const persistDocuments = (): void => {
    writeSavedDocuments(documentState.activeDocumentId, documentState.documents.map((tab) => ({
      id: tab.id,
      name: tab.name,
      schema: serializeSchemaJson(tab.schema),
    })));
    renderDocumentTabs(documentState, documentTabBar, uiText());
  };
  let autosaveTimer: ReturnType<typeof setTimeout> | undefined;
  const persistSchemaNow = (): void => {
    if (autosaveTimer !== undefined) clearTimeout(autosaveTimer);
    autosaveTimer = undefined;
    writeAutosavedSchema(ctx.schema, serializeSchemaJson);
    syncCurrentDocument();
    persistDocuments();
  };
  const persistSchema = (): void => {
    if (autosaveTimer !== undefined) return;
    autosaveTimer = setTimeout(() => {
      persistSchemaNow();
    }, 500);
  };

  let draftPoints: Point[] = [];
  let draftCursor: Point | undefined;
  let dragSnapshot: Schema | undefined;
  let propertySnapshot: Schema | undefined;
  const simulation = setupSimulation(ctx, {
    wireLayer, elementLayer, simulationMessage, simulationMessageText, runButton, stopButton, simStateValue, simulationContextMenu, overloadAction, status,
    uiText: () => uiText(), renderSchema: () => renderSchema(), uniformWireColors: () => appSettings.uniformWireColors,
    clearSelection: () => { selected.clear(); renderSchema(); },
  });
  const settingsCommands = createSettingsCommands(root, appSettings, uiText, simulation.applySimulationVisuals);
  const translateInterface = setupInterfaceTranslation({
    root, uiText, visibleOptionalGroups: appSettings.visibleOptionalGroups,
    wireDrawing: () => wireDrawing, simulationMode: () => simulation.mode, speedButton,
    gridVisible: () => appSettings.gridVisible, applyPropertiesPanel,
    updateWireColorsCommand: settingsCommands.updateWireColorsCommand,
    paletteSearch, paletteLanguage, paletteLang: () => paletteLang, zoomValue,
    schema: () => schema, fileName,
  });
  const toggleTheme = (): void => settingsCommands.toggleTheme(translateInterface);
  const toggleGrid = (): void => settingsCommands.toggleGrid(translateInterface);
  const toggleWireColors = settingsCommands.toggleWireColors;
  translateInterface();

  const { updateHistoryButtons, commitSchema, restoreHistory } = setupHistoryUi(ctx, { root, undoButton, redoButton, drawWireButton, finishWireButton, selected, clipboardAvailable: () => clipboard !== undefined, wireDrawing: () => wireDrawing, draftLength: () => draftPoints.length, uiText, simulation, renderSchema: () => renderSchema() });
  const { renderProperties } = setupPropertyFields(ctx, {
    propertyFields, selected, uiText, renderSchema: () => renderSchema(), commitSchema,
    propertySnapshot: () => propertySnapshot, setPropertySnapshot: (value) => { propertySnapshot = value; },
  });
  const stampEditor = setupStampEditor(ctx, { stage: root.querySelector<HTMLElement>('.viewport-stage'), viewport: () => viewport, commitSchema, renderSchema: () => renderSchema() });
  const { open: openStampEditor, close: closeStampEditor } = stampEditor;
  const drawViewport = (): void => {
    if (stampEditor.isOpen()) closeStampEditor(true);
    sheet.setAttribute('transform', `translate(${viewport.offsetX} ${viewport.offsetY}) scale(${viewport.scale})`);
    zoomValue.value = `${Math.round(viewport.scale * 100)}%`;
    scheduleViewportSave();
  };
  type DrawKind = Exclude<WireKind, 'junction'>;
  const activeWireKinds = (): DrawKind[] => {
    const value = wireKindSelect.value;
    if (value === 'three') return ['phase', 'phase', 'phase'];
    if (value === 'threeN') return ['phase', 'phase', 'phase', 'neutral'];
    return [value as DrawKind];
  };
  let elbowVerticalFirst = false;
  let elbowPreferenceChosen = false;
  let bundleFlipped = false;
  /** Маршруты всех проводов пучка; для одного провода — единственный маршрут. */
  const buildBundleRoutes = (points: readonly Point[]): Array<{ route: Point[]; kind: DrawKind }> => {
    const kinds = activeWireKinds();
    const route = simplifyRoute(orthogonalize(points, elbowVerticalFirst));
    if (route.length < 2) return [];
    if (kinds.length === 1) return [{ route, kind: kinds[0] as DrawKind }];
    const layout = detectBundleLayout(route, schema);
    const side = (layout.side * (bundleFlipped ? -1 : 1)) as 1 | -1;
    // Порядок на экране слева направо (или сверху вниз): сначала все фазы, нейтраль последней,
    // независимо от того, в какую сторону от щелчка уходит пучок.
    const lanes = kinds.map((_, index) => offsetRoute(route, side * layout.spacing * index));
    const firstStart = route[0] as Point; const firstEnd = route[1] as Point;
    const vertical = firstStart.x === firstEnd.x;
    const laneKey = (lane: Point[]): number => { const start = lane[0] as Point; return vertical ? start.x : start.y; };
    lanes.sort((a, b) => laneKey(a) - laneKey(b));
    return kinds.map((kind, index) => ({ route: lanes[index] as Point[], kind }));
  };
  const insideSheet = (route: readonly Point[]): boolean => route.every((p) => p.x >= 0 && p.y >= 0 && p.x <= schema.sheet.width && p.y <= schema.sheet.height);
  const routeHitsComponent = (route: readonly Point[]): boolean => {
    const boxes = schema.elements.flatMap((element) => {
      if (element.typeCode === 20000) return [];
      const body = elementLayer.querySelector<SVGGElement>(`[data-element-id="${element.id}"] .symbol-body`);
      if (!body) return [];
      const box = body.getBBox();
      const angle = element.rotation * Math.PI / 2;
      const cos = Math.cos(angle); const sin = Math.sin(angle);
      const corners = [
        { x: box.x, y: box.y }, { x: box.x + box.width, y: box.y },
        { x: box.x, y: box.y + box.height }, { x: box.x + box.width, y: box.y + box.height },
      ].map((p) => ({ x: element.position.x + p.x * cos - p.y * sin, y: element.position.y + p.x * sin + p.y * cos }));
      return [{ element, minX: Math.min(...corners.map((p) => p.x)), maxX: Math.max(...corners.map((p) => p.x)), minY: Math.min(...corners.map((p) => p.y)), maxY: Math.max(...corners.map((p) => p.y)) }];
    });
    for (let i = 1; i < route.length; i += 1) {
      const a = route[i - 1]; const b = route[i];
      if (!a || !b) continue;
      for (const box of boxes) {
        const horizontalHit = a.y === b.y && a.y > box.minY && a.y < box.maxY
          && Math.min(a.x, b.x) < box.maxX && Math.max(a.x, b.x) > box.minX;
        const verticalHit = a.x === b.x && a.x > box.minX && a.x < box.maxX
          && Math.min(a.y, b.y) < box.maxY && Math.max(a.y, b.y) > box.minY;
        if (!horizontalHit && !verticalHit) continue;
        // У многих символов штрих самой клеммы входит в корпус на небольшую длину.
        // Разрешаем пройти этот штрих у конца, совпавшего с клеммой; остальное пересечение блокируем.
        const terminalEscape = (point: Point, other: Point): boolean => {
          if (!box.element.terminals.some((terminal) => box.element.position.x + terminal.offset.x === point.x && box.element.position.y + terminal.offset.y === point.y)) return false;
          const towardPositive = horizontalHit ? other.x > point.x : other.y > point.y;
          const coordinate = horizontalHit ? point.x : point.y;
          const min = horizontalHit ? box.minX : box.minY;
          const max = horizontalHit ? box.maxX : box.maxY;
          const depth = towardPositive
            ? coordinate < min ? 0 : max - coordinate
            : coordinate > max ? 0 : coordinate - min;
          return depth >= 0 && depth <= 3;
        };
        if (!terminalEscape(a, b) && !terminalEscape(b, a)) return true;
      }
    }
    return false;
  };
  const drawDraft = setupWireDraft({ layer: draftLayer, isDrawing: () => wireDrawing, points: () => draftPoints, cursor: () => draftCursor, buildRoutes: buildBundleRoutes, thickness: () => Number(wireThicknessSelect.value) });
  const { layer: ghostLayer, draw: drawGhost, move: moveGhost } = setupPlacementGhost(ctx, { svg, after: draftLayer, viewSize: () => viewSize, viewport: () => viewport, placementType: () => placementType, rotation: () => placementRotation, wireDrawing: () => wireDrawing });
  svg.addEventListener('pointerleave', () => { ghostLayer.replaceChildren(); if (cursorCoords) cursorCoords.value = 'X: — Y: —'; });
  svg.addEventListener('pointerenter', (event) => moveGhost(event));
  const renderSheetFrame = setupSheetFrame(ctx, sheetFrame, sheetStamp);
  const syncSelectedWireThickness = (): void => {
    const selectedWireIds = [...selected.values()].filter((item) => item.kind === 'wire').map((item) => item.id);
    const selectedWires = schema.wires.filter((wire) => selectedWireIds.includes(wire.id) && wire.kind !== 'junction');
    if (!selectedWires.length) return;
    const firstThickness = selectedWires[0]?.thickness;
    wireThicknessSelect.value = selectedWires.every((wire) => wire.thickness === firstThickness) ? String(firstThickness) : '';
  };
  const renderSchema = setupSchemaRenderer(ctx, { root, svg, wireLayer, elementLayer, selectionLayer, selected, drag: () => drag, renderSheetFrame, drawDraft, simulation, updateHistoryButtons, renderProperties: () => renderProperties(), persistSchema, syncSelectedWireThickness });
  const activateDocument = (id: string, skipSavingCurrent = false): void => {
    if (id === documentState.activeDocumentId) return;
    if (!skipSavingCurrent) { syncCurrentDocument(); persistDocuments(); }
    simulation.stopSimulation();
    const target = documentState.documents.find((tab) => tab.id === id); if (!target) return;
    documentState.activeDocumentId = target.id; schema = target.schema; history = target.history; viewport = target.viewport;
    selected.clear(); fileInput.value = ''; fileName.textContent = schema.sheet.fileName || target.name;
    placementType = undefined; placementRotation = 0; activePaletteCommand = undefined; wireDrawing = false; draftPoints = []; draftCursor = undefined;
    if (placeTypeSelect) placeTypeSelect.value = ''; svg.classList.remove('is-placing', 'is-drawing-wire');
    simulation.resetSimulation(); renderSchema(); drawViewport(); updateHistoryButtons(); translateInterface();
    status.textContent = `Открыта схема «${target.name}».`; renderDocumentTabs(documentState, documentTabBar, uiText());
  };
  const createDocumentTab = (name = uiText().new): void => {
    if (documentState.documents.length) { syncCurrentDocument(); persistDocuments(); }
    simulation.stopSimulation();
    const nextSchema = createEmptySchema();
    const tab: DocumentTab = { id: crypto.randomUUID(), name, schema: nextSchema, history: createHistory(cloneSchema(nextSchema)), viewport: fitViewport(fullSheet(nextSchema.sheet), { width: viewSize.x, height: viewSize.y }) };
    documentState.documents.push(tab); documentState.activeDocumentId = tab.id; schema = tab.schema; history = tab.history; viewport = tab.viewport;
    selected.clear(); fileInput.value = ''; fileName.textContent = name;
    placementType = undefined; placementRotation = 0; activePaletteCommand = undefined; wireDrawing = false; draftPoints = []; draftCursor = undefined;
    if (placeTypeSelect) placeTypeSelect.value = ''; svg.classList.remove('is-placing', 'is-drawing-wire');
    simulation.resetSimulation(); renderSchema(); drawViewport(); updateHistoryButtons(); translateInterface();
    status.textContent = 'Новая схема создана.'; persistSchemaNow(); renderDocumentTabs(documentState, documentTabBar, uiText());
  };
  const closeDocumentTab = (id: string): void => {
    const index = documentState.documents.findIndex((tab) => tab.id === id); if (index < 0) return;
    syncCurrentDocument(); documentState.documents.splice(index, 1);
    if (!documentState.documents.length) { documentState.activeDocumentId = ''; createDocumentTab(); return; }
    if (documentState.activeDocumentId === id) { documentState.activeDocumentId = ''; activateDocument(documentState.documents[Math.min(index, documentState.documents.length - 1)]!.id, true); }
    else { persistDocuments(); }
  };
  documentTabBar?.addEventListener('click', (event) => {
    const target = event.target as Element;
    const close = target.closest<HTMLButtonElement>('[data-close-document]');
    if (close?.dataset.closeDocument) { event.stopPropagation(); closeDocumentTab(close.dataset.closeDocument); return; }
    const tab = target.closest<HTMLButtonElement>('[data-document-tab]');
    if (tab?.dataset.documentTab) activateDocument(tab.dataset.documentTab);
    else if (target.closest('#new-document-tab')) createDocumentTab();
  });
  renderDocumentTabs(documentState, documentTabBar, uiText());
  const { renderPalette } = setupPalette(ctx, {
    search: paletteSearch, language: paletteLanguage, count: paletteCount, groups: paletteGroups, svg, status,
    paletteLang: () => paletteLang, setPaletteLang: (value) => { paletteLang = value; }, visibleOptionalGroups: appSettings.visibleOptionalGroups,
    activePaletteCommand: () => activePaletteCommand, setActivePaletteCommand: (value) => { activePaletteCommand = value; },
    setPlacement: (value) => { placementType = value; }, resetPlacementRotation: () => { placementRotation = 0; },
    uiText: () => uiText(), leaveNodeTool, isWireDrawing: () => wireDrawing, cancelWireDrawing: () => cancelWireDrawing(),
    drawGhost, translateInterface, renderProperties,
  });
  renderPalette();

  const cancelWireDrawing = (): void => {
    wireDrawing = false; draftPoints = []; draftCursor = undefined;
    svg.classList.remove('is-drawing-wire');
    renderSchema();
    status.textContent = 'Рисование провода отменено.';
  };
  const startWireDrawing = (): void => {
    leaveNodeTool();
    placementType = undefined; placementRotation = 0;
    const placeSelect = root.querySelector<HTMLSelectElement>('#place-type');
    if (placeSelect) placeSelect.value = '';
    svg.classList.remove('is-placing');
    selected.clear();
    wireDrawing = true; draftPoints = []; draftCursor = undefined;
    elbowVerticalFirst = false; elbowPreferenceChosen = false;
    svg.classList.add('is-drawing-wire');
    renderSchema();
    status.textContent = 'Провод: клик — начало, второй клик — конец. Shift+клик — добавить излом; ↑/↓/←/→ — тип провода; C — выйти; Tab — другой угол, F — сторона пучка.';
  };
  const toggleWireDrawing = (): void => { if (wireDrawing) cancelWireDrawing(); else startWireDrawing(); };
  const finishWireDrawing = (): void => {
    if (draftPoints.length < 2) { draftPoints = []; draftCursor = undefined; drawDraft(); updateHistoryButtons(); return; }
    let bundle = buildBundleRoutes(draftPoints);
    if (bundle.length && !bundle.every((item) => insideSheet(item.route)) && activeWireKinds().length > 1) {
      bundleFlipped = !bundleFlipped;
      bundle = buildBundleRoutes(draftPoints);
    }
    if (bundle.length === 0 || !bundle.every((item) => insideSheet(item.route))) {
      status.textContent = 'Провода не помещаются на листе в этом месте.';
      draftPoints = []; draftCursor = undefined; drawDraft(); updateHistoryButtons();
      return;
    }
    if (bundle.some((item) => routeHitsComponent(item.route))) {
      status.textContent = 'Нельзя провести кабель через корпус компонента. Добавьте точки изгиба вокруг него.';
      draftPoints = []; draftCursor = undefined; drawDraft(); updateHistoryButtons();
      return;
    }
    const before = cloneSchema(schema);
    let id = Math.max(0, ...schema.elements.map((element) => element.id), ...schema.wires.map((wire) => wire.id)) + 1;
    const existingWires = [...schema.wires];
    for (const { route, kind } of bundle) {
      const typeCode = kind === 'phase' ? 4000 : kind === 'neutral' ? 4009 : 4010;
      for (let i = 1; i < route.length; i += 1) {
        const from = route[i - 1]; const to = route[i];
        if (!from || !to || (from.x === to.x && from.y === to.y)) continue;
        schema.wires.push({ id: id++, typeCode, kind, from: { ...from }, to: { ...to }, thickness: Number(wireThicknessSelect.value), dot: false });
      }
      const junctionPoints = new Map<string, Point>();
      // Only a wire endpoint landing on an existing wire is an intentional
      // automatic T-connection. A bend/crossing in the middle of the route
      // must stay electrically separate unless the user places a node.
      for (const point of [route[0], route[route.length - 1]]) {
        if (!point) continue;
        if (existingWires.some((wire) => isWireInteriorPoint(point, wire))) junctionPoints.set(`${point.x},${point.y}`, point);
      }
      for (const point of junctionPoints.values()) {
        const alreadyMarked = schema.wires.some((wire) => wire.kind === 'junction' && wire.from.x === point.x && wire.from.y === point.y);
        if (!alreadyMarked) schema.wires.push({ id: id++, typeCode: 4001, kind: 'junction', from: { ...point }, to: { ...point }, thickness: 0, dot: true });
      }
    }
    // Режим провода остаётся включённым: следующий клик начинает новый провод.
    draftPoints = []; draftCursor = undefined;
    selected.clear();
    commitSchema(before); renderSchema();
    status.textContent = bundle.length > 1 ? `Добавлено проводов: ${bundle.length}. Следующий клик — начало нового.` : 'Провод добавлен. Следующий клик — начало нового, Esc — выйти.';
  };

  const { copySelection, cutSelection, pasteSelection, deleteSelected, rotateSelection, nudgeSelection } = setupSelectionCommands(ctx, { selected, clipboard: () => clipboard, setClipboard: (value) => { clipboard = value; }, status, simulationMode: () => simulation.mode, pointer: () => pointerSheetPosition, viewSize: () => viewSize, viewport: () => viewport, updateHistoryButtons, commitSchema, renderSchema, placementType: () => placementType, placementRotation: () => placementRotation, setPlacementRotation: (value) => { placementRotation = value; }, drawGhost });

  const placeTypeSelect = root.querySelector<HTMLSelectElement>('#place-type');
  placeTypeSelect?.addEventListener('change', () => {
    if (placeTypeSelect.value) leaveNodeTool();
    if (wireDrawing) cancelWireDrawing();
    activePaletteCommand = undefined;
    placementType = placeTypeSelect.value ? Number(placeTypeSelect.value) : undefined;
    placementRotation = 0;
    svg.classList.toggle('is-placing', placementType !== undefined);
    drawGhost();
    if (placementType !== undefined) status.textContent = `Размещение: ${getCadType(placementType).label} · щёлкните по листу; R — поворот; Esc — отмена.`;
    else status.textContent = 'Режим выбора. Выберите объект или рамкой выделите область.';
  });
  setupBetaNotice(ctx);
  root.querySelectorAll<HTMLButtonElement>('[data-dialog-close]').forEach((button) => {
    button.addEventListener('click', () => root.querySelector<HTMLDialogElement>(`#${button.dataset.dialogClose}`)?.close());
  });
  overloadAction.addEventListener('click', () => {
    simulationContextMenu.hidden = true;
    if (simulation.contextElementId !== undefined) simulation.simulateOverload(simulation.contextElementId);
  });
  resetInputsAction.addEventListener('click', () => { simulationContextMenu.hidden = true; simulation.resetSimulationInputs(); });
  setupSimulationContextMenuEvents(svg, simulationContextMenu, simulation);
  const confirmCadExport = (): Promise<boolean> => {
    try { if (localStorage.getItem(CAD_EXPORT_WARNING_KEY) === '1') return Promise.resolve(true); } catch { /* Keep the warning enabled when storage is unavailable. */ }
    const dialog = root.querySelector<HTMLDialogElement>('#cad-export-warning-dialog');
    const optout = root.querySelector<HTMLInputElement>('#cad-export-warning-optout');
    const confirm = root.querySelector<HTMLButtonElement>('#cad-export-warning-confirm');
    if (!dialog || !optout || !confirm) return Promise.resolve(false);
    optout.checked = false;
    return new Promise((resolve) => {
      let settled = false;
      const finish = (accepted: boolean): void => {
        if (settled) return;
        settled = true;
        dialog.removeEventListener('close', onClose);
        confirm.removeEventListener('click', onConfirm);
        if (accepted && optout.checked) {
          try { localStorage.setItem(CAD_EXPORT_WARNING_KEY, '1'); } catch { /* The warning will appear again if storage is unavailable. */ }
        }
        if (dialog.open) dialog.close();
        resolve(accepted);
      };
      const onClose = (): void => finish(false);
      const onConfirm = (): void => finish(true);
      dialog.addEventListener('close', onClose);
      confirm.addEventListener('click', onConfirm);
      dialog.showModal();
    });
  };
  const exportActions = setupExport(ctx, svg, status, confirmCadExport);
  setupMenus(ctx, {
    fileInput, status, undoButton, redoButton, exportActions, requestNewSchema: createDocumentTab, copySelection, cutSelection, pasteSelection,
    rotateSelection, deleteSelected, toggleTheme, toggleGrid, toggleDockedProperties, toggleWireColors,
    commitSchema, renderSchema, setViewport: (value) => { viewport = value; }, viewSize, drawViewport,
  });
  root.querySelector<HTMLButtonElement>('#rotate-selection')?.addEventListener('click', rotateSelection);
  root.querySelector<HTMLButtonElement>('#delete-selection')?.addEventListener('click', deleteSelected);
  panToolButton?.addEventListener('click', () => setPanTool(!panTool));
  selectToolButton?.addEventListener('click', selectTool);
  nodeToolButton?.addEventListener('click', () => setNodeTool(!nodeTool));
  /** Точка (x, y) лежит на отрезке провода (включая концы). */
  const { drawNodeCursor, placeNodeAt } = setupNodeTool(ctx, { layer: ghostLayer, active: () => nodeTool, wireDrawing: () => wireDrawing, status, commitSchema, renderSchema });
  drawWireButton.addEventListener('click', toggleWireDrawing);
  finishWireButton.addEventListener('click', finishWireDrawing);
  const cycleWireKind = (direction: -1 | 1): void => {
    const options = [...wireKindSelect.options].filter((option) => !option.disabled);
    if (!options.length) return;
    const current = options.findIndex((option) => option.value === wireKindSelect.value);
    const next = (current + direction + options.length) % options.length;
    wireKindSelect.value = options[next]!.value;
    wireKindSelect.dispatchEvent(new Event('change', { bubbles: true }));
  };
  wireKindSelect.addEventListener('change', () => { if (wireDrawing) drawDraft(); });
  wireThicknessSelect.addEventListener('change', () => {
    const thickness = Number(wireThicknessSelect.value);
    if (!Number.isInteger(thickness) || thickness < 1 || thickness > 4) return;
    const selectedWires = [...selected.values()].filter((item) => item.kind === 'wire')
      .map((item) => schema.wires.find((wire) => wire.id === item.id))
      .filter((wire): wire is NonNullable<typeof wire> => wire !== undefined && wire.kind !== 'junction');
    if (selectedWires.length) {
      const before = cloneSchema(schema);
      for (const wire of selectedWires) wire.thickness = thickness;
      commitSchema(before);
      renderSchema();
    }
    if (wireDrawing) drawDraft();
  });
  undoButton.addEventListener('click', () => {
    if (wireDrawing && draftPoints.length) { draftPoints.pop(); draftCursor = undefined; drawDraft(); updateHistoryButtons(); return; }
    if (canUndo(history)) restoreHistory(undoHistory(history));
  });
  redoButton.addEventListener('click', () => { if (canRedo(history)) restoreHistory(redoHistory(history)); });
  runButton.addEventListener('click', () => {
    if (wireDrawing) cancelWireDrawing();
    if (nodeTool) leaveNodeTool();
    simulation.startSimulation();
  });
  stopButton.addEventListener('click', simulation.stopSimulation);
  setupSimulationSpeedControl(speedButton, simulation);
  simulation.updateSimulationControls();
  drawViewport();

  const openDocumentText = setupDocumentOpen(ctx, { svg, fileName, status, selected, simulation, clearPlacement: () => { placementType = undefined; placementRotation = 0; }, clearWireDrawing: () => { wireDrawing = false; draftPoints = []; draftCursor = undefined; }, placeTypeSelect, persistSchemaNow, viewSize: () => viewSize, setViewport: (value) => { viewport = value; }, drawViewport, renderSchema, beforeOpenDocument: (name) => createDocumentTab(name) });
  setupDocumentInputEvents(root, fileInput, openDocumentText, simulation.stopSimulation);

  setupPaletteDrop(ctx, { svg, viewSize: () => viewSize, viewport: () => viewport, placementType: () => placementType, setPlacementType: (value) => { placementType = value; }, setActiveCommand: (value) => { activePaletteCommand = value; }, setPlacementRotation: (value) => { placementRotation = value; }, leaveNodeTool, moveGhost, selected, commitSchema, renderSchema, status });
  setupCanvasDoubleClick({ svg, wireDrawing: () => wireDrawing, placing: () => placementType !== undefined, panTool: () => panTool, nodeTool: () => nodeTool, spaceDown: () => spaceDown, simulationMode: () => simulation.mode, selected, renderSchema, openProperties: openFloatingProperties });
  setupWireContextMenu(svg, { isDrawing: () => wireDrawing, draftPoints: () => draftPoints, clearDraftCursor: () => { draftCursor = undefined; }, drawDraft, updateHistoryButtons, cancelWireDrawing });
  setupCanvasPointerDown(ctx, { svg, viewSize: () => viewSize, viewport: () => viewport, setPointerSheetPosition: (value) => { pointerSheetPosition = value; }, nodeTool: () => nodeTool, panTool: () => panTool, spaceDown: () => spaceDown, simulation, placeNodeAt, wireDrawing: () => wireDrawing, draftPoints: () => draftPoints, setDraftCursor: (value) => { draftCursor = value; }, drawDraft, updateHistoryButtons, finishWireDrawing, status, placementType: () => placementType, setPlacementType: (value) => { placementType = value; }, placementRotation: () => placementRotation, setPlacementRotation: (value) => { placementRotation = value; }, selected, commitSchema, clearActivePaletteCommand: () => { activePaletteCommand = undefined; }, renderPalette, placeTypeSelect, renderSchema, setDrag: (value) => { drag = value; }, drag: () => drag, setDragSnapshot: (value) => { dragSnapshot = value; }, openStampEditor });
  /**
   * Быстрый путь перемещения: при перетаскивании меняются только transform и координаты
   * уже нарисованных узлов (раз в кадр), а полная перерисовка схемы идёт один раз при отпускании.
   * Раньше каждое движение мыши пересоздавало все ~300 символов, и крупные трёхфазные элементы «тормозили».
   */
  const { schedule: scheduleMovePreview, cancel: cancelMovePreview } = setupMovePreview(ctx, { drag: () => drag, wireLayer, elementLayer, selectionLayer });
  setupCanvasPointerMove(ctx, { svg, viewSize: () => viewSize, viewport: () => viewport, setViewport: (value) => { viewport = value; }, drag: () => drag, setPointerSheetPosition: (value) => { pointerSheetPosition = value; }, setDraftCursor: (value) => {
    if (value === undefined) elbowPreferenceChosen = false;
    else if (wireDrawing && !elbowPreferenceChosen) {
      const anchor = draftPoints[draftPoints.length - 1];
      if (anchor) {
        const dx = Math.abs(value.x - anchor.x); const dy = Math.abs(value.y - anchor.y);
        if (Math.max(dx, dy) >= CAD_GRID_STEP / 2) {
          elbowVerticalFirst = dy > dx;
          elbowPreferenceChosen = true;
        }
      }
    }
    draftCursor = value;
  }, cursorCoords, nodeTool: () => nodeTool, drawNodeCursor, moveGhost, wireDrawing: () => wireDrawing, drawDraft, drawViewport, scheduleMovePreview, renderSchema });
  const endInteraction = setupCanvasPointerEnd(ctx, { svg, viewSize: () => viewSize, viewport: () => viewport, drag: () => drag, setDrag: (value) => { drag = value; }, dragSnapshot: () => dragSnapshot, setDragSnapshot: (value) => { dragSnapshot = value; }, selected, cancelMovePreview, commitSchema, renderSchema });
  svg.addEventListener('pointerup', endInteraction); svg.addEventListener('pointercancel', endInteraction);
  const releaseAllMomentary = (): void => { for (const id of [...simulation.heldInputs]) simulation.releaseMomentary(id); };
  window.addEventListener('pointerup', releaseAllMomentary);
  window.addEventListener('pointercancel', releaseAllMomentary);
  setupKeyboardShortcuts({ root, simulationContextMenu, fileInput, spaceDown: (value) => { spaceDown = value; }, panTool: () => panTool, setPanTool, nodeTool: () => nodeTool, setNodeTool, selectTool, copySelection, cutSelection, pasteSelection, saveJson: exportActions.saveJson, requestNewSchema: createDocumentTab, undo: (redo) => { if (redo) { if (canRedo(history)) restoreHistory(redoHistory(history)); } else if (wireDrawing && draftPoints.length) { draftPoints.pop(); draftCursor = undefined; elbowPreferenceChosen = false; drawDraft(); updateHistoryButtons(); } else if (canUndo(history)) restoreHistory(undoHistory(history)); }, wireDrawing: () => wireDrawing, changeWireRoute: (key) => { if (key === 'Tab') { elbowVerticalFirst = !elbowVerticalFirst; elbowPreferenceChosen = true; } else bundleFlipped = !bundleFlipped; drawDraft(); }, toggleWireDrawing, cycleWireKind, finishWireDrawing, cancelPlacement: () => { placementType = undefined; placementRotation = 0; activePaletteCommand = undefined; renderPalette(); if (placeTypeSelect) placeTypeSelect.value = ''; svg.classList.remove('is-placing'); status.textContent = 'Режим размещения завершён.'; }, cancelWireDrawing: () => { if (draftPoints.length) { draftPoints = []; draftCursor = undefined; elbowPreferenceChosen = false; drawDraft(); updateHistoryButtons(); } else cancelWireDrawing(); }, placing: () => placementType !== undefined, selectedCount: () => selected.size, clearSelection: () => { selected.clear(); renderSchema(); }, deleteSelected, rotateSelection, nudgeSelection });
  window.addEventListener('pagehide', persistSchemaNow);
  window.addEventListener('pagehide', saveViewportNow);

  setupViewportControls(ctx, { root, svg, backdrop, viewSize: () => viewSize, setViewSize: (value) => { viewSize = value; }, viewport: () => viewport, setViewport: (value) => { viewport = value; }, drawViewport });
  renderSchema();
}
