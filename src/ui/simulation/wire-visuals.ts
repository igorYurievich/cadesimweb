import type { EngineState, PotentialLabel } from '@engine/types';
import { POTENTIAL_ORDER } from '../constants';
import { CONFLICT_COLOR, IDLE_WIRE_COLORS, PHASE_LABELS, POTENTIAL_COLORS, UNIFORM_LIVE_COLOR } from '../constants';
import type { AppContext } from '../context';
import type { SimulationDependencies, SimulationState } from './types';

export function applyWireVisuals(
  ctx: AppContext,
  deps: SimulationDependencies,
  state: SimulationState,
  result: EngineState | undefined,
  nets: Map<number, EngineState['nets'][number]>,
  motorCurrentGroups: Set<number>,
  autotransformerCurrentGroups: Set<number>,
): void {
  for (const wire of ctx.schema.wires) {
    const node = deps.wireLayer.querySelector<SVGElement>(`[data-wire-id="${wire.id}"]`);
    if (!node) continue;
    const group = state.wireGroupOf.get(wire.id);
    const potentials = collectPotentials(group, state, result, nets);
    const ordered = POTENTIAL_ORDER.filter((potential) => potentials.has(potential));
    const motorCurrent = group !== undefined && motorCurrentGroups.has(group);
    const transformerCurrent = group !== undefined && autotransformerCurrentGroups.has(group);
    const energized = ordered.length > 0 || motorCurrent;
    const idle = wire.kind === 'junction' ? IDLE_WIRE_COLORS.junction : IDLE_WIRE_COLORS[wire.kind];
    const first = ordered[0];
    const liveColor = first
      ? (deps.uniformWireColors() && PHASE_LABELS.includes(first) ? UNIFORM_LIVE_COLOR : POTENTIAL_COLORS[first])
      : idle;
    const color = ordered.length > 1 ? CONFLICT_COLOR : motorCurrent ? UNIFORM_LIVE_COLOR : liveColor;
    applyWireNode(deps.wireLayer, node, wire.id, wire.kind === 'junction', wire.thickness, color, energized);
    const message = ordered.length
      ? `Провод под напряжением: ${ordered.join(', ')}`
      : transformerCurrent
        ? 'Провод с током через автотрансформатор'
        : motorCurrent
          ? 'Провод с током в режиме «звезда»'
          : 'Провод без потенциала';
    node.setAttribute('aria-label', message);
  }
}

function collectPotentials(
  group: number | undefined,
  state: SimulationState,
  result: EngineState | undefined,
  nets: Map<number, EngineState['nets'][number]>,
): Set<PotentialLabel> {
  const potentials = new Set<PotentialLabel>();
  for (const key of group === undefined ? [] : state.wireTerminalKeys.get(group) ?? []) {
    const netId = result?.terminalNet[key];
    for (const potential of nets.get(netId ?? -1)?.potentials ?? []) potentials.add(potential);
  }
  return potentials;
}

function applyWireNode(
  layer: SVGGElement,
  node: SVGElement,
  wireId: number,
  junction: boolean,
  thickness: number,
  color: string,
  energized: boolean,
): void {
  node.classList.toggle('is-energized', energized);
  node.style.filter = '';
  layer.querySelector(`[data-halo-for="${wireId}"]`)?.remove();
  if (junction) node.setAttribute('fill', color);
  else {
    const base = Math.max(1, thickness || 1) * 1.35;
    node.setAttribute('stroke', color);
    node.setAttribute('stroke-width', String(base));
  }
}
