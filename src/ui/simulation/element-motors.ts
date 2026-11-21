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
  node.classList.toggle('is-motor-slow', motor?.slow ?? false);
  node.classList.toggle('is-motor-speed-low', motor?.running === true && motor.speed === 'low');
  node.classList.toggle('is-motor-speed-high', motor?.running === true && motor.speed === 'high');
}

/** Период оборота ротора на экране, с: двухскоростные — малая вдвое медленнее большой, пуск на резисторах — медленно, от частотника — по частоте. */
function motorPeriod(motor: NonNullable<SimulationState['result']>['motors'][number]): number {
  const base = motor.speed === 'low' ? 1.6 : motor.speed === 'high' ? 0.8 : motor.slow ? 2.6 : 0.9;
  // От преобразователя частоты: скорость пропорциональна частоте (50 Гц — как от сети).
  const scale = motor.hz !== undefined && motor.hz > 0 ? Math.min(15, 50 / motor.hz) : 1;
  return base * scale;
}

export function applyMotorAnimationVisuals(
  state: SimulationState,
  element: SchemaElement,
  node: SVGGElement,
  nets: Map<number, EngineState['nets'][number]>,
): void {
  const motor = state.result?.motors[element.id];
  const direction = motorDirection(element.id, motor?.reversed, state.result, nets, motor?.directionTerminals);
  if (motor?.running) {
    // Угол накапливается по времени симуляции: при плавной смене скорости (рампа частотника, переключение
    // скоростей) стрелка не прыгает назад, как было с CSS-анимацией, у которой менялась длительность.
    const previous = state.motorAngles.get(element.id);
    const dt = previous ? Math.max(0, state.time - previous.time) : 0;
    const angle = ((previous?.angle ?? 0) + (360 * dt) / motorPeriod(motor)) % 360;
    state.motorAngles.set(element.id, { angle, time: state.time });
    node.style.setProperty('--motor-angle', `${angle.toFixed(2)}deg`);
    node.style.setProperty('--motor-direction', direction ?? 'normal');
    node.style.setProperty('--motor-mirror', direction === 'reverse' ? '-1' : '1');
  } else {
    state.motorAngles.delete(element.id);
    node.style.removeProperty('--motor-angle');
    node.style.removeProperty('--motor-direction');
    node.style.removeProperty('--motor-mirror');
  }
}

function motorDirection(
  motorId: number,
  reversed: boolean | undefined,
  result: EngineState | undefined,
  nets: Map<number, EngineState['nets'][number]>,
  terminals: readonly number[] = [0, 1, 2],
): 'normal' | 'reverse' | undefined {
  const phases = terminals.map((index) => {
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
