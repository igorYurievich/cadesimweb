/**
 * Подсветка электронных реле в симуляции (model/electronic-relays.ts): катушка реле и SSR под напряжением,
 * положение контакта реле SPST / SPDT и лопасти защиты от перенапряжений 9044 / 9045.
 */
import { REVERSE_SUFFIX } from '@engine/electronic-relays';
import {
  OVERVOLTAGE_2P, OVERVOLTAGE_4P, RELAY_SPDT, RELAY_SPST, SSR_REVERSING, isElectronicRelay,
} from '@model/electronic-relays';
import type { SchemaElement } from '@model/types';
import type { SimulationState } from './types';

export function applyElectronicRelayVisuals(state: SimulationState, element: SchemaElement, node: SVGGElement): void {
  if (!isElectronicRelay(element.typeCode)) return;
  const coils = state.result?.coils ?? {};
  if (element.typeCode === OVERVOLTAGE_2P || element.typeCode === OVERVOLTAGE_4P) {
    // Включён, пока не выключен кликом и не отключился от перенапряжения (inputs.toggled = false).
    const closed = state.result !== undefined && state.inputs.toggled[element.id] !== false;
    for (const part of node.querySelectorAll('.er-open')) part.setAttribute('display', closed ? 'none' : 'inline');
    for (const part of node.querySelectorAll('.er-closed')) part.setAttribute('display', closed ? 'inline' : 'none');
    return;
  }
  const on = element.name !== '' && Boolean(coils[element.name]
    || (element.typeCode === SSR_REVERSING && coils[element.name + REVERSE_SUFFIX]));
  node.classList.toggle('is-coil-energized', on);
  if (element.typeCode === RELAY_SPST || element.typeCode === RELAY_SPDT) node.classList.toggle('is-aux-active', on);
}
