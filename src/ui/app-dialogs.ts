import type { AppContext } from './context';
import { setupBetaNotice } from './beta-notice';
import type { SimulationController } from './sim-controller';
import { setupSimulationContextMenuEvents } from './context-menu-events';

export function setupAppDialogs(
  ctx: AppContext,
  svg: SVGSVGElement,
  simulationContextMenu: HTMLDivElement,
  overloadAction: HTMLButtonElement,
  resetInputsAction: HTMLButtonElement,
  simulation: SimulationController,
): void {
  setupBetaNotice(ctx);
  ctx.root.querySelectorAll<HTMLButtonElement>('[data-dialog-close]').forEach((button) => {
    button.addEventListener('click', () =>
      ctx.root.querySelector<HTMLDialogElement>(`#${button.dataset.dialogClose}`)?.close());
  });
  overloadAction.addEventListener('click', () => {
    simulationContextMenu.hidden = true;
    if (simulation.contextElementId !== undefined) {
      simulation.simulateOverload(simulation.contextElementId);
    }
  });
  resetInputsAction.addEventListener('click', () => {
    simulationContextMenu.hidden = true;
    simulation.resetSimulationInputs();
  });
  setupSimulationContextMenuEvents(svg, simulationContextMenu, simulation);
}
