import type { EngineState } from '@engine/types';
import { formatSimulationDiagnostics, formatSimulationWarnings } from './diagnostics';
import { applyElementVisuals } from './element-visuals';
import { buildWireCurrentGroups } from './wire-current-groups';
import { applyWireVisuals } from './wire-visuals';
import type { AppContext } from '../context';
import type { SimulationDependencies, SimulationState } from './types';

export function applySimulationVisuals(
  ctx: AppContext,
  deps: SimulationDependencies,
  state: SimulationState,
): void {
  const result = state.result;
  const nets = new Map((result?.nets ?? []).map((net) => [net.id, net] as const));
  const groups = buildWireCurrentGroups(ctx, state, result, nets);
  applyWireVisuals(ctx, deps, state, result, nets, groups.motor, groups.autotransformer);
  applyElementVisuals(ctx, deps, state, nets);
  updateDiagnosticMessage(deps, result, ctx);
}

function updateDiagnosticMessage(
  deps: SimulationDependencies,
  result: EngineState | undefined,
  ctx: AppContext,
): void {
  // Ошибки (КЗ, утечка) — красным; если ошибок нет, а есть предупреждения — тем же окном, но жёлтым.
  const errors = formatSimulationDiagnostics(ctx, deps, result);
  const text = [...errors, ...formatSimulationWarnings(ctx, deps, result)].join(' ');
  deps.simulationMessage.hidden = text.length === 0;
  deps.simulationMessage.classList.toggle('is-warning', errors.length === 0);
  if (deps.simulationMessageText.textContent !== text) deps.simulationMessageText.textContent = text;
}
