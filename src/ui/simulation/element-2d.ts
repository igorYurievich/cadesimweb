import {
  AUX_BLOCK_2D, BREAKER_2D, CONTACTOR_2D, DELAY_BLOCK_2D, POLE_VARIANT_OF, PUSHBUTTON_2D, THERMAL_RELAY_2D,
  isDelayBlock2d,
} from '@model/realistic-2d-types';
import { isSwitch2d } from '@model/switch-2d';
import { delayBlockActive, delayBlockSeconds } from '@engine/delay-blocks';
import { stairTimerActive, stairTimerSeconds } from '@engine/stair-timer';
import { STAIR_TIMER_2D } from '@model/stair-timer';
import { isMomentaryManual } from '@engine/switching';
import { MECH_BULB, MECH_PUSH, MECH_SOCKET, isMechanism } from '@model/mechanisms';
import { isEnergized } from '@engine/loads';
import { terminalKey } from '@engine/types';
import type { EngineState } from '@engine/types';
import type { Schema, SchemaElement } from '@model/types';
import type { SimulationState } from './types';

/**
 * Символы 2D: класс is-d2-on переключает подвижные части (группы .d2-on/.d2-off) и красит внутреннюю схему.
 * Корпус и винты у контактора и дисюнтора остаются чёрными, как в CADe_SIMU, поэтому is-powered с них снимается.
 * Вызывается последним, после общих визуалов.
 */
export function apply2dVisuals(state: SimulationState, element: SchemaElement, node: SVGGElement, schema?: Schema): void {
  const result = state.result;
  if (element.typeCode === PUSHBUTTON_2D) {
    const pressed = result !== undefined
      && (Boolean(state.inputs.pressed[element.id]) || remotePressed(state, element, schema));
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
  if (element.typeCode === STAIR_TIMER_2D) {
    applyStairTimerVisuals(state, element, node);
    return;
  }
  if (isMechanism(element.typeCode)) {
    node.classList.toggle('is-d2-on', result !== undefined
      && (mechanismOn(state, element) || (element.typeCode === MECH_PUSH && remotePressed(state, element, schema))));
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
  if (isSwitch2d(element.typeCode)) {
    // Interruptor / Seccionador 2D: ручка повёрнута в ON, пока выключатель включён кликом.
    node.classList.toggle('is-d2-on', result !== undefined && state.inputs.toggled[element.id] === true);
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

const formatMinutes = (seconds: number): string => {
  const whole = Math.ceil(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};

/**
 * Минутник Alst 8: контакт P–3 (is-d2-on) замкнут отсчётом или движком «☼» (is-stair-permanent, видна
 * табличка «☼ ON»); пока кнопка отпущена и идёт выдержка, под «<min» виден остаток «м:сс».
 */
function applyStairTimerVisuals(state: SimulationState, element: SchemaElement, node: SVGGElement): void {
  const result = state.result;
  const permanent = result !== undefined && Boolean(state.inputs.toggled[element.id]);
  const timer = result?.memory.timers[element.id];
  const on = result !== undefined && (permanent || stairTimerActive(element, result.memory.timers));
  node.classList.toggle('is-d2-on', on);
  node.classList.toggle('is-stair-permanent', permanent);
  node.classList.remove('is-powered');
  const counting = !permanent && timer?.phase === 'releasing';
  const total = stairTimerSeconds(element);
  const left = counting ? Math.max(0, total - (timer?.releaseElapsed ?? 0)) : total;
  const text = result === undefined || permanent ? '' : formatMinutes(left);
  const readout = node.querySelector<SVGTextElement>('.timer-readout');
  if (readout && readout.textContent !== text) readout.textContent = text;
  node.classList.toggle('is-timer-counting', counting);
  node.classList.toggle('is-timer-done', on && !counting);
}

/** Механизм: клавиша нажата (выключатель, переключатели), кнопка зажата, розетка под напряжением L–N. */
function mechanismOn(state: SimulationState, element: SchemaElement): boolean {
  if (element.typeCode === MECH_PUSH) return Boolean(state.inputs.pressed[element.id]);
  if (element.typeCode === MECH_BULB) return state.result?.lamps[element.id] ?? false;
  if (element.typeCode !== MECH_SOCKET) return state.inputs.toggled[element.id] === true;
  const result = state.result;
  if (!result) return false;
  const byId = new Map(result.nets.map((net) => [net.id, net] as const));
  const net = (index: number) => byId.get(result.terminalNet[terminalKey(element.id, index)] ?? -1);
  const l = net(0);
  const n = net(2);
  return Boolean(l && n && isEnergized(l, n).energized);
}

/** Кнопку нажимают одноимённой «Botón pulsador» 8023 (или другой одноимённой кнопкой без фиксации). */
function remotePressed(state: SimulationState, element: SchemaElement, schema: Schema | undefined): boolean {
  const name = element.name.trim().toLocaleUpperCase();
  if (!schema || !name) return false;
  return schema.elements.some((candidate) => candidate.id !== element.id && isMomentaryManual(candidate.typeCode)
    && candidate.name.trim().toLocaleUpperCase() === name && Boolean(state.inputs.pressed[candidate.id]));
}
