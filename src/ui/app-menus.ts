import type { AppContext } from './context';
import { setupLazyExport } from './export-lazy';
import type { ExportCommands } from './export-lazy';
import { setupMenus } from './menus';
import { setupPrintPreview } from './print-preview';
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
  /** Файл записан на устройство: снять «*» с вкладки. */
  onSaved: () => void;
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

export function setupAppMenus(options: AppMenuOptions): ExportCommands {
  const exportActions = setupLazyExport(options.ctx, options.root, options.svg, options.status, options.onSaved);
  // Кусок «экспорт» докачивается в фоне после запуска: потом сохранение срабатывает сразу и без сети.
  if (typeof window !== 'undefined') window.setTimeout(() => { void exportActions.preload(); }, 2500);
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
  setupPrintPreview(options.ctx, options.root, exportActions);
  options.root.querySelector<HTMLButtonElement>('#rotate-selection')
    ?.addEventListener('click', options.rotateSelection);
  options.root.querySelector<HTMLButtonElement>('#delete-selection')
    ?.addEventListener('click', options.deleteSelected);
  return exportActions;
}
