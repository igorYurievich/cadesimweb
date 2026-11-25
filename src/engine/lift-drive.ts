/**
 * Моторы лифта (model/lift.ts): какой элемент схемы — мотор подъёма или дверей, крутится ли он, в какую
 * сторону и на какой частоте. Направление трёхфазного мотора — по порядку фаз на U1 V1 W1, как стрелка
 * вращения на экране (ui/simulation/element-motors.ts); у остальных — признак reversed.
 */

import { normalizeLiftName } from '../model/lift';
import type { Schema, SchemaElement } from '../model/types';
import { terminalKey, type MotorState, type NetState, type TerminalKey } from './types';

const PHASES = ['L1', 'L2', 'L3'] as const;

export interface LiftDrive {
  /** 1 — прямое вращение (подъём / открытие), −1 — обратное, 0 — стоит. */
  dir: 0 | 1 | -1;
  /** Частота питания, Гц; без преобразователя — undefined (сеть 50 Гц). */
  hz?: number;
}

/** Первый мотор схемы с этим именем (без учёта регистра и начального «-»). */
export function findLiftMotor(schema: Schema, motors: Readonly<Record<number, MotorState>>, name: string):
SchemaElement | undefined {
  const key = normalizeLiftName(name);
  if (key === '') return undefined;
  return schema.elements.find((element) => motors[element.id] !== undefined && normalizeLiftName(element.name) === key);
}

/** Чётность перестановки фаз: L1 L2 L3 (и её сдвиги) — прямое вращение. */
function phaseOrder(
  motor: SchemaElement, state: MotorState, terminalNet: Readonly<Record<TerminalKey, number>>,
  nets: ReadonlyMap<number, NetState>,
): 0 | 1 | -1 {
  const terminals = state.directionTerminals ?? [0, 1, 2];
  const order = terminals.map((index) => {
    const id = terminalNet[terminalKey(motor.id, index)];
    const phases = PHASES.filter((phase) => (id === undefined ? undefined : nets.get(id))?.potentials.includes(phase));
    return phases.length === 1 ? PHASES.indexOf(phases[0]!) : -1;
  });
  if (order.some((value) => value < 0)) return 0;
  let inversions = 0;
  for (let a = 0; a < order.length; a += 1) {
    for (let b = a + 1; b < order.length; b += 1) if (order[a]! > order[b]!) inversions += 1;
  }
  return inversions % 2 === 0 ? 1 : -1;
}

/** Как крутится мотор лифта: направление и частота. Не найден или стоит — dir 0. */
export function liftDrive(
  schema: Schema, motors: Readonly<Record<number, MotorState>>, name: string,
  terminalNet: Readonly<Record<TerminalKey, number>>, nets: ReadonlyMap<number, NetState>,
): LiftDrive {
  const motor = findLiftMotor(schema, motors, name);
  const state = motor ? motors[motor.id] : undefined;
  if (!motor || !state?.running) return { dir: 0 };
  const threePhase = motor.typeCode === 1000 || motor.typeCode === 1001;
  const dir = threePhase ? phaseOrder(motor, state, terminalNet, nets) : state.reversed ? -1 : 1;
  return state.hz === undefined ? { dir } : { dir, hz: state.hz };
}
