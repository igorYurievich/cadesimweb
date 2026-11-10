import { terminalKey } from '@engine/types';
import type { EngineState, PotentialLabel } from '@engine/types';
import type { SchemaElement } from '@model/types';
import { latchedTypes } from '../constants';
import type { SimulationState } from './types';

const phaseLabels = ['L1', 'L2', 'L3'] as const;

export function applyPowerSupplyVisuals(
  element: SchemaElement,
  node: SVGGElement,
  result: EngineState | undefined,
  nets: Map<number, EngineState['nets'][number]>,
): void {
  node.classList.toggle('is-power-supply-active', isPowerSupplyActive(element.id, element.typeCode, result, nets));
}

export function applyPoweredVisuals(
  state: SimulationState,
  element: SchemaElement,
  node: SVGGElement,
  nets: Map<number, EngineState['nets'][number]>,
  manuallyOpen: boolean,
  tripped: boolean,
): void {
  const result = state.result;
  node.classList.toggle('is-sim-active', result !== undefined);
  const powered = element.terminals.some((_, index) => {
    const netId = result?.terminalNet[terminalKey(element.id, index)] ?? -1;
    return (nets.get(netId)?.potentials.length ?? 0) > 0;
  });
  node.classList.toggle('is-powered', element.typeCode !== 6007 && powered
    && !(latchedType(element.typeCode) && (manuallyOpen || tripped)));
  node.classList.toggle('is-signal-active', element.typeCode >= 9010 && element.typeCode <= 9013
    && (result?.lamps[element.id] ?? false));
}

function isPowerSupplyActive(
  elementId: number,
  typeCode: number,
  result: EngineState | undefined,
  nets: Map<number, EngineState['nets'][number]>,
): boolean {
  if (typeCode === 3018) {
    const inputs = [0, 1, 2].map((index) => potentialsAt(elementId, index, result, nets));
    const correctPhases = inputs.every((potentials, index) => potentials.includes(phaseLabels[index]!));
    const distinctNets = new Set(
      [0, 1, 2].map((index) => result?.terminalNet[terminalKey(elementId, index)]),
    ).size === 3;
    return correctPhases && distinctNets;
  }
  if (typeCode !== 3014) return false;
  return isTwoWireSupplyActive(elementId, result, nets);
}

function isTwoWireSupplyActive(
  elementId: number,
  result: EngineState | undefined,
  nets: Map<number, EngineState['nets'][number]>,
): boolean {
  const first = result?.terminalNet[terminalKey(elementId, 0)];
  const second = result?.terminalNet[terminalKey(elementId, 1)];
  const separate = first !== undefined && second !== undefined && first !== second;
  if (!separate) return false;
  const potentialsA = potentialsAt(elementId, 0, result, nets);
  const potentialsB = potentialsAt(elementId, 1, result, nets);
  const phasesA = phaseLabels.filter((phase) => potentialsA.includes(phase));
  const phasesB = phaseLabels.filter((phase) => potentialsB.includes(phase));
  return phasesA.some((phase) => phasesB.some((other) => phase !== other))
    || (phasesA.length > 0 && potentialsB.includes('N'))
    || (phasesB.length > 0 && potentialsA.includes('N'));
}

function potentialsAt(
  elementId: number,
  index: number,
  result: EngineState | undefined,
  nets: Map<number, EngineState['nets'][number]>,
): readonly PotentialLabel[] {
  const netId = result?.terminalNet[terminalKey(elementId, index)];
  return nets.get(netId ?? -1)?.potentials ?? [];
}

function latchedType(typeCode: number): boolean {
  return latchedTypes.has(typeCode);
}
