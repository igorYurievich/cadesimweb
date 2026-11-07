export interface ToolModesSetup {
  svg: SVGSVGElement; panButton: HTMLButtonElement | null; nodeButton: HTMLButtonElement | null;
  selectButton: HTMLButtonElement | null; panTool(): boolean; setPanToolState(value: boolean): void;
  nodeTool(): boolean; setNodeToolState(value: boolean): void; status: HTMLElement;
  wireDrawing(): boolean; cancelWireDrawing(): void; placementType(): number | undefined;
  setPlacementType(value: number | undefined): void; setPlacementRotation(value: 0 | 1 | 2 | 3): void;
  clearActivePaletteCommand(): void; renderPalette(): void; placeTypeSelect(): HTMLSelectElement | null;
}

export function setupToolModes(deps: ToolModesSetup) {
  const syncToolButtons = (): void => {
    const panTool = deps.panTool(); const nodeTool = deps.nodeTool();
    deps.svg.classList.toggle('is-pan-tool', panTool); deps.svg.classList.toggle('is-node-tool', nodeTool);
    deps.panButton?.classList.toggle('is-active', panTool); deps.panButton?.setAttribute('aria-pressed', String(panTool));
    deps.nodeButton?.classList.toggle('is-active', nodeTool); deps.nodeButton?.setAttribute('aria-pressed', String(nodeTool));
    deps.selectButton?.classList.toggle('is-active', !panTool && !nodeTool);
    deps.selectButton?.setAttribute('aria-pressed', String(!panTool && !nodeTool));
  };
  const leaveNodeTool = (): void => { if (deps.nodeTool()) { deps.setNodeToolState(false); syncToolButtons(); } };
  const setPanTool = (on: boolean): void => {
    deps.setPanToolState(on);
    if (on) deps.setNodeToolState(false);
    syncToolButtons();
    if (on) deps.status.textContent = 'Рука: тяните лист левой кнопкой мыши. Нажмите ↖ или V, чтобы вернуться к курсору.';
  };
  const selectTool = (): void => {
    leaveNodeTool();
    if (deps.wireDrawing()) deps.cancelWireDrawing();
    if (deps.placementType() !== undefined) {
      deps.setPlacementType(undefined); deps.setPlacementRotation(0); deps.clearActivePaletteCommand(); deps.renderPalette();
      const select = deps.placeTypeSelect(); if (select) select.value = '';
      deps.svg.classList.remove('is-placing');
    }
    setPanTool(false);
    deps.status.textContent = 'Курсор: выбор и перемещение элементов.';
  };
  const setNodeTool = (on: boolean): void => {
    if (!on) { leaveNodeTool(); deps.status.textContent = 'Курсор: выбор и перемещение элементов.'; return; }
    if (deps.wireDrawing()) deps.cancelWireDrawing();
    if (deps.placementType() !== undefined) {
      deps.setPlacementType(undefined); deps.setPlacementRotation(0); deps.clearActivePaletteCommand(); deps.renderPalette();
      const select = deps.placeTypeSelect(); if (select) select.value = '';
      deps.svg.classList.remove('is-placing');
    }
    deps.setPanToolState(false); deps.setNodeToolState(true); syncToolButtons();
    deps.status.textContent = 'Узел: щёлкните по месту, где провода соединяются или пересекаются. Esc или V — выйти.';
  };
  return { syncToolButtons, leaveNodeTool, setPanTool, selectTool, setNodeTool };
}
