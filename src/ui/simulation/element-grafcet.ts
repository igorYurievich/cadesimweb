import { grafcetOperand, grafcetTopology } from '@engine/grafcet';
import { GRAFCET, isGrafcetStep } from '@model/grafcet';
import type { Schema, SchemaElement } from '@model/types';
import type { SimulationState } from './types';

/**
 * GRAFCET в симуляции (grafcet-symbol.ts): активный этап и действие его этапа — is-grafcet-active,
 * истинное условие перехода — is-grafcet-true, строка таблицы назначений с включённым операндом — is-on.
 */
export function applyGrafcetVisuals(
  state: SimulationState, element: SchemaElement, node: SVGGElement, schema: Schema,
): void {
  const result = state.result;
  const memory = result?.memory.timers[element.id];
  if (isGrafcetStep(element.typeCode) || element.typeCode === GRAFCET.action) {
    node.classList.toggle('is-grafcet-active', memory?.q ?? false);
  } else if (element.typeCode === GRAFCET.transition) {
    node.classList.toggle('is-grafcet-true', memory?.q ?? false);
  } else if (element.typeCode === GRAFCET.table) {
    const topology = result ? grafcetTopology(schema, result.terminalNet) : undefined;
    for (const row of node.querySelectorAll<SVGGElement>('.grafcet-table-row')) {
      const name = row.dataset.operand ?? '';
      const on = Boolean(result && topology
        && grafcetOperand(name, schema, topology, result.coils, state.inputs, result.memory.timers));
      row.classList.toggle('is-on', on);
    }
  }
}
