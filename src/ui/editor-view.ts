import type { AppContext } from './context';
import type { AppElements } from './app-elements';
import type { Selectable, DragState } from './constants';
import type { Schema } from '@model/types';
import { setupHistoryUi } from './history-ui';
import { setupPropertyFields } from './properties';
import { setupStampEditor } from './stamp-editor';
import { setupWireDraft } from './wire-draft';
import { setupPlacementGhost } from './placement-ghost';
import { setupSheetFrame } from './sheet-frame';
import { setupSchemaRenderer } from './schema-renderer';
import type { SimulationController } from './sim-controller';
import type { Point, Viewport } from './viewport';
import type { InterfaceText } from './i18n';
import { currentPage, renderPageTabs, renderProgramPageSheets } from './program-pages-view';
import { growProgramPagesToContent } from '@model/program-pages';

export interface EditorViewOptions {
  ctx: AppContext;
  root: HTMLElement;
  elements: AppElements;
  selected: Map<string, Selectable>;
  clipboardAvailable: () => boolean;
  wireDrawing: () => boolean;
  draftPoints: () => Point[];
  draftCursor: () => Point | undefined;
  uiText: () => InterfaceText;
  simulation: SimulationController;
  propertySnapshot: () => Schema | undefined;
  setPropertySnapshot: (schema: Schema | undefined) => void;
  viewport: () => Viewport;
  viewSize: () => Point;
  scheduleViewportSave: () => void;
  planBundleRoutes: (points: readonly Point[]) => Array<{ route: Point[]; kind: 'phase' | 'neutral' | 'protection' }>;
  wireThickness: () => number;
  placementType: () => number | undefined;
  placementRotation: () => 0 | 1 | 2 | 3;
  drag: () => DragState | undefined;
  persistSchema: () => void;
}

export function setupEditorView(options: EditorViewOptions) {
  const { ctx, root, elements, selected, simulation } = options;
  let renderSchema = (): void => undefined;
  const history = setupHistoryUi(ctx, {
    root,
    undoButton: elements.undoButton,
    redoButton: elements.redoButton,
    drawWireButton: elements.drawWireButton,
    finishWireButton: elements.finishWireButton,
    selected,
    clipboardAvailable: options.clipboardAvailable,
    wireDrawing: options.wireDrawing,
    draftLength: () => options.draftPoints().length,
    uiText: options.uiText,
    simulation,
    renderSchema: () => renderSchema(),
  });
  const properties = setupPropertyFields(ctx, {
    propertyFields: elements.propertyFields,
    selected,
    uiText: () => options.uiText(),
    renderSchema: () => renderSchema(),
    commitSchema: history.commitSchema,
    propertySnapshot: options.propertySnapshot,
    setPropertySnapshot: options.setPropertySnapshot,
  });
  const stampEditor = setupStampEditor(ctx, {
    stage: root.querySelector<HTMLElement>('.viewport-stage'),
    viewport: options.viewport,
    commitSchema: history.commitSchema,
    renderSchema: () => renderSchema(),
  });
  const drawViewport = (): void => {
    if (stampEditor.isOpen()) stampEditor.close(true);
    elements.sheet.setAttribute(
      'transform',
      `translate(${options.viewport().offsetX} ${options.viewport().offsetY}) scale(${options.viewport().scale})`,
    );
    elements.zoomValue.value = `${Math.round(options.viewport().scale * 100)}%`;
    options.scheduleViewportSave();
    updatePages();
  };
  const drawDraft = setupWireDraft({
    layer: elements.draftLayer,
    isDrawing: options.wireDrawing,
    points: options.draftPoints,
    cursor: options.draftCursor,
    buildRoutes: options.planBundleRoutes,
    thickness: options.wireThickness,
  });
  const ghost = setupPlacementGhost(ctx, {
    svg: elements.svg,
    after: elements.draftLayer,
    viewSize: options.viewSize,
    viewport: options.viewport,
    placementType: options.placementType,
    rotation: options.placementRotation,
    wireDrawing: options.wireDrawing,
  });
  elements.svg.addEventListener('pointerleave', () => {
    ghost.layer.replaceChildren();
    if (elements.cursorCoords) elements.cursorCoords.value = 'X: — Y: —';
  });
  elements.svg.addEventListener('pointerenter', ghost.move);
  const renderSheetFrame = setupSheetFrame(ctx, elements.sheetFrame, elements.sheetStamp);
  const syncSelectedWireThickness = (): void => {
    const selectedWireIds = [...selected.values()]
      .filter((item) => item.kind === 'wire')
      .map((item) => item.id);
    const selectedWires = ctx.schema.wires.filter((wire) =>
      selectedWireIds.includes(wire.id) && wire.kind !== 'junction');
    if (!selectedWires.length) return;
    const firstThickness = selectedWires[0]?.thickness;
    elements.wireThicknessSelect.value = selectedWires.every((wire) => wire.thickness === firstThickness)
      ? String(firstThickness)
      : '';
  };
  // Листы программ ПЛК: бумага и сетка справа от основного листа, вкладки «Схема / Программа» над полем.
  const pageTexts = () => {
    const text = options.uiText();
    return { program: text.programPage, mainSheet: text.mainSheet };
  };
  const updatePages = (): void => renderPageTabs(root.querySelector<HTMLElement>('#page-tabs'), ctx.schema,
    currentPage(ctx.schema, options.viewport(), options.viewSize()), pageTexts());
  const renderMain = setupSchemaRenderer(ctx, {
    root,
    svg: elements.svg,
    wireLayer: elements.wireLayer,
    elementLayer: elements.elementLayer,
    selectionLayer: elements.selectionLayer,
    selected,
    drag: options.drag,
    renderSheetFrame,
    drawDraft,
    simulation,
    updateHistoryButtons: history.updateHistoryButtons,
    renderProperties: properties.renderProperties,
    persistSchema: options.persistSchema,
    syncSelectedWireThickness,
  });
  renderSchema = (): void => {
    growProgramPagesToContent(ctx.schema);
    renderProgramPageSheets(root.querySelector<SVGGElement>('#program-page-sheets'), ctx.schema, pageTexts());
    renderMain();
    updatePages();
  };
  return {
    ...history,
    renderProperties: properties.renderProperties,
    stampEditor,
    drawViewport,
    drawDraft,
    ...ghost,
    renderSchema,
  };
}
