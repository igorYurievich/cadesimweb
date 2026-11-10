import type { EngineState } from '@engine/types';
import type { AppContext } from '../context';
import type { SimulationDependencies } from './types';

export function formatSimulationDiagnostics(
  ctx: AppContext,
  deps: SimulationDependencies,
  result: EngineState | undefined,
): string[] {
  if (!result) return [];
  const shortPairs = new Set<string>();
  const earthPairs = new Set<string>();
  let unstable = false;
  for (const fault of result.faults) {
    if (fault.kind === 'unstable') { unstable = true; continue; }
    if (fault.kind !== 'short-circuit' && fault.kind !== 'earth-leak') continue;
    const pair = fault.between ? [...fault.between].sort().join('–') : '—';
    (fault.kind === 'short-circuit' ? shortPairs : earthPairs).add(pair);
  }
  if (shortPairs.size) {
    const pairs = [...shortPairs].sort((a, b) => a.localeCompare(b)).join('; ');
    return [deps.uiText().shortCircuitSummary.replace('{pairs}', pairs)];
  }
  const messages: string[] = [];
  if (earthPairs.size) {
    messages.push(deps.uiText().earthLeakSummary.replace('{pairs}', [...earthPairs].sort().join('; ')));
  }
  if (unstable) messages.push(deps.uiText().unstableSummary);
  for (const element of ctx.schema.elements) {
    if ((element.typeCode !== 1000 && element.typeCode !== 1001) || !result.motors[element.id]?.faulted) continue;
    messages.push(deps.uiText().phaseLossSummary.replace('{motor}', element.name || `M${element.id}`));
  }
  return [...new Set(messages)];
}
