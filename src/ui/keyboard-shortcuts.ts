export interface KeyboardShortcutsSetup {
  root: HTMLElement; simulationContextMenu: HTMLElement; fileInput: HTMLInputElement;
  spaceDown(value: boolean): void; panTool(): boolean; setPanTool(value: boolean): void;
  nodeTool(): boolean; setNodeTool(value: boolean): void; selectTool(): void;
  copySelection(): void; pasteSelection(): void; saveJson(): void; requestNewSchema(): void;
  undo(redo: boolean): void; wireDrawing(): boolean; changeWireRoute(key: string): void;
  finishWireDrawing(): void; cancelPlacement(): void; cancelWireDrawing(): void;
  placing(): boolean;
  selectedCount(): number; clearSelection(): void; deleteSelected(): void; rotateSelection(): void;
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
    if (!deps.simulationContextMenu.hidden && event.key === 'Escape') {
      deps.simulationContextMenu.hidden = true; event.preventDefault(); return;
    }
    if (!event.ctrlKey && !event.metaKey && !event.altKey && !editingField && event.key.toLowerCase() === 'h') {
      deps.setPanTool(!deps.panTool()); event.preventDefault(); return;
    }
    if (!event.ctrlKey && !event.metaKey && !event.altKey && !editingField && event.key.toLowerCase() === 'n') {
      deps.setNodeTool(!deps.nodeTool()); event.preventDefault(); return;
    }
    if (event.key === 'Escape' && deps.nodeTool() && !editingField) { deps.selectTool(); event.preventDefault(); return; }
    if (!event.ctrlKey && !event.metaKey && !event.altKey && !editingField && event.key.toLowerCase() === 'v') {
      deps.selectTool(); event.preventDefault(); return;
    }
    const modifier = event.ctrlKey || event.metaKey;
    if (modifier && !editingField && event.key.toLowerCase() === 'c') { deps.copySelection(); event.preventDefault(); return; }
    if (modifier && !editingField && event.key.toLowerCase() === 'v') { deps.pasteSelection(); event.preventDefault(); return; }
    if (modifier && !event.shiftKey && !editingField && event.key.toLowerCase() === 's') { deps.saveJson(); event.preventDefault(); return; }
    if (modifier && !editingField && event.key.toLowerCase() === 'n') { deps.requestNewSchema(); event.preventDefault(); return; }
    if (modifier && !editingField && event.key.toLowerCase() === 'o') { deps.fileInput.click(); event.preventDefault(); return; }
    if (modifier && !editingField && event.key === '0') { deps.root.querySelector<HTMLButtonElement>('[data-zoom="fit"]')?.click(); event.preventDefault(); return; }
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
    if ((!editingField || placementSelectFocused) && event.key.toLowerCase() === 'r') { deps.rotateSelection(); event.preventDefault(); }
  });
  window.addEventListener('keyup', (event) => { if (event.code === 'Space') deps.spaceDown(false); });
}
