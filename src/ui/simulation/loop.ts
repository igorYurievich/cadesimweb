import { createEmptyMemory, simulate } from '@engine/simulate';
import { findShortCircuitTrips } from '@engine/cc-trip';
import { breakersTripOnShortCircuit } from '../options-menu';
import type { AppContext } from '../context';
import { startsOpen } from '../constants';
import { formatSimulationDiagnostics } from './diagnostics';
import { createSimInputs } from './state';
import type { SimulationDependencies, SimulationState } from './types';
import { hasTimeAnimation, noteEvaluatedFrame, skipQuietFrame } from './quiet-skip';

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
    // В покое кадр не пересчитывается (quiet-skip.ts); моторы и мигание всё равно перерисовываются.
    if (!skipQuietFrame(ctx, state)) evaluateSimulation();
    else if (hasTimeAnimation(ctx, state)) applyVisuals();
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
  const diagnostics = formatSimulationDiagnostics(ctx, deps, state.result, state);
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
  state.ccTrips.clear();
  state.evaluatedAt = undefined;
  state.quiet = undefined;
  updateControls();
  applyVisuals();
}

/** Последний поиск автомата для КЗ, который ничего не нашёл (см. evaluate). */
let lastFruitlessSearch = '';

function evaluate(
  ctx: AppContext,
  deps: SimulationDependencies,
  state: SimulationState,
  applyVisuals: () => void,
): void {
  const input = { schema: ctx.schema, inputs: state.inputs, time: state.time, memory: state.memory };
  state.result = simulate(input);
  // Опция «Автоматы выбивают при КЗ»: автомат выше по цепи уходит в «выкл», схема пересчитывается (cc-trip.ts).
  const shorted = state.result.faults.some((fault) => fault.kind === 'short-circuit');
  // Поиск пересчитывает схему по разу на каждый автомат: если для этих же входов и КЗ выбить нечего
  // (КЗ выше всех автоматов), не повторяем его в каждом кадре.
  const searchKey = shorted ? JSON.stringify([state.inputs, state.result.faults.map((fault) => fault.message)]) : '';
  if (state.mode === 'run' && breakersTripOnShortCircuit() && shorted && searchKey !== lastFruitlessSearch) {
    const trips = findShortCircuitTrips(input, state.result);
    lastFruitlessSearch = trips.length ? '' : searchKey;
    for (const trip of trips) {
      const breaker = ctx.schema.elements.find((element) => element.id === trip.id);
      const name = breaker?.name.trim().toLocaleUpperCase() ?? '';
      for (const twin of ctx.schema.elements) {
        if (twin.id === trip.id || (name !== '' && twin.typeCode === breaker?.typeCode && twin.name.trim().toLocaleUpperCase() === name)) {
          state.inputs.toggled[twin.id] = false;
        }
      }
      state.ccTrips.set(trip.id, trip.pairs);
    }
    if (trips.length) state.result = simulate({ ...input, inputs: state.inputs });
  }
  // Взведённый заново автомат больше не считается выбитым.
  for (const id of [...state.ccTrips.keys()]) if (state.inputs.toggled[id] !== false) state.ccTrips.delete(id);
  const before = state.memory;
  state.memory = state.result.memory;
  noteEvaluatedFrame(ctx, state, before);
  updateControls(ctx, deps, state);
  applyVisuals();
}
