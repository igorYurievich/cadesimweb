import type { AppContext } from './context';
import type { Selectable, DragState } from './constants';
import type { Point, Viewport } from './viewport';
import type { Schema } from '@model/types';
import { setupMovePreview } from './move-preview';
import { setupCanvasPointerMove, setupCanvasPointerEnd } from './canvas-pointer-move';
import { setupCanvasPointerDown } from './canvas-pointer-down';
import { setupCanvasDoubleClick } from './canvas-double-click';
import { setupPaletteDrop } from './palette-drop';
import { setupWireContextMenu } from './context-menu-events';
import type { SimulationController } from './sim-controller';
import type { StampKey } from './constants';

export interface CanvasInteractionsOptions {
  ctx: AppContext;
  svg: SVGSVGElement;
  viewSize: () => Point;
  viewport: () => Viewport;
  setViewport: (value: Viewport) => void;
  wireLayer: SVGGElement;
  elementLayer: SVGGElement;
  selectionLayer: SVGGElement;
  setPointerSheetPosition: (value: Point) => void;
  setDraftCursor: (value: Point | undefined) => void;
  cursorCoords: HTMLOutputElement | null;
  nodeTool: () => boolean;
  panTool: () => boolean;
  spaceDown: () => boolean;
  simulation: SimulationController;
  placeNodeAt: (point: Point) => void;
  wireDrawing: () => boolean;
  draftPoints: () => Point[];
  drawDraft: () => void;
  updateHistoryButtons: () => void;
  finishWireDrawing: () => void;
  status: HTMLElement;
  placementType: () => number | undefined;
  setPlacementType: (value: number | undefined) => void;
  placementRotation: () => 0 | 1 | 2 | 3;
  setPlacementRotation: (value: 0 | 1 | 2 | 3) => void;
  selected: Map<string, Selectable>;
  commitSchema: (before: Schema) => void;
  clearActivePaletteCommand: () => void;
  renderPalette: () => void;
  placeTypeSelect: HTMLSelectElement | null;
  renderSchema: () => void;
  drag: () => DragState | undefined;
  setDrag: (value: DragState | undefined) => void;
  dragSnapshot: () => Schema | undefined;
  setDragSnapshot: (value: Schema | undefined) => void;
  openStampEditor: (key: StampKey) => void;
  drawNodeCursor: (point: Point) => void;
  moveGhost: (event: MouseEvent) => void;
  drawViewport: () => void;
  onElbowPreference: (value: Point | undefined) => void;
  placing: () => boolean;
  simulationMode: () => 'edit' | 'run';
  openProperties: (x: number, y: number) => void;
  activePaletteCommand: (value: number | undefined) => void;
  setPlacementRotationForDrop: (value: 0 | 1 | 2 | 3) => void;
  leaveNodeTool: () => void;
  clearDraftCursor: () => void;
  cancelWireDrawing: () => void;
}

export function setupCanvasInteractions(options: CanvasInteractionsOptions): void {
  setupPaletteDrop(options.ctx, {
    svg: options.svg,
    viewSize: options.viewSize,
    viewport: options.viewport,
    placementType: options.placementType,
    setPlacementType: options.setPlacementType,
    setActiveCommand: options.activePaletteCommand,
    setPlacementRotation: options.setPlacementRotationForDrop,
    leaveNodeTool: options.leaveNodeTool,
    moveGhost: options.moveGhost,
    selected: options.selected,
    commitSchema: options.commitSchema,
    renderSchema: options.renderSchema,
    status: options.status,
  });
  setupCanvasDoubleClick({
    svg: options.svg,
    wireDrawing: options.wireDrawing,
    placing: options.placing,
    panTool: options.panTool,
    nodeTool: options.nodeTool,
    spaceDown: options.spaceDown,
    simulationMode: options.simulationMode,
    selected: options.selected,
    renderSchema: options.renderSchema,
    openProperties: options.openProperties,
  });
  setupWireContextMenu(options.svg, {
    isDrawing: options.wireDrawing,
    draftPoints: options.draftPoints,
    clearDraftCursor: options.clearDraftCursor,
    drawDraft: options.drawDraft,
    updateHistoryButtons: options.updateHistoryButtons,
    cancelWireDrawing: options.cancelWireDrawing,
  });
  const pointerPosition = setupMovePreview(options.ctx, {
    drag: options.drag,
    wireLayer: options.wireLayer,
    elementLayer: options.elementLayer,
    selectionLayer: options.selectionLayer,
  });
  setupCanvasPointerDown(options.ctx, {
    svg: options.svg,
    viewSize: options.viewSize,
    viewport: options.viewport,
    setPointerSheetPosition: options.setPointerSheetPosition,
    nodeTool: options.nodeTool,
    panTool: options.panTool,
    spaceDown: options.spaceDown,
    simulation: options.simulation,
    placeNodeAt: options.placeNodeAt,
    wireDrawing: options.wireDrawing,
    draftPoints: options.draftPoints,
    setDraftCursor: options.setDraftCursor,
    drawDraft: options.drawDraft,
    updateHistoryButtons: options.updateHistoryButtons,
    finishWireDrawing: options.finishWireDrawing,
    status: options.status,
    placementType: options.placementType,
    setPlacementType: options.setPlacementType,
    placementRotation: options.placementRotation,
    setPlacementRotation: options.setPlacementRotation,
    selected: options.selected,
    commitSchema: options.commitSchema,
    clearActivePaletteCommand: options.clearActivePaletteCommand,
    renderPalette: options.renderPalette,
    placeTypeSelect: options.placeTypeSelect,
    renderSchema: options.renderSchema,
    setDrag: options.setDrag,
    drag: options.drag,
    setDragSnapshot: options.setDragSnapshot,
    openStampEditor: options.openStampEditor,
  });
  setupCanvasPointerMove(options.ctx, {
    svg: options.svg,
    viewSize: options.viewSize,
    viewport: options.viewport,
    setViewport: options.setViewport,
    drag: options.drag,
    setPointerSheetPosition: options.setPointerSheetPosition,
    setDraftCursor: (point) => {
      options.onElbowPreference(point);
      options.setDraftCursor(point);
    },
    cursorCoords: options.cursorCoords,
    nodeTool: options.nodeTool,
    drawNodeCursor: options.drawNodeCursor,
    moveGhost: options.moveGhost,
    wireDrawing: options.wireDrawing,
    drawDraft: options.drawDraft,
    drawViewport: options.drawViewport,
    scheduleMovePreview: pointerPosition.schedule,
    renderSchema: options.renderSchema,
  });
  const endInteraction = setupCanvasPointerEnd(options.ctx, {
    svg: options.svg,
    viewSize: options.viewSize,
    viewport: options.viewport,
    drag: options.drag,
    setDrag: options.setDrag,
    dragSnapshot: options.dragSnapshot,
    setDragSnapshot: options.setDragSnapshot,
    selected: options.selected,
    cancelMovePreview: pointerPosition.cancel,
    commitSchema: options.commitSchema,
    renderSchema: options.renderSchema,
  });
  options.svg.addEventListener('pointerup', endInteraction);
  options.svg.addEventListener('pointercancel', endInteraction);
}
