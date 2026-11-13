import type { Schema } from '@model/types';
import type { AppContext } from './context';
import type { Point, Viewport } from './viewport';
import { fitViewport } from './viewport';
import { cloneSchema, fullSheet } from './helpers';
import type { ExportActions } from './export';

export interface MenuSetup {
  fileInput: HTMLInputElement;
  status: HTMLElement;
  undoButton: HTMLButtonElement;
  redoButton: HTMLButtonElement;
  exportActions: ExportActions;
  requestNewSchema(): void;
  copySelection(): void;
  cutSelection(): void;
  pasteSelection(): void;
  rotateSelection(): void;
  deleteSelected(): void;
  toggleTheme(): void;
  toggleGrid(): void;
  toggleDockedProperties(): void;
  toggleWireColors(): void;
  setPaletteView(value: 'list' | 'icons'): void;
  commitSchema(before: Schema): void;
  renderSchema(): void;
  setViewport(viewport: Viewport): void;
  viewSize: Point;
  drawViewport(): void;
}

export function setupMenus(ctx: AppContext, deps: MenuSetup): void {
  const { root } = ctx;
  const menuGroups = [...root.querySelectorAll<HTMLDetailsElement>('.menu-group')];
  const closeMenus = (except?: HTMLDetailsElement): void => {
    for (const group of menuGroups) if (group !== except) {
      group.open = false; delete group.dataset.hover;
      group.querySelectorAll<HTMLDetailsElement>('.menu-submenu[open]').forEach((submenu) => { submenu.open = false; });
    }
  };
  for (const group of menuGroups) {
    group.addEventListener('toggle', () => {
      if (group.open) closeMenus(group);
      else group.querySelectorAll<HTMLDetailsElement>('.menu-submenu[open]').forEach((submenu) => { submenu.open = false; });
    });
    // Пока открыто одно меню, наведение на соседнее переключает меню; следующий клик по заголовку его не закрывает.
    group.addEventListener('pointerenter', () => {
      if (!menuGroups.some((other) => other.open && other !== group)) return;
      closeMenus(group); group.open = true; group.dataset.hover = '1';
    });
    group.querySelector('summary')?.addEventListener('click', (event) => {
      if (group.dataset.hover === '1') { event.preventDefault(); delete group.dataset.hover; }
    });
  }
  root.querySelector<HTMLElement>('.examples-menu > summary')?.addEventListener('click', (event) => {
    event.preventDefault();
    closeMenus();
    root.querySelector<HTMLDialogElement>('#examples-dialog')?.showModal();
  });
  window.addEventListener('pointerdown', (event) => { if (!(event.target as Element).closest('.app-menu')) closeMenus(); });
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenus(); });

  const sheetDialog = root.querySelector<HTMLDialogElement>('#sheet-dialog');
  const sheetFormat = root.querySelector<HTMLSelectElement>('#sheet-format');
  const sheetWidth = root.querySelector<HTMLInputElement>('#sheet-width');
  const sheetHeight = root.querySelector<HTMLInputElement>('#sheet-height');
  const syncSheetFormat = (): void => {
    if (!sheetFormat || !sheetWidth || !sheetHeight) return;
    const key = `${sheetWidth.value}x${sheetHeight.value}`;
    sheetFormat.value = [...sheetFormat.options].some((option) => option.value === key) ? key : 'custom';
  };
  const openSheetDialog = (): void => {
    if (!sheetDialog || !sheetWidth || !sheetHeight) return;
    sheetWidth.value = String(ctx.schema.sheet.width); sheetHeight.value = String(ctx.schema.sheet.height);
    syncSheetFormat(); sheetDialog.showModal();
  };
  sheetFormat?.addEventListener('change', () => {
    if (!sheetWidth || !sheetHeight || !sheetFormat || sheetFormat.value === 'custom') return;
    const [width, height] = sheetFormat.value.split('x'); sheetWidth.value = width!; sheetHeight.value = height!;
  });
  sheetWidth?.addEventListener('input', syncSheetFormat);
  sheetHeight?.addEventListener('input', syncSheetFormat);
  root.querySelector<HTMLButtonElement>('#sheet-apply')?.addEventListener('click', () => {
    if (!sheetWidth || !sheetHeight) return;
    const width = Number(sheetWidth.value); const height = Number(sheetHeight.value);
    const valid = (value: number): boolean => Number.isFinite(value) && value >= 30 && value <= 2000;
    if (!valid(width) || !valid(height)) { deps.status.textContent = 'Размер листа: допустимо от 30 до 2000 мм.'; return; }
    if (width !== ctx.schema.sheet.width || height !== ctx.schema.sheet.height) {
      const before = cloneSchema(ctx.schema);
      ctx.schema.sheet.width = width; ctx.schema.sheet.height = height;
      deps.commitSchema(before);
      deps.setViewport(fitViewport(fullSheet(ctx.schema.sheet), { width: deps.viewSize.x, height: deps.viewSize.y })); deps.drawViewport(); deps.renderSchema();
    }
    sheetDialog?.close();
  });
  sheetDialog?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || !(event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement)) return;
    event.preventDefault();
    root.querySelector<HTMLButtonElement>('#sheet-apply')?.click();
  });
  root.querySelector<HTMLElement>('.app-menu')?.addEventListener('click', (event) => {
    const command = (event.target as Element).closest<HTMLButtonElement>('[data-command]')?.dataset.command;
    if (!command) return;
    root.querySelectorAll<HTMLDetailsElement>('.menu-group[open]').forEach((menu) => {
      menu.removeAttribute('open');
      menu.querySelectorAll<HTMLDetailsElement>('.menu-submenu[open]').forEach((submenu) => { submenu.open = false; });
    });
    switch (command) {
      case 'new': deps.requestNewSchema(); break;
      case 'open': deps.fileInput.click(); break;
      case 'copy-selection': deps.copySelection(); break;
      case 'cut-selection': deps.cutSelection(); break;
      case 'paste-selection': deps.pasteSelection(); break;
      case 'save-json': deps.exportActions.saveJson(); break;
      case 'export-cad': deps.exportActions.exportCadFile(); break;
      case 'export-svg': deps.exportActions.exportSvgFile(); break;
      case 'export-png': deps.exportActions.exportPngFile(); break;
      case 'print-pdf': deps.exportActions.printPdf(); break;
      case 'undo': deps.undoButton.click(); break;
      case 'redo': deps.redoButton.click(); break;
      case 'rotate': deps.rotateSelection(); break;
      case 'delete': deps.deleteSelected(); break;
      case 'zoom-in': root.querySelector<HTMLButtonElement>('[data-zoom="in"]')?.click(); break;
      case 'zoom-out': root.querySelector<HTMLButtonElement>('[data-zoom="out"]')?.click(); break;
      case 'fit': root.querySelector<HTMLButtonElement>('[data-zoom="fit"]')?.click(); break;
      case 'theme': deps.toggleTheme(); break;
      case 'grid': deps.toggleGrid(); break;
      case 'properties-panel': deps.toggleDockedProperties(); break;
      case 'wire-colors': deps.toggleWireColors(); break;
      case 'palette-view-list': deps.setPaletteView('list'); break;
      case 'palette-view-icons': deps.setPaletteView('icons'); break;
      case 'sheet': openSheetDialog(); break;
      case 'shortcuts': root.querySelector<HTMLDialogElement>('#shortcuts-dialog')?.showModal(); break;
      case 'component-guide': root.querySelector<HTMLDialogElement>('#component-guide-dialog')?.showModal(); break;
      case 'about': root.querySelector<HTMLDialogElement>('#about-dialog')?.showModal(); break;
    }
  });
}
