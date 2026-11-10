import { terminalKey } from '@engine/types';
import type { EngineState, PotentialLabel } from '@engine/types';
import type { SchemaElement } from '@model/types';
import type { SimulationState } from './types';

export function applyMotorVisuals(
  state: SimulationState,
  element: SchemaElement,
  node: SVGGElement,
): void {
  const motor = state.result?.motors[element.id];
  node.classList.toggle('is-motor-running', motor?.running ?? false);
  node.classList.toggle('is-motor-faulted', motor?.faulted ?? false);
}

export function applyMotorAnimationVisuals(
  state: SimulationState,
  element: SchemaElement,
  node: SVGGElement,
  nets: Map<number, EngineState['nets'][number]>,
): void {
  const motor = state.result?.motors[element.id];
  const direction = motorDirection(element.id, motor?.reversed, state.result, nets);
  if (motor?.running) {
    node.style.setProperty('--motor-period', '0.9s');
    node.style.setProperty('--motor-play-state', state.mode === 'run' ? 'running' : 'paused');
    node.style.setProperty('--motor-direction', direction ?? 'normal');
    node.style.setProperty('--motor-mirror', direction === 'reverse' ? '-1' : '1');
  } else {
    state.motorStartTimes.delete(element.id);
    node.style.removeProperty('--motor-period');
    node.style.removeProperty('--motor-play-state');
    node.style.removeProperty('--motor-direction');
    node.style.removeProperty('--motor-mirror');
  }
}

function motorDirection(
  motorId: number,
  reversed: boolean | undefined,
  result: EngineState | undefined,
  nets: Map<number, EngineState['nets'][number]>,
): 'normal' | 'reverse' | undefined {
  const phases = [0, 1, 2].map((index) => {
    const netId = result?.terminalNet[terminalKey(motorId, index)];
    return phaseLabels(nets.get(netId ?? -1)?.potentials ?? []);
  });
  if (reversed) return 'reverse';
  if (!phases.every((value) => value.length === 1)) return undefined;
  const order = phases.map((value) => ['L1', 'L2', 'L3'].indexOf(value[0] as string));
  let inversions = 0;
  for (let first = 0; first < order.length; first += 1) {
    for (let second = first + 1; second < order.length; second += 1) {
      if ((order[first] as number) > (order[second] as number)) inversions += 1;
    }
  }
  return inversions % 2 === 0 ? 'normal' : 'reverse';
}

function phaseLabels(potentials: readonly PotentialLabel[]): PotentialLabel[] {
  return potentials.filter((potential) => potential === 'L1' || potential === 'L2' || potential === 'L3');
}
