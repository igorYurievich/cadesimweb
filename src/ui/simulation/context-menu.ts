import type { AppContext } from '../context';
import type { SimulationDependencies, SimulationState } from './types';
import type { SimulationInputActions } from './inputs';

export function showSimulationContextMenu(
  ctx: AppContext,
  deps: SimulationDependencies,
  state: SimulationState,
  inputs: SimulationInputActions,
  event: MouseEvent,
  elementId?: number,
): void {
  state.contextElementId = elementId;
  const element = elementId === undefined ? undefined
    : ctx.schema.elements.find((candidate) => candidate.id === elementId);
  deps.overloadAction.hidden = !element || !inputs.isTrippableType(element.typeCode);
  deps.simulationContextMenu.hidden = false;
  const bounds = deps.simulationContextMenu.getBoundingClientRect();
  deps.simulationContextMenu.style.left = `${Math.max(8, Math.min(event.clientX, innerWidth - bounds.width - 8))}px`;
  deps.simulationContextMenu.style.top = `${Math.max(8, Math.min(event.clientY, innerHeight - bounds.height - 8))}px`;
}
