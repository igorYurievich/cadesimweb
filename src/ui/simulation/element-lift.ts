import { LIFT_START, liftActiveRoles, liftMemory, liftPersonPresent } from '@engine/lift';
import type { LiftMemory } from '@engine/types';
import { LIFT_FLOORS, LIFT_TYPE } from '@model/lift';
import type { SchemaElement } from '@model/types';
import type { InterfaceText } from '../i18n';
import {
  DOOR_TRAVEL, SHEAVE, cabinRopePoint, counterweightRopePoint, ropePath,
} from '../symbols/lift-geometry';
import { LED_COLORS } from '../symbols/lift-symbol-cabin';
import type { SimulationState } from './types';

/**
 * Анимация лифта (symbols/lift-symbol*.ts) по памяти движка (engine/lift.ts): кабина и противовес едут
 * навстречу друг другу, шкив лебёдки крутится, створки дверей разъезжаются, светодиоды датчиков горят,
 * табло показывает этаж и направление. Вне симуляции — исходное положение (первый этаж, двери закрыты).
 */
export function applyLiftVisuals(
  state: SimulationState, element: SchemaElement, node: SVGGElement, text: InterfaceText,
): void {
  if (element.typeCode !== LIFT_TYPE) return;
  const result = state.result;
  const memory = result ? liftMemory(element, result.memory.timers) : LIFT_START;
  const person = result !== undefined && liftPersonPresent(element, state.inputs);
  moveParts(node, memory);
  const active = result ? liftActiveRoles(memory, person) : new Set<string>();
  for (const led of node.querySelectorAll<SVGCircleElement>('[data-lift-led]')) {
    led.setAttribute('fill', active.has(led.dataset.liftLed ?? '') ? LED_COLORS.on : LED_COLORS.off);
  }
  const floor = Math.min(LIFT_FLOORS - 1, Math.max(0, Math.round(memory.pos)));
  setText(node, '.lift-floor-number', String(floor + 1));
  setText(node, '.lift-arrow', memory.speed > 0 ? '▲' : memory.speed < 0 ? '▼' : '');
  const personNode = node.querySelector<SVGGElement>('.lift-person');
  if (personNode) {
    personNode.setAttribute('visibility', person ? 'visible' : 'hidden');
    personNode.setAttribute('transform', `translate(0 ${(-24 * floor).toFixed(2)})`);
  }
  node.querySelector('.lift-beam')?.setAttribute('stroke-opacity', active.has('photo') ? '0.15' : '0.85');
  const banner = node.querySelector<SVGGElement>('.lift-fault');
  banner?.setAttribute('visibility', memory.fault ? 'visible' : 'hidden');
  setText(node, '.lift-fault-text', faultBanner(memory, text));
}

function moveParts(node: SVGGElement, memory: LiftMemory): void {
  const set = (selector: string, attr: string, value: string): void => {
    node.querySelector(selector)?.setAttribute(attr, value);
  };
  set('.lift-cabin-move', 'transform', `translate(0 ${(-24 * memory.pos).toFixed(3)})`);
  set('.lift-cw-move', 'transform', `translate(0 ${(24 * memory.pos).toFixed(3)})`);
  set('.lift-rope-cabin', 'd', ropePath(SHEAVE.cx - SHEAVE.r, cabinRopePoint(memory.pos)));
  set('.lift-rope-cw', 'd', ropePath(SHEAVE.cx + SHEAVE.r, counterweightRopePoint(memory.pos)));
  set('.lift-sheave', 'transform', `rotate(${(-memory.sheave).toFixed(2)} ${SHEAVE.cx} ${SHEAVE.cy})`);
  set('.lift-door-l', 'transform', `translate(${(-DOOR_TRAVEL * memory.door).toFixed(3)} 0)`);
  set('.lift-door-r', 'transform', `translate(${(DOOR_TRAVEL * memory.door).toFixed(3)} 0)`);
}

function setText(node: SVGGElement, selector: string, value: string): void {
  const target = node.querySelector(selector);
  if (target && target.textContent !== value) target.textContent = value;
}

function faultBanner(memory: LiftMemory, text: InterfaceText): string {
  if (memory.fault === 'crash-top' || memory.fault === 'crash-bottom') return text.liftBannerCrash;
  if (memory.fault === 'squeeze') return text.liftBannerSqueeze;
  if (memory.fault === 'door-open') return text.liftBannerDoor;
  return '';
}
