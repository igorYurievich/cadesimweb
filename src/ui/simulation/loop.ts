import { createEmptyMemory, simulate } from '@engine/simulate';
import type { AppContext } from '../context';
import { startsOpen } from '../constants';
import { formatSimulationDiagnostics } from './diagnostics';
import { createSimInputs } from './state';
import type { SimulationDependencies, SimulationState } from './types';

export interface SimulationLoop {
  updateSimulationControls(): void;
  resetSimulation(): void;
  evaluateSimulation(): void;
  startSimulation(): void;
  stopSimulation(): void;
}

export function createSimulationLoop(
  ctx: AppContext,
  deps: SimulationDependencies,
  state: SimulationState,
  applyVisuals: () => void,
): SimulationLoop {
  const updateSimulationControls = (): void => updateControls(ctx, deps, state);
  const evaluateSimulation = (): void => evaluate(ctx, deps, state, applyVisuals);
  const resetSimulation = (): void => reset(ctx, state, updateSimulationControls, applyVisuals);
  const simulationTick = (timestamp: number): void => {
    if (state.mode !== 'run') { state.animationFrame = undefined; return; }
    const previous = state.lastFrameTime ?? timestamp;
    const elapsed = Math.min(0.25, Math.max(0, (timestamp - previous) / 1000));
    state.lastFrameTime = timestamp;
    state.time += elapsed * state.speed;
    evaluateSimulation();
    state.animationFrame = requestAnimationFrame(simulationTick);
  };
  const startSimulation = (): void => {
    if (state.mode === 'run') return;
    for (const element of ctx.schema.elements) {
      if (startsOpen(element.typeCode) && state.inputs.toggled[element.id] === undefined) {
        state.inputs.toggled[element.id] = false;
      }
    }
    state.mode = 'run';
    state.lastFrameTime = undefined;
    evaluateSimulation();
    deps.clearSelection();
    state.animationFrame = requestAnimationFrame(simulationTick);
  };
  const stopSimulation = (): void => {
    state.heldInputs.clear();
    deps.simulationContextMenu.hidden = true;
    resetSimulation();
    deps.renderSchema();
    deps.status.textContent = 'Симуляция остановлена.';
  };
  return { updateSimulationControls, resetSimulation, evaluateSimulation, startSimulation, stopSimulation };
}

function updateControls(ctx: AppContext, deps: SimulationDependencies, state: SimulationState): void {
  const running = state.mode === 'run';
  deps.runButton.disabled = running;
  deps.stopButton.disabled = state.mode === 'edit';
  const label = running ? deps.uiText().running : deps.uiText().editor;
  if (deps.simStateValue.textContent !== label) deps.simStateValue.textContent = label;
  deps.simStateValue.dataset.mode = state.mode;
  const diagnostics = formatSimulationDiagnostics(ctx, deps, state.result);
  if (diagnostics.length) deps.simStateValue.title = diagnostics.join('\n');
  else if (state.result?.warnings.length) deps.simStateValue.title = state.result.warnings.join('\n');
  else deps.simStateValue.removeAttribute('title');
}

function reset(
  ctx: AppContext,
  state: SimulationState,
  updateControls: () => void,
  applyVisuals: () => void,
): void {
  if (state.animationFrame !== undefined) cancelAnimationFrame(state.animationFrame);
  state.animationFrame = undefined;
  state.lastFrameTime = undefined;
  state.mode = 'edit';
  state.time = 0;
  state.memory = createEmptyMemory();
  state.inputs = createSimInputs(ctx);
  state.result = undefined;
  updateControls();
  applyVisuals();
}

function evaluate(
  ctx: AppContext,
  deps: SimulationDependencies,
  state: SimulationState,
  applyVisuals: () => void,
): void {
  state.result = simulate({ schema: ctx.schema, inputs: state.inputs, time: state.time, memory: state.memory });
  state.memory = state.result.memory;
  updateControls(ctx, deps, state);
  applyVisuals();
}
