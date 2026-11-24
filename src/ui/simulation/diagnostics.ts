import { logoLowVoltageSupplied, logoMainsSupplied } from '@engine/plc';
import { s7MainsSupplied } from '@engine/s7-1200';
import type { EngineState } from '@engine/types';
import type { AppContext } from '../context';
import type { SimulationDependencies, SimulationState } from './types';

export function formatSimulationDiagnostics(
  ctx: AppContext,
  deps: SimulationDependencies,
  result: EngineState | undefined,
  state?: Pick<SimulationState, 'ccTrips' | 'inputs'>,
): string[] {
  if (!result) return [];
  // Автоматы, выбитые КЗ (опция «Opciones»): сообщение держится, пока автомат не взведён.
  const tripped = state ? [...state.ccTrips].filter(([id]) => state.inputs.toggled[id] === false) : [];
  const tripMessages: string[] = [];
  if (tripped.length) {
    const pairs = [...new Set(tripped.flatMap(([, list]) => list))].sort((a, b) => a.localeCompare(b)).join('; ');
    const names = tripped.map(([id]) => ctx.schema.elements.find((element) => element.id === id)?.name || `Q${id}`).join(', ');
    tripMessages.push(deps.uiText().ccTripSummary.replace('{pairs}', pairs).replace('{breakers}', names));
  }
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
    return [...tripMessages, deps.uiText().shortCircuitSummary.replace('{pairs}', pairs)];
  }
  const messages: string[] = [...tripMessages];
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

/**
 * Предупреждения (жёлтые): так подключать нельзя. LOGO на 24 V, запитанный напрямую от 230 В (работает, но
 * испортится), и LOGO на 230 V от 24 V (не запускается) — при каждом запуске, пока подключение не исправлено.
 */
export function formatSimulationWarnings(
  ctx: AppContext,
  deps: SimulationDependencies,
  result: EngineState | undefined,
): string[] {
  if (!result) return [];
  const text = deps.uiText();
  const named = (template: string) => (element: { name: string; id: number }) =>
    template.replace('{module}', element.name || `LOGO ${element.id}`);
  return [
    ...logoMainsSupplied(ctx.schema, result.terminalNet, result.nets).map(named(text.logoMainsWarning)),
    ...logoLowVoltageSupplied(ctx.schema, result.terminalNet, result.nets).map(named(text.logoLowVoltageWarning)),
    ...s7MainsSupplied(ctx.schema, result.terminalNet, result.nets).map(named(text.s7MainsWarning)),
  ];
}
