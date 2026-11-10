import { POSITION_SPECS, currentPosition, getBehavior, nextPosition } from '@engine/behaviors';
import { auxContactActive, auxContactActuatorActive } from '@engine/switching';
import type { SchemaElement } from '@model/types';
import { armedByDefaultTypes, latchedTypes } from '../constants';
import type { AppContext } from '../context';
import type { SimulationState } from './types';

const maintainedTypes = new Set([8008, 8009, 8010, 8011]);

export function applyManualSwitchVisuals(
  ctx: AppContext,
  state: SimulationState,
  element: SchemaElement,
  node: SVGGElement,
  tripped: boolean,
): void {
  const defaultClosed = armedByDefaultTypes.has(element.typeCode);
  const manuallyOpen = state.result !== undefined && latchedTypes.has(element.typeCode)
    && !(state.inputs.toggled[element.id] ?? defaultClosed);
  const momentary = isMomentary(element.typeCode);
  const maintained = maintainedTypes.has(element.typeCode);
  const manualName = element.name.trim().toLocaleUpperCase();
  const sameMomentary = namedElementActive(ctx, state, element, manualName, 'momentary');
  const sameMaintained = namedElementActive(ctx, state, element, manualName, 'maintained');
  const samePosition = namedPositionActive(ctx, state, element, manualName);
  const sameLatched = sameMaintained || samePosition;
  const active = (momentary && (Boolean(state.inputs.pressed[element.id])
    || sameMomentary || sameLatched))
    || (maintained && (Boolean(state.inputs.toggled[element.id]) || sameMomentary || sameLatched));
  node.classList.toggle('is-sim-pressed', active);
  applySelectorPosition(state, element, node, sameMomentary || sameLatched);
  node.classList.toggle('is-sim-open', element.typeCode !== 6007 && (manuallyOpen || tripped));
}

function namedElementActive(
  ctx: AppContext,
  state: SimulationState,
  element: SchemaElement,
  name: string,
  kind: 'momentary' | 'maintained',
): boolean {
  if (!name) return false;
  return ctx.schema.elements.some((candidate) => {
    if (candidate.id === element.id || candidate.name.trim().toLocaleUpperCase() !== name) return false;
    const matchingType = kind === 'momentary'
      ? isMomentary(candidate.typeCode)
      : maintainedTypes.has(candidate.typeCode);
    return matchingType && Boolean(state.inputs[kind === 'momentary' ? 'pressed' : 'toggled'][candidate.id]);
  });
}

function namedPositionActive(
  ctx: AppContext,
  state: SimulationState,
  element: SchemaElement,
  name: string,
): boolean {
  if (!name) return false;
  return ctx.schema.elements.some((candidate) => {
    if (candidate.id === element.id || candidate.name.trim().toLocaleUpperCase() !== name) return false;
    const spec = POSITION_SPECS[candidate.typeCode];
    return Boolean(spec && currentPosition(candidate.typeCode, state.inputs.positions?.[candidate.id]) !== spec.rest);
  });
}

function applySelectorPosition(
  state: SimulationState,
  element: SchemaElement,
  node: SVGGElement,
  pairedInputActive: boolean,
): void {
  const spec = POSITION_SPECS[element.typeCode];
  if (!spec) return;
  let position = currentPosition(element.typeCode, state.inputs.positions?.[element.id]);
  if (position === spec.rest && pairedInputActive) position = nextPosition(element.typeCode, spec.rest);
  node.setAttribute('data-position', String(position));
}

function isMomentary(typeCode: number): boolean {
  return (typeCode >= 8000 && typeCode <= 8007) || (typeCode >= 8012 && typeCode <= 8015);
}

export function applyContactAndIndicatorVisuals(
  ctx: AppContext,
  state: SimulationState,
  element: SchemaElement,
  node: SVGGElement,
  thermalContactTripped: boolean,
  tripped: boolean,
): void {
  const result = state.result;
  node.classList.toggle('is-sim-tripped', tripped);
  node.classList.toggle('is-thermal-relay-tripped', element.typeCode === 6007 && tripped);
  node.classList.toggle('is-thermal-tripped', thermalContactTripped);
  node.classList.toggle('is-sim-fault-glow', Boolean(state.inputs.tripped[element.id]));
  node.classList.toggle('is-sim-closed', result?.contacts[element.id] ?? false);
  const switches = element.typeCode >= 7000 && element.typeCode <= 7015
    && getBehavior(element.typeCode).links.some((link) => link.kind === 'switch');
  const timedActive = element.typeCode === 7004
    ? result?.contacts[element.id]
    : element.typeCode === 7005 ? result !== undefined && !result.contacts[element.id] : undefined;
  const active = timedActive ?? (result !== undefined && (
    auxContactActive(element, ctx.schema, result.coils, result.memory.timers)
    || auxContactActuatorActive(element, ctx.schema, state.inputs)
  ));
  node.classList.toggle('is-aux-active', switches && result !== undefined && active);
  const coilEnergized = element.typeCode === 9000 || element.typeCode === 9004
    ? (result?.coils[element.name] ?? false)
    : element.typeCode === 9005 || element.typeCode === 9006
      ? (result?.memory.timers[element.id]?.powered ?? false)
      : false;
  node.classList.toggle('is-coil-energized', coilEnergized);
  applyLampVisuals(state, element, node);
}

function applyLampVisuals(state: SimulationState, element: SchemaElement, node: SVGGElement): void {
  const powered = state.result?.lamps[element.id] ?? false;
  const lit = element.typeCode === 9009 ? powered && state.time % 1 < 0.5
    : element.typeCode === 9008 && powered;
  node.classList.toggle('is-lamp-lit', lit);
}

export function applyTimerVisuals(state: SimulationState, element: SchemaElement, node: SVGGElement): void {
  if (element.typeCode !== 9004 && element.typeCode !== 9005 && element.typeCode !== 9006) return;
  const readout = node.querySelector<SVGTextElement>('.timer-readout');
  const timer = state.result?.memory.timers[element.id];
  const total = Math.max(0, Number(element.params.time ?? 0));
  const formatTime = (value: number): string =>
    Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',');
  const done = timer?.phase === 'done' || timer?.phase === 'releasing';
  const shown = done ? total : Math.min(total, Math.max(0, timer?.elapsed ?? 0));
  const text = state.result === undefined ? ''
    : `${timer?.phase === 'counting' ? shown.toFixed(1).replace('.', ',') : formatTime(shown)} / `
      + `${formatTime(total)} с`;
  if (readout && readout.textContent !== text) readout.textContent = text;
  node.classList.toggle('is-timer-counting', timer?.phase === 'counting');
  node.classList.toggle('is-timer-done', done);
}
