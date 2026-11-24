import { createEmptyInputs, createEmptyMemory } from '@engine/simulate';
import type { UserInputs } from '@engine/types';
import type { AppContext } from '../context';
import { startsOpen } from '../constants';
import type { SimulationState } from './types';

export function createSimulationState(): SimulationState {
  return {
    mode: 'edit',
    paused: false,
    time: 0,
    speed: 1,
    memory: createEmptyMemory(),
    inputs: createEmptyInputs(),
    result: undefined,
    lastFrameTime: undefined,
    animationFrame: undefined,
    contextElementId: undefined,
    heldInputs: new Set<number>(),
    motorAngles: new Map<number, { angle: number; time: number }>(),
    wireGroupOf: new Map<number, number>(),
    wireTerminalKeys: new Map(),
    ccTrips: new Map(),
  };
}

export function createSimInputs(ctx: AppContext): UserInputs {
  const inputs = createEmptyInputs();
  inputs.positions = {};
  for (const element of ctx.schema.elements) {
    if (startsOpen(element.typeCode)) inputs.toggled[element.id] = false;
  }
  return inputs;
}
