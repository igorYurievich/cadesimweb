import { createEmptyMemory } from '@engine/simulate';
import type { AppContext } from '../context';
import { createSimInputs } from './state';
import type { SimulationDependencies, SimulationState } from './types';
import type { SimulationLoop } from './loop';

export interface SimulationInputActions {
  applySimulationInput(): void;
  pressMomentary(id: number): void;
  releaseMomentary(id: number): void;
  resetSimulationInputs(): void;
  simulateOverload(id: number): void;
  isMomentaryType(typeCode: number): boolean;
  isMaintainedType(typeCode: number): boolean;
  isTrippableType(typeCode: number): boolean;
}

const momentaryTypes = new Set([8000, 8001, 8002, 8003, 8004, 8005, 8006, 8007, 8012, 8013, 8014, 8015]);
const maintainedTypes = new Set([8008, 8009, 8010, 8011]);
const trippableTypes = new Set([
  6000, 6001, 6002, 6003, 6004, 6005, 6006, 6007, 6008,
  6009, 6010, 6011, 6012, 8016, 8017, 8018, 8019,
]);

export function createSimulationInputs(
  ctx: AppContext,
  deps: SimulationDependencies,
  state: SimulationState,
  loop: SimulationLoop,
): SimulationInputActions {
  const applySimulationInput = (): void => {
    loop.evaluateSimulation();
    deps.renderSchema();
  };
  const pressMomentary = (id: number): void => {
    if (state.mode === 'edit' || state.heldInputs.has(id)) return;
    state.heldInputs.add(id);
    state.inputs.pressed[id] = true;
    applySimulationInput();
  };
  const releaseMomentary = (id: number): void => {
    if (!state.heldInputs.delete(id)) return;
    delete state.inputs.pressed[id];
    applySimulationInput();
  };
  const resetSimulationInputs = (): void => {
    state.inputs = createSimInputs(ctx);
    state.heldInputs.clear();
    state.memory = createEmptyMemory();
    state.time = 0;
    state.result = undefined;
    state.lastFrameTime = undefined;
    loop.evaluateSimulation();
    deps.renderSchema();
    deps.status.textContent = 'Входы и память симуляции сброшены.';
  };
  const simulateOverload = (id: number): void => {
    if (state.mode === 'edit') loop.startSimulation();
    state.inputs.tripped[id] = true;
    applySimulationInput();
    const element = ctx.schema.elements.find((candidate) => candidate.id === id);
    deps.status.textContent = `Смоделирована перегрузка: ${element?.name || `элемент ${id}`}.`;
  };
  return {
    applySimulationInput, pressMomentary, releaseMomentary, resetSimulationInputs, simulateOverload,
    isMomentaryType: (typeCode) => momentaryTypes.has(typeCode),
    isMaintainedType: (typeCode) => maintainedTypes.has(typeCode),
    isTrippableType: (typeCode) => trippableTypes.has(typeCode),
  };
}
