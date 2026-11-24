/**
 * Опция «Автоматы выбивают при КЗ» (меню «Opciones»). Если в схеме короткое замыкание, ищется включённый
 * автомат «выше по течению» (aguas arriba): тот, чьё отключение убирает КЗ. Из нескольких таких (вводной и
 * групповой) выбивает тот, после которого под напряжением остаётся больше схемы — ближайший к КЗ
 * (селективность). Повторяется, пока КЗ не исчезнет или подходящих автоматов не останется.
 *
 * Выбивают аппараты с магнитным расцепителем: автоматы 6000–6004 и 2D 6017 (все варианты), дисюнкторы
 * 6008–6012 и 2D 6015. Дифференциалы и тепловые реле на КЗ не реагируют.
 */

import { AUTOMATIC_2D, BREAKER_2D } from '../model/realistic-2d-types';
import { simulate } from './simulate';
import type { EngineInput, EngineState, Fault, UserInputs } from './types';

export const CC_TRIP_TYPES: ReadonlySet<number> = new Set([
  6000, 6001, 6002, 6003, 6004, 6008, 6009, 6010, 6011, 6012, BREAKER_2D, ...Object.values(AUTOMATIC_2D),
]);

export interface CcTrip {
  /** id выбившего автомата. */
  id: number;
  /** Пары потенциалов КЗ, которые он отключил, например «L1–N». */
  pairs: string[];
}

const shortPairs = (faults: readonly Fault[]): Set<string> => new Set(faults
  .filter((fault) => fault.kind === 'short-circuit')
  .map((fault) => (fault.between ? [...fault.between].sort().join('–') : '—')));

/** Сколько сетей осталось под напряжением: с фазой (или «+» постоянного тока); N и PE не считаются. */
const LIVE = new Set(['L1', 'L2', 'L3', '+']);
const energizedNets = (state: EngineState): number => state.nets.filter((net) => net.potentials.some((p) => LIVE.has(p))).length;

/** Автомат включён: не выключен вручную и не сработал. */
const isOn = (inputs: UserInputs, id: number): boolean => inputs.toggled[id] !== false && !(inputs.tripped[id] ?? false);

const withOff = (inputs: UserInputs, id: number): UserInputs => ({ ...inputs, toggled: { ...inputs.toggled, [id]: false } });

/**
 * Какие автоматы выбивают из-за КЗ в состоянии state (посчитанном для input). Ничего не меняет:
 * вызывающий выключает их сам (inputs.toggled[id] = false) и пересчитывает схему.
 */
export function findShortCircuitTrips(input: EngineInput, state: EngineState, maxTrips = 8): CcTrip[] {
  let remaining = shortPairs(state.faults);
  if (remaining.size === 0) return [];
  const trips: CcTrip[] = [];
  let inputs = input.inputs;
  const breakers = input.schema.elements.filter((element) => CC_TRIP_TYPES.has(element.typeCode));
  for (let step = 0; step < maxTrips && remaining.size > 0; step += 1) {
    let best: { id: number; left: Set<string>; energized: number } | undefined;
    for (const breaker of breakers) {
      if (!isOn(inputs, breaker.id)) continue;
      const trial = simulate({ ...input, inputs: withOff(inputs, breaker.id) });
      const left = shortPairs(trial.faults);
      // Отключение должно убрать хотя бы одно из оставшихся КЗ.
      if (![...remaining].some((pair) => !left.has(pair))) continue;
      const energized = energizedNets(trial);
      if (!best || left.size < best.left.size || (left.size === best.left.size && energized > best.energized)) {
        best = { id: breaker.id, left, energized };
      }
    }
    if (!best) break;
    trips.push({ id: best.id, pairs: [...remaining].filter((pair) => !best!.left.has(pair)) });
    inputs = withOff(inputs, best.id);
    remaining = best.left;
  }
  return trips;
}
