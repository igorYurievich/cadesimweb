import type { Schema } from '@model/types';
import type { AppContext } from './context';
import type { Point, Viewport } from './viewport';
import { fitViewport } from './viewport';
import { growProgramPagesToContent, programPageSize } from '@model/program-pages';
import { activeProgramPage, pageViewport } from './program-pages-view';
import { cloneSchema, fullSheet } from './helpers';
import type { ExportCommands } from './export-lazy';
import { currentText, fillText } from './i18n';

export interface MenuSetup {
  fileInput: HTMLInputElement;
  status: HTMLElement;
  undoButton: HTMLButtonElement;
  redoButton: HTMLButtonElement;
  exportActions: ExportCommands;
  requestNewSchema(): void;
  copySelection(): void;
  cutSelection(): void;
  pasteSelection(): void;
  rotateSelection(): void;
  deleteSelected(): void;
  toggleTheme(): void;
  toggleGrid(): void;
  toggleDockedProperties(): void;
  setPaletteView(value: 'list' | 'icons'): void;
  commitSchema(before: Schema): void;
  renderSchema(): void;
  setViewport(viewport: Viewport): void;
  viewSize: Point;
  drawViewport(): void;
}

/**
 * На узком экране шапка прокручивается вбок (overflow-x: auto) и обрезает выпадающее меню по своей высоте:
 * меню открывается, но его не видно и не нажать. Тогда меню ставится position: fixed под заголовком.
 */
function placePopover(group: HTMLDetailsElement): void {
  const popover = group.querySelector<HTMLElement>(':scope > .menu-popover');
  if (!popover) return;
  const header = group.closest<HTMLElement>('.app-header');
  const clipped = header !== null && getComputedStyle(header).overflowX !== 'visible';
  popover.classList.toggle('is-fixed', group.open && clipped);
  if (!group.open || !clipped) { popover.style.cssText = ''; return; }
  const anchor = (group.querySelector('summary') ?? group).getBoundingClientRect();
  const margin = 8;
  const top = anchor.bottom + 6;
  const width = Math.min(popover.offsetWidth || 232, window.innerWidth - 2 * margin);
  const left = Math.max(margin, Math.min(anchor.left, window.innerWidth - width - margin));
  Object.assign(popover.style, {
    position: 'fixed', top: `${top}px`, left: `${left}px`, right: 'auto', zIndex: '60',
    maxWidth: `${window.innerWidth - 2 * margin}px`, maxHeight: `${window.innerHeight - top - margin}px`,
    overflowY: 'auto',
  });
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
      placePopover(group);
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
  // На телефоне «Ayuda» сразу открывает «Acerca de»: горячие клавиши и метки палитры там не нужны.
  const aboutCommand = root.querySelector<HTMLButtonElement>('.menu-group [data-command="about"]');
  aboutCommand?.closest('.menu-group')?.querySelector('summary')?.addEventListener('click', (event) => {
    if (root.dataset.mobile !== 'true') return;
    event.preventDefault();
    closeMenus();
    aboutCommand.click();
  });
  root.querySelector<HTMLElement>('.examples-menu > summary')?.addEventListener('click', (event) => {
    event.preventDefault();
    closeMenus();
    root.querySelector<HTMLDialogElement>('#examples-dialog')?.showModal();
  });
  window.addEventListener('pointerdown', (event) => { if (!(event.target as Element).closest('.app-menu')) closeMenus(); });
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenus(); });
  // Меню на узком экране закреплено под заголовком (placePopover): при прокрутке шапки закрываем его.
  root.querySelector('.app-header')?.addEventListener('scroll', () => closeMenus(), { passive: true });

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
    // На листе программы ПЛК правим размер листов программ (program-pages.ts), иначе — основного листа.
    const size = activeProgramPage() >= 1 ? programPageSize(ctx.schema.sheet) : ctx.schema.sheet;
    sheetWidth.value = String(size.width); sheetHeight.value = String(size.height);
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
    if (!valid(width) || !valid(height)) { deps.status.textContent = currentText().sheetSizeInvalid; return; }
    const page = activeProgramPage();
    if (page >= 1) {
      // Лист программы не шире основного листа: в .cad программа пишется полосами справа от его рамки.
      const sheet = ctx.schema.sheet;
      const pageWidth = Math.min(width, sheet.width);
      if (pageWidth !== programPageSize(sheet).width || height !== programPageSize(sheet).height) {
        const before = cloneSchema(ctx.schema);
        sheet.programPageWidth = pageWidth; sheet.programPageHeight = height;
        // Меньше содержимого лист не делаем: Ladder, который уже нарисован, должен остаться на листе.
        const grown = growProgramPagesToContent(ctx.schema);
        deps.commitSchema(before);
        deps.setViewport(pageViewport(ctx.schema, page, deps.viewSize)); deps.drawViewport(); deps.renderSchema();
        const size = programPageSize(sheet);
        if (grown) deps.status.textContent = fillText(currentText().programSheetTooSmall, size);
      }
      if (pageWidth < width) deps.status.textContent = fillText(currentText().programSheetWidth, { width: pageWidth });
      sheetDialog?.close();
      return;
    }
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
      case 'palette-view-list': deps.setPaletteView('list'); break;
      case 'palette-view-icons': deps.setPaletteView('icons'); break;
      case 'sheet': openSheetDialog(); break;
      case 'shortcuts': root.querySelector<HTMLDialogElement>('#shortcuts-dialog')?.showModal(); break;
      case 'component-guide': root.querySelector<HTMLDialogElement>('#component-guide-dialog')?.showModal(); break;
      case 'about': root.querySelector<HTMLDialogElement>('#about-dialog')?.showModal(); break;
    }
  });
}
