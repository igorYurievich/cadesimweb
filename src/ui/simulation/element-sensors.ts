import { isEnergized } from '@engine/loads';
import { terminalKey } from '@engine/types';
import { EMITTER_TYPE, detectorSpec } from '@model/detector-types';
import { getCadType } from '@model/cad-types';
import { REFLEX_TYPE } from '@model/reflex-sensor';
import type { Schema, SchemaElement } from '@model/types';
import { isPhotoReceiver, receiverBeamBlocked } from '@engine/photo-beam';
import { liftActiveSensorNames } from '@engine/lift';
import { normalizeLiftName } from '@model/lift';
import type { SimulationState } from './types';

/**
 * Датчики панели «Detectores». Вызывается после остальных визуалов, потому что барьер переопределяет is-powered.
 *  - барьер 15000: цвет показывает состояние реле — выключен серый, включён красный с серой заливкой;
 *  - детекторы и фотодатчик Réflex: красный цвет, серая заливка и переключённый значок контакта,
 *    пока датчик зажат;
 *  - излучатель: серая заливка, пока на 1-2 есть напряжение.
 */
export function applySensorVisuals(state: SimulationState, element: SchemaElement, node: SVGGElement, schema: Schema): void {
  if (detectorSpec(element.typeCode) || element.typeCode === REFLEX_TYPE) {
    // Зажатый датчик в CADe_SIMU рисуется красным с серой заливкой, даже без проводов.
    // Приёмник фотобарьера срабатывает и сам, когда привязанный излучатель не светит (photo-beam.ts).
    const pressed = Boolean(state.inputs.pressed[element.id])
      || (state.result !== undefined && isPhotoReceiver(element.typeCode)
        && receiverBeamBlocked(schema, element, state.inputs, state.result.coils))
      // Датчик, привязанный по имени к лифту, срабатывает по положению кабины (engine/lift.ts).
      || (state.result !== undefined
        && liftActiveSensorNames(schema, state.inputs, state.result.memory.timers).has(normalizeLiftName(element.name)));
    node.classList.toggle('is-sim-pressed', pressed);
    if (pressed) node.classList.add('is-powered');
    return;
  }
  if (element.typeCode === EMITTER_TYPE) {
    node.classList.toggle('is-sensor-active', emitterEnergized(state, element));
    return;
  }
  if (getCadType(element.typeCode).family !== 'sensor') return;
  const result = state.result;
  const active = result !== undefined && element.name !== '' && (result.coils[element.name] ?? false);
  node.classList.toggle('is-aux-active', active);
  node.classList.toggle('is-sensor-active', active);
  node.classList.toggle('is-powered', active);
  node.classList.toggle('is-beam-blocked', result !== undefined && Boolean(state.inputs.pressed[element.id]));
}

function emitterEnergized(state: SimulationState, element: SchemaElement): boolean {
  const result = state.result;
  if (!result) return false;
  const net = (index: number) => {
    const id = result.terminalNet[terminalKey(element.id, index)];
    return result.nets.find((candidate) => candidate.id === id);
  };
  const a = net(0);
  const b = net(1);
  return Boolean(a && b && isEnergized(a, b).energized);
}
