import type { EngineState, UserInputs } from '@engine/types';
import type { AppContext } from '../context';
import { showSimulationContextMenu } from './context-menu';
import { createSimulationInputs } from './inputs';
import { createSimulationLoop } from './loop';
import { createSimulationState } from './state';
import type { SimulationDependencies } from './types';
import { applySimulationVisuals } from './visuals';
import { rebuildWireTerminalMap } from './wire-map';

export interface SimulationController {
  readonly mode: 'edit' | 'run';
  readonly paused: boolean;
  speed: number;
  readonly inputs: UserInputs;
  /** Последний расчёт движка (для мультиметра); в редакторе undefined. */
  readonly result: EngineState | undefined;
  readonly heldInputs: Set<number>;
  contextElementId: number | undefined;
  isMomentaryType(typeCode: number): boolean;
  isMaintainedType(typeCode: number): boolean;
  isTrippableType(typeCode: number): boolean;
  rebuildWireTerminalMap(): void;
  applySimulationInput(): void;
  updateSimulationControls(): void;
  applySimulationVisuals(): void;
  resetSimulation(): void;
  evaluateSimulation(): void;
  startSimulation(): void;
  stopSimulation(): void;
  togglePause(): void;
  pressMomentary(id: number): void;
  releaseMomentary(id: number): void;
  resetSimulationInputs(): void;
  simulateOverload(id: number): void;
  showSimulationContextMenu(event: MouseEvent, elementId?: number): void;
}

export interface SimulationSetup extends SimulationDependencies {}

export function setupSimulation(ctx: AppContext, deps: SimulationSetup): SimulationController {
  const state = createSimulationState();
  const applyVisuals = (): void => applySimulationVisuals(ctx, deps, state);
  const loop = createSimulationLoop(ctx, deps, state, applyVisuals);
  const inputs = createSimulationInputs(ctx, deps, state, loop);
  const rebuild = (): void => rebuildWireTerminalMap(ctx, state);
  const showContextMenu = (event: MouseEvent, elementId?: number): void =>
    showSimulationContextMenu(ctx, deps, state, inputs, event, elementId);
  return {
    get mode() { return state.mode; },
    get paused() { return state.paused; },
    get speed() { return state.speed; },
    set speed(value) { state.speed = value; },
    get inputs() { return state.inputs; },
    get result() { return state.mode === 'run' ? state.result : undefined; },
    heldInputs: state.heldInputs,
    get contextElementId() { return state.contextElementId; },
    set contextElementId(value) { state.contextElementId = value; },
    isMomentaryType: inputs.isMomentaryType,
    isMaintainedType: inputs.isMaintainedType,
    isTrippableType: inputs.isTrippableType,
    rebuildWireTerminalMap: rebuild,
    applySimulationInput: inputs.applySimulationInput,
    updateSimulationControls: loop.updateSimulationControls,
    applySimulationVisuals: applyVisuals,
    resetSimulation: loop.resetSimulation,
    evaluateSimulation: loop.evaluateSimulation,
    startSimulation: loop.startSimulation,
    stopSimulation: loop.stopSimulation,
    togglePause: loop.togglePause,
    pressMomentary: inputs.pressMomentary,
    releaseMomentary: inputs.releaseMomentary,
    resetSimulationInputs: inputs.resetSimulationInputs,
    simulateOverload: inputs.simulateOverload,
    showSimulationContextMenu: showContextMenu,
  };
}

