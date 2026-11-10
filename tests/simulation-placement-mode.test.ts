import { describe, expect, it } from 'vitest';
import { setupEditorToolbar } from '../src/ui/editor-toolbar';
import type { SimulationController } from '../src/ui/sim-controller';
import type { AppContext } from '../src/ui/context';
import type { Selectable } from '../src/ui/constants';
import { setupToolModes } from '../src/ui/tool-modes';

function createEventTarget() {
  const listeners = new Map<string, EventListener>();
  return {
    listeners,
    addEventListener: (name: string, callback: EventListener) => listeners.set(name, callback),
    setAttribute: () => undefined,
    textContent: '',
  };
}

function createPlacementHarness(events: string[]) {
  const classes = new Set(['is-placing']);
  const svg = {
    classList: {
      contains: (name: string) => classes.has(name),
      toggle: (name: string, active: boolean) => {
        if (active) classes.add(name);
        else classes.delete(name);
        return active;
      },
      remove: (...names: string[]) => names.forEach((name) => classes.delete(name)),
    },
  } as unknown as SVGSVGElement;
  const status = { textContent: '' } as HTMLElement;
  const placeSelect = { value: '2001' } as HTMLSelectElement;
  let placementType: number | undefined = 2001;
  let rotation: 0 | 1 | 2 | 3 = 2;
  let paletteCommand: number | undefined = 32833;
  let wireDrawing = true;
  const tools = setupToolModes({
    svg, panButton: null, nodeButton: null, selectButton: null,
    panTool: () => false, setPanToolState: () => undefined,
    nodeTool: () => false, setNodeToolState: () => undefined, status,
    wireDrawing: () => wireDrawing,
    cancelWireDrawing: () => { wireDrawing = false; events.push('cancel-wire'); },
    placementType: () => placementType,
    setPlacementType: (value) => { placementType = value; },
    setPlacementRotation: (value) => { rotation = value; },
    clearActivePaletteCommand: () => { paletteCommand = undefined; },
    renderPalette: () => events.push('render-palette'),
    placeTypeSelect: () => placeSelect,
  });
  return {
    selectTool: tools.selectTool,
    placeSelect,
    classes,
    get placementType() { return placementType; },
    get rotation() { return rotation; },
    get paletteCommand() { return paletteCommand; },
  };
}

function triggerRunButton(selectTool: () => void, events: string[]): void {
  const button = () => createEventTarget() as unknown as HTMLButtonElement;
  const select = createEventTarget() as unknown as HTMLSelectElement;
  const runButton = createEventTarget();
  const simulation = {
    speed: 1,
    startSimulation: () => events.push('start-simulation'),
    stopSimulation: () => undefined,
    updateSimulationControls: () => undefined,
  } as unknown as SimulationController;
  setupEditorToolbar({
    ctx: {} as AppContext,
    wireKindSelect: select, wireThicknessSelect: select,
    drawWireButton: button(), finishWireButton: button(),
    undoButton: button(), redoButton: button(),
    runButton: runButton as unknown as HTMLButtonElement,
    stopButton: button(), speedButton: button(),
    selected: new Map<string, Selectable>(),
    wireDrawing: () => false, draftPoints: () => [],
    undoDraftPoint: () => undefined, drawDraft: () => undefined,
    updateHistoryButtons: () => undefined,
    toggleWireDrawing: () => undefined, finishWireDrawing: () => undefined,
    selectTool, undo: () => undefined, redo: () => undefined,
    commitSchema: () => undefined, renderSchema: () => undefined, simulation,
  });
  runButton.listeners.get('click')?.(new Event('click'));
}

describe('simulation launch tool mode', () => {
  it('clears pending placement and restores the cursor before simulation starts', () => {
    const events: string[] = [];
    const harness = createPlacementHarness(events);
    triggerRunButton(harness.selectTool, events);

    expect(harness.placementType).toBeUndefined();
    expect(harness.rotation).toBe(0);
    expect(harness.paletteCommand).toBeUndefined();
    expect(harness.placeSelect.value).toBe('');
    expect(harness.classes.has('is-placing')).toBe(false);
    expect(events).toEqual(['cancel-wire', 'render-palette', 'start-simulation']);
  });
});
