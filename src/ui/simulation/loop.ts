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
  /** Пауза ↔ продолжение. На паузе время не идёт (таймеры, выдержки, мигание стоят), кнопки схемы работают. */
  togglePause(): void;
}

/** Кнопка паузы лежит рядом с «Запуск» (app-shell.ts). */
const pauseButtonOf = (deps: SimulationDependencies): HTMLButtonElement | null =>
  deps.runButton.parentElement?.querySelector<HTMLButtonElement>('#sim-pause') ?? null;

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
    if (state.mode !== 'run' || state.paused) { state.animationFrame = undefined; return; }
    const previous = state.lastFrameTime ?? timestamp;
    const elapsed = Math.min(0.25, Math.max(0, (timestamp - previous) / 1000));
    state.lastFrameTime = timestamp;
    state.time += elapsed * state.speed;
    evaluateSimulation();
    state.animationFrame = requestAnimationFrame(simulationTick);
  };
  const resume = (): void => {
    state.paused = false;
    state.lastFrameTime = undefined;
    updateSimulationControls();
    applyVisuals();
    if (state.animationFrame === undefined) state.animationFrame = requestAnimationFrame(simulationTick);
  };
  const togglePause = (): void => {
    if (state.mode !== 'run') return;
    if (state.paused) { resume(); deps.status.textContent = deps.uiText().running; return; }
    state.paused = true;
    if (state.animationFrame !== undefined) cancelAnimationFrame(state.animationFrame);
    state.animationFrame = undefined;
    updateSimulationControls();
    deps.status.textContent = deps.uiText().paused;
  };
  const startSimulation = (): void => {
    if (state.mode === 'run') { if (state.paused) resume(); return; }
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
  return { updateSimulationControls, resetSimulation, evaluateSimulation, startSimulation, stopSimulation, togglePause };
}

function updateControls(ctx: AppContext, deps: SimulationDependencies, state: SimulationState): void {
  const running = state.mode === 'run';
  const paused = running && state.paused;
  deps.runButton.disabled = running && !paused;
  deps.stopButton.disabled = state.mode === 'edit';
  const pause = pauseButtonOf(deps);
  if (pause) {
    pause.disabled = !running;
    pause.setAttribute('aria-pressed', String(paused));
  }
  // Вращение моторов (CSS-анимация) на паузе тоже стоит.
  deps.elementLayer.ownerSVGElement?.classList.toggle('is-sim-paused', paused);
  const text = deps.uiText();
  const label = paused ? text.paused : running ? text.running : text.editor;
  if (deps.simStateValue.textContent !== label) deps.simStateValue.textContent = label;
  deps.simStateValue.dataset.mode = paused ? 'pause' : state.mode;
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
  state.paused = false;
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
