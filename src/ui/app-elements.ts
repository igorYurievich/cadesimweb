export interface AppElements {
  svg: SVGSVGElement;
  sheet: SVGGElement;
  wireLayer: SVGGElement;
  elementLayer: SVGGElement;
  selectionLayer: SVGGElement;
  draftLayer: SVGGElement;
  sheetFrame: SVGGElement;
  sheetStamp: SVGGElement;
  zoomValue: HTMLOutputElement;
  cursorCoords: HTMLOutputElement | null;
  status: HTMLDivElement;
  fileName: HTMLSpanElement;
  fileInput: HTMLInputElement;
  wireKindSelect: HTMLSelectElement;
  wireThicknessSelect: HTMLSelectElement;
  drawWireButton: HTMLButtonElement;
  panToolButton: HTMLButtonElement | null;
  nodeToolButton: HTMLButtonElement | null;
  selectToolButton: HTMLButtonElement | null;
  finishWireButton: HTMLButtonElement;
  undoButton: HTMLButtonElement;
  redoButton: HTMLButtonElement;
  paletteGroups: HTMLDivElement;
  paletteSearch: HTMLInputElement;
  paletteLanguage: HTMLSelectElement;
  paletteCount: HTMLSpanElement;
  propertyFields: HTMLDivElement;
  runButton: HTMLButtonElement;
  stopButton: HTMLButtonElement;
  simStateValue: HTMLSpanElement;
  speedButton: HTMLButtonElement;
  simulationMessage: HTMLDivElement;
  simulationMessageText: HTMLSpanElement;
  simulationContextMenu: HTMLDivElement;
  overloadAction: HTMLButtonElement;
  resetInputsAction: HTMLButtonElement;
}

function required<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error('Не удалось создать поле SVG.');
  return element;
}

export function queryAppElements(root: ParentNode): AppElements {
  return {
    svg: required(root, '.viewport-svg'),
    sheet: required(root, '#sheet-transform'),
    wireLayer: required(root, '#wire-layer'),
    elementLayer: required(root, '#element-layer'),
    selectionLayer: required(root, '#selection-layer'),
    draftLayer: required(root, '#draft-layer'),
    sheetFrame: required(root, '#sheet-frame'),
    sheetStamp: required(root, '#sheet-stamp'),
    zoomValue: required(root, '#zoom-value'),
    cursorCoords: root.querySelector('#cursor-coords'),
    status: required(root, '#status'),
    fileName: required(root, '#file-name'),
    fileInput: required(root, '#cad-file'),
    wireKindSelect: required(root, '#wire-kind'),
    wireThicknessSelect: required(root, '#wire-thickness'),
    drawWireButton: required(root, '#draw-wire'),
    panToolButton: root.querySelector('#pan-tool'),
    nodeToolButton: root.querySelector('#node-tool'),
    selectToolButton: root.querySelector('#select-tool'),
    finishWireButton: required(root, '#finish-wire'),
    undoButton: required(root, '#undo'),
    redoButton: required(root, '#redo'),
    paletteGroups: required(root, '#palette-groups'),
    paletteSearch: required(root, '#palette-search'),
    paletteLanguage: required(root, '#palette-language'),
    paletteCount: required(root, '#palette-count'),
    propertyFields: required(root, '#property-fields'),
    runButton: required(root, '#sim-run'),
    stopButton: required(root, '#sim-stop'),
    simStateValue: required(root, '#sim-state'),
    speedButton: required(root, '#speed-cycle'),
    simulationMessage: required(root, '#simulation-message'),
    simulationMessageText: required(root, '#simulation-message-text'),
    simulationContextMenu: required(root, '#simulation-context-menu'),
    overloadAction: required(root, '#simulate-overload'),
    resetInputsAction: required(root, '#reset-simulation-inputs'),
  };
}
