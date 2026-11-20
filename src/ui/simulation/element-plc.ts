import { isEnergized } from '@engine/loads';
import { logoPowerKey } from '@engine/plc';
import type { EngineState } from '@engine/types';
import { terminalKey } from '@engine/types';
import { LADDER_RESET, LADDER_SET, PLC_BLOCK, PLC_COUNTER_TYPES, isPlcBlock } from '@model/plc-blocks';

const PLC_CYCLE_TYPES: ReadonlySet<number> = new Set([PLC_BLOCK.blink, PLC_BLOCK.pulse]);
import { LADDER_COIL, LOGO_TYPE, isLadderType } from '@model/plc-types';
import type { SchemaElement } from '@model/types';
import type { SimulationState } from './types';

/** Есть ли напряжение между выводами 0 и 1 (катушки Set / Reset). */
function powered(result: EngineState, element: SchemaElement): boolean {
  const net = (index: number) =>
    result.nets.find((candidate) => candidate.id === result.terminalNet[terminalKey(element.id, index)]);
  const a = net(0);
  const b = net(1);
  return Boolean(a && b && isEnergized(a, b).energized);
}

/** Блок: зелёный корпус, пока выход включён; под корпусом время отсчёта или значение счётчика. */
function applyBlock(result: EngineState | undefined, element: SchemaElement, node: SVGGElement): void {
  const memory = result?.memory.timers[element.id];
  node.classList.toggle('is-ladder-on', memory?.q ?? false);
  const readout = node.querySelector<SVGTextElement>('.plc-readout');
  if (!readout) return;
  const counting = memory !== undefined && memory.elapsed > 0;
  // Выдержка TON / TP / TOF не больше заданного времени; у мигания и генератора — позиция в периоде.
  const limit = Number(element.params.time ?? Infinity);
  const shown = PLC_CYCLE_TYPES.has(element.typeCode) ? memory?.elapsed ?? 0 : Math.min(memory?.elapsed ?? 0, limit);
  readout.textContent = !result || !memory ? ''
    : PLC_COUNTER_TYPES.has(element.typeCode) ? String(memory.count ?? 0)
      : counting ? `${shown.toFixed(1)} s` : '';
}

/**
 * Ladder: контакт подсвечен, пока проводит, катушка — пока её операнд включён, Set / Reset — пока под напряжением.
 * LOGO: «RUN» на экране, пока модуль запитан, и лампочки под подписями включённых входов и выходов.
 */
export function applyPlcVisuals(state: SimulationState, element: SchemaElement, node: SVGGElement): void {
  const result = state.result;
  if (isPlcBlock(element.typeCode)) {
    applyBlock(result, element, node);
    return;
  }
  if (isLadderType(element.typeCode)) {
    const on = result !== undefined && (element.typeCode === LADDER_COIL
      ? (result.coils[element.name] ?? false)
      : element.typeCode === LADDER_SET || element.typeCode === LADDER_RESET
        ? powered(result, element)
        : (result.contacts[element.id] ?? false));
    node.classList.toggle('is-ladder-on', on);
    return;
  }
  if (element.typeCode !== LOGO_TYPE && element.typeCode !== 10214) return;
  const run = result?.coils[logoPowerKey(element)] ?? false;
  node.classList.toggle('is-logo-run', run);
  node.querySelectorAll<SVGElement>('.logo-led').forEach((led) => {
    const name = [...led.classList].find((value) => value.startsWith('logo-led-'))?.slice('logo-led-'.length);
    led.classList.toggle('is-on', run && name !== undefined && (result?.coils[name] ?? false));
  });
}
