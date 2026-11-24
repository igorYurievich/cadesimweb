import { CAD_GRID_STEP } from './constants';

export interface KeyboardShortcutsSetup {
  root: HTMLElement; simulationContextMenu: HTMLElement; fileInput: HTMLInputElement;
  spaceDown(value: boolean): void; panTool(): boolean; setPanTool(value: boolean): void;
  nodeTool(): boolean; setNodeTool(value: boolean): void; selectTool(): void;
  copySelection(): void; cutSelection(): void; pasteSelection(): void; saveJson(): void; requestNewSchema(): void;
  undo(redo: boolean): void; wireDrawing(): boolean; changeWireRoute(key: string): void;
  toggleWireDrawing(): void; cycleWireKind(direction: -1 | 1): void;
  finishWireDrawing(): void; cancelPlacement(): void; cancelWireDrawing(): void;
  placing(): boolean;
  selectedCount(): number; clearSelection(): void; deleteSelected(): void; rotateSelection(): void;
  nudgeSelection(dx: number, dy: number): void;
  /** «+»/«−» по выделенным надписям: true, если размер текста изменён (иначе — масштаб вида). */
  resizeSelectedText(direction: 1 | -1): boolean;
}

export function setupKeyboardShortcuts(deps: KeyboardShortcutsSetup): void {
  window.addEventListener('keydown', (event) => {
    const input = event.target instanceof HTMLInputElement;
    const textarea = event.target instanceof HTMLTextAreaElement;
    const select = event.target instanceof HTMLSelectElement;
    const editingField = input || textarea || select;
    const placementSelectFocused = select && event.target.id === 'place-type';
    if (event.code === 'Space' && !input && !textarea && !select) {
      deps.spaceDown(true); event.preventDefault();
    }
    if (deps.root.querySelector('dialog[open]')) return;
    // Ctrl+Tab / Ctrl+Shift+Tab — следующая / предыдущая схема в панели вкладок. Только в установленном
    // приложении (PWA): в обычном браузере это сочетание забирает сам браузер (вкладки браузера).
    if (event.key === 'Tab' && event.ctrlKey && !event.altKey && !event.metaKey && isInstalledApp()) {
      event.preventDefault();
      switchDocumentTab(deps.root, event.shiftKey ? -1 : 1);
      return;
    }
    if (!deps.simulationContextMenu.hidden && event.key === 'Escape') {
      deps.simulationContextMenu.hidden = true; event.preventDefault(); return;
    }
    if (!event.ctrlKey && !event.metaKey && !event.altKey && !editingField && event.code === 'KeyC' && !event.repeat) {
      deps.toggleWireDrawing(); event.preventDefault(); return;
    }
    if (!event.ctrlKey && !event.metaKey && !event.altKey && !editingField && event.key.toLowerCase() === 'h') {
      deps.setPanTool(!deps.panTool()); event.preventDefault(); return;
    }
    if (!event.ctrlKey && !event.metaKey && !event.altKey && !editingField && event.key.toLowerCase() === 'n') {
      deps.setNodeTool(!deps.nodeTool()); event.preventDefault(); return;
    }
    if (event.key === 'Escape' && deps.panTool() && !editingField) { deps.selectTool(); event.preventDefault(); return; }
    if (event.key === 'Escape' && deps.nodeTool() && !editingField) { deps.selectTool(); event.preventDefault(); return; }
    if (!event.ctrlKey && !event.metaKey && !event.altKey && !editingField && event.key.toLowerCase() === 'v') {
      deps.selectTool(); event.preventDefault(); return;
    }
    const modifier = event.ctrlKey || event.metaKey;
    const wireTypeSelectFocused = select && event.target.id === 'wire-kind';
    if (deps.wireDrawing() && (!editingField || wireTypeSelectFocused) && !modifier && !event.altKey) {
      const wireDirection = event.code === 'ArrowLeft' || event.code === 'ArrowUp' ? -1
        : event.code === 'ArrowRight' || event.code === 'ArrowDown' ? 1 : 0;
      if (wireDirection) { deps.cycleWireKind(wireDirection); event.preventDefault(); return; }
    }
    if (modifier && !editingField && event.code === 'KeyC') { deps.copySelection(); event.preventDefault(); return; }
    if (modifier && !editingField && event.code === 'KeyX') { deps.cutSelection(); event.preventDefault(); return; }
    if (modifier && !editingField && event.code === 'KeyV') { deps.pasteSelection(); event.preventDefault(); return; }
    if (!editingField && !modifier && !event.altKey && deps.selectedCount()) {
      const step = CAD_GRID_STEP;
      const movement: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      const delta = movement[event.code];
      if (delta) { deps.nudgeSelection(delta[0], delta[1]); event.preventDefault(); return; }
    }
    if (modifier && !event.shiftKey && !editingField && event.key.toLowerCase() === 's') { deps.saveJson(); event.preventDefault(); return; }
    if (modifier && !editingField && event.key.toLowerCase() === 'n') { deps.requestNewSchema(); event.preventDefault(); return; }
    if (modifier && !editingField && event.key.toLowerCase() === 'o') { deps.fileInput.click(); event.preventDefault(); return; }
    if (modifier && !editingField && event.key === '0') { deps.root.querySelector<HTMLButtonElement>('[data-zoom="fit"]')?.click(); event.preventDefault(); return; }
    const textStep = event.key === '+' || event.key === '=' ? 1 : event.key === '-' || event.key === '_' ? -1 : 0;
    if (!editingField && !modifier && textStep && deps.resizeSelectedText(textStep)) { event.preventDefault(); return; }
    if (!editingField && (event.key === '+' || event.key === '=')) { deps.root.querySelector<HTMLButtonElement>('[data-zoom="in"]')?.click(); event.preventDefault(); return; }
    if (!editingField && (event.key === '-' || event.key === '_')) { deps.root.querySelector<HTMLButtonElement>('[data-zoom="out"]')?.click(); event.preventDefault(); return; }
    const isTextField = textarea || (input && !['checkbox', 'radio', 'button', 'range'].includes((event.target as HTMLInputElement).type));
    if (modifier && !isTextField && event.code === 'KeyZ') { deps.undo(event.shiftKey); event.preventDefault(); return; }
    if (modifier && !isTextField && event.code === 'KeyY') { deps.undo(true); event.preventDefault(); return; }
    if (deps.wireDrawing() && !editingField && (event.key === 'Tab' || event.code === 'KeyF') && !modifier) {
      deps.changeWireRoute(event.key); event.preventDefault(); return;
    }
    if (event.key === 'Enter' && deps.wireDrawing()) { deps.finishWireDrawing(); event.preventDefault(); return; }
    if (event.key === 'Escape') {
      if (deps.placing()) { deps.cancelPlacement(); event.preventDefault(); }
      else if (deps.wireDrawing()) { deps.cancelWireDrawing(); event.preventDefault(); }
      else if (deps.selectedCount()) deps.clearSelection();
    }
    if (!editingField && (event.key === 'Delete' || event.key === 'Backspace')) { deps.deleteSelected(); event.preventDefault(); }
    if ((!editingField || placementSelectFocused) && event.code === 'KeyR') { deps.rotateSelection(); event.preventDefault(); }
  });
  window.addEventListener('keyup', (event) => { if (event.code === 'Space') deps.spaceDown(false); });
}

/** Программа запущена как установленное приложение (PWA), а не во вкладке браузера. */
export function isInstalledApp(): boolean {
  try {
    if ((navigator as Navigator & { standalone?: boolean }).standalone) return true;
    return ['standalone', 'minimal-ui', 'window-controls-overlay']
      .some((mode) => window.matchMedia(`(display-mode: ${mode})`).matches);
  } catch {
    return false;
  }
}

/** Активировать соседнюю вкладку схемы (по кругу); ничего не делает, если схема одна. */
function switchDocumentTab(root: HTMLElement, direction: 1 | -1): void {
  const tabs = [...root.querySelectorAll<HTMLButtonElement>('.document-tab .document-tab-select')];
  if (tabs.length < 2) return;
  const current = tabs.findIndex((tab) => tab.closest('.document-tab')?.classList.contains('is-active'));
  const next = tabs[(Math.max(0, current) + direction + tabs.length) % tabs.length];
  next?.click();
}
