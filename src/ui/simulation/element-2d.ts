import {
  AUX_BLOCK_2D, BREAKER_2D, CONTACTOR_2D, DELAY_BLOCK_2D, POLE_VARIANT_OF, PUSHBUTTON_2D, THERMAL_RELAY_2D,
  isDelayBlock2d,
} from '@model/realistic-2d-types';
import { delayBlockActive, delayBlockSeconds } from '@engine/delay-blocks';
import type { EngineState } from '@engine/types';
import type { SchemaElement } from '@model/types';
import type { SimulationState } from './types';

/**
 * Символы 2D: класс is-d2-on переключает подвижные части (группы .d2-on/.d2-off) и красит внутреннюю схему.
 * Корпус и винты у контактора и дисюнтора остаются чёрными, как в CADe_SIMU, поэтому is-powered с них снимается.
 * Вызывается последним, после общих визуалов.
 */
export function apply2dVisuals(state: SimulationState, element: SchemaElement, node: SVGGElement): void {
  const result = state.result;
  if (element.typeCode === PUSHBUTTON_2D) {
    const pressed = result !== undefined && Boolean(state.inputs.pressed[element.id]);
    node.classList.toggle('is-d2-on', pressed);
    if (pressed) node.classList.add('is-powered');
    return;
  }
  if (isDelayBlock2d(element.typeCode)) {
    const on = result !== undefined && delayBlockActive(element, result.memory.timers);
    node.classList.toggle('is-d2-on', on);
    node.classList.remove('is-powered');
    applyDelayReadout(result, element, node, on);
    return;
  }
  if (element.typeCode === THERMAL_RELAY_2D) {
    // Сработало (клик или «Disparo»): нагреватели и контакты краснеют, 97-98 замкнут, 95-96 разомкнут.
    const tripped = Boolean(state.inputs.tripped[element.id]) || state.inputs.toggled[element.id] === false;
    node.classList.toggle('is-d2-on', result !== undefined && tripped);
    node.classList.remove('is-powered');
    return;
  }
  if (element.typeCode === CONTACTOR_2D || element.typeCode === AUX_BLOCK_2D) {
    const on = result !== undefined && element.name !== '' && (result.coils[element.name] ?? false);
    node.classList.toggle('is-d2-on', on);
    node.classList.remove('is-powered');
    return;
  }
  if (element.typeCode === BREAKER_2D || POLE_VARIANT_OF[element.typeCode]) {
    const on = result !== undefined && !state.inputs.tripped[element.id] && state.inputs.toggled[element.id] !== false;
    node.classList.toggle('is-d2-on', on);
    node.classList.remove('is-powered');
  }
}

const formatSeconds = (value: number): string => value.toFixed(1).replace('.', ',');

/**
 * Обратный отсчёт блока с выдержкой: сколько секунд осталось до переключения. ON delay считает, пока катушка
 * запитана (после срабатывания — 0); OFF delay — после отключения катушки. Вне отсчёта видна полная выдержка.
 */
function applyDelayReadout(
  result: EngineState | undefined, element: SchemaElement, node: SVGGElement, on: boolean,
): void {
  const readout = node.querySelector<SVGTextElement>('.timer-readout');
  const timer = result?.memory.timers[element.id];
  const total = delayBlockSeconds(element);
  const off = element.typeCode === DELAY_BLOCK_2D.OFF;
  const counting = timer?.phase === (off ? 'releasing' : 'counting');
  const passed = off ? timer?.releaseElapsed ?? 0 : timer?.elapsed ?? 0;
  const left = counting ? Math.max(0, total - passed) : !off && on ? 0 : total;
  const text = result === undefined ? '' : `${formatSeconds(left)} с`;
  if (readout && readout.textContent !== text) readout.textContent = text;
  node.classList.toggle('is-timer-counting', counting);
  node.classList.toggle('is-timer-done', on && !counting);
}
