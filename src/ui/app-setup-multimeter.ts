import type { AppSetupBase } from './app-setup-base';
import { setupMultimeter } from './multimeter/multimeter';
import { createSimInputs } from './simulation/state';

/** Мультиметр: кнопка рядом с лупой, прибор поверх схемы (multimeter/). */
export function setupMultimeterTool(state: AppSetupBase): void {
  setupMultimeter({
    root: state.root,
    svg: state.elements.svg,
    status: state.elements.status,
    schema: () => state.ctx.schema,
    viewport: () => state.viewport,
    viewSize: () => state.viewSize,
    engineResult: () => state.simulation.result,
    // В редакторе кнопки отпущены, переключатели в исходном положении — как при запуске симуляции.
    inputs: () => (state.simulation.mode === 'run' ? state.simulation.inputs : createSimInputs(state.ctx)),
    texts: () => {
      const t = state.uiText();
      return {
        tool: t.multimeter, hint: t.multimeterHint, brokenTitle: t.multimeterBrokenTitle,
        brokenText: t.multimeterBrokenText, replace: t.multimeterReplace,
        close: t.multimeterClose, hold: t.multimeterHold,
      };
    },
  });
}
