import { resolveThermalState } from '@engine/thermal';
import type { EngineState } from '@engine/types';
import type { SchemaElement } from '@model/types';
import { armedByDefaultTypes, latchedTypes } from '../constants';
import type { AppContext } from '../context';
import type { SimulationDependencies, SimulationState } from './types';
import { applyContactAndIndicatorVisuals, applyManualSwitchVisuals, applyTimerVisuals } from './element-switches';
import { applyMotorAnimationVisuals, applyMotorVisuals } from './element-motors';
import { applyPoweredVisuals, applyPowerSupplyVisuals } from './element-power';

export function applyElementVisuals(
  ctx: AppContext,
  deps: SimulationDependencies,
  state: SimulationState,
  nets: Map<number, EngineState['nets'][number]>,
): void {
  const thermalState = resolveThermalState(ctx.schema, state.inputs);
  for (const element of ctx.schema.elements) {
    const node = deps.elementLayer.querySelector<SVGGElement>(`[data-element-id="${element.id}"]`);
    if (!node) continue;
    applyOneElement(ctx, state, element, node, nets, thermalState.trippedNames);
  }
}

function applyOneElement(
  ctx: AppContext,
  state: SimulationState,
  element: SchemaElement,
  node: SVGGElement,
  nets: Map<number, EngineState['nets'][number]>,
  trippedNames: ReadonlySet<string>,
): void {
  const result = state.result;
  const tripped = Boolean(state.inputs.tripped[element.id] || result?.tripped[element.id]);
  const thermalContactTripped = [8016, 8017, 8018, 8019].includes(element.typeCode)
    && (Boolean(state.inputs.tripped[element.id]) || (element.name.trim() !== ''
      && trippedNames.has(element.name.trim().toLocaleUpperCase())));
  const manuallyOpen = result !== undefined && latchedTypes.has(element.typeCode)
    && !(state.inputs.toggled[element.id] ?? armedByDefaultTypes.has(element.typeCode));
  applyManualSwitchVisuals(ctx, state, element, node, tripped);
  applyContactAndIndicatorVisuals(ctx, state, element, node, thermalContactTripped, tripped);
  applyTimerVisuals(state, element, node);
  applyMotorVisuals(state, element, node);
  applyPowerSupplyVisuals(element, node, result, nets);
  applyMotorAnimationVisuals(state, element, node, nets);
  applyPoweredVisuals(state, element, node, nets, manuallyOpen, tripped);
}
