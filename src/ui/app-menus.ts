import type { AppContext } from './context';
import { setupCadExportConfirmation, setupExport } from './export';
import type { ExportActions } from './export';
import { setupMenus } from './menus';
import type { Viewport, Point } from './viewport';
import type { Schema } from '@model/types';

export interface AppMenuOptions {
  ctx: AppContext;
  root: HTMLElement;
  svg: SVGSVGElement;
  status: HTMLElement;
  fileInput: HTMLInputElement;
  undoButton: HTMLButtonElement;
  redoButton: HTMLButtonElement;
  requestNewSchema: () => void;
  copySelection: () => void;
  cutSelection: () => void;
  pasteSelection: () => void;
  rotateSelection: () => void;
  deleteSelected: () => void;
  toggleTheme: () => void;
  toggleGrid: () => void;
  toggleDockedProperties: () => void;
  toggleWireColors: () => void;
  setPaletteView: (value: 'list' | 'icons') => void;
  commitSchema: (before: Schema) => void;
  renderSchema: () => void;
  setViewport: (viewport: Viewport) => void;
  viewSize: Point;
  drawViewport: () => void;
}

export function setupAppMenus(options: AppMenuOptions): ExportActions {
  const exportActions = setupExport(
    options.ctx,
    options.svg,
    options.status,
    setupCadExportConfirmation(options.root),
  );
  setupMenus(options.ctx, {
    fileInput: options.fileInput,
    status: options.status,
    undoButton: options.undoButton,
    redoButton: options.redoButton,
    exportActions,
    requestNewSchema: options.requestNewSchema,
    copySelection: options.copySelection,
    cutSelection: options.cutSelection,
    pasteSelection: options.pasteSelection,
    rotateSelection: options.rotateSelection,
    deleteSelected: options.deleteSelected,
    toggleTheme: options.toggleTheme,
    toggleGrid: options.toggleGrid,
    toggleDockedProperties: options.toggleDockedProperties,
    toggleWireColors: options.toggleWireColors,
    setPaletteView: options.setPaletteView,
    commitSchema: options.commitSchema,
    renderSchema: options.renderSchema,
    setViewport: options.setViewport,
    viewSize: options.viewSize,
    drawViewport: options.drawViewport,
  });
  options.root.querySelector<HTMLButtonElement>('#rotate-selection')
    ?.addEventListener('click', options.rotateSelection);
  options.root.querySelector<HTMLButtonElement>('#delete-selection')
    ?.addEventListener('click', options.deleteSelected);
  return exportActions;
}
