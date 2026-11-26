/**
 * ПЛК S7-1200: CPU 1215C DC/DC/DC (10230, model/s7-1200.ts) и CPU 1214C AC/DC/RLY (10203, model/s7-1214.ts).
 *  - Питание L+ / M: 24 V DC от блока питания (от сети 230 В тоже работает, но с предупреждением, как LOGO 24 V).
 *    Операнд @S7<id> в карте катушек — «CPU в RUN».
 *  - Вход Ix.y включён, пока CPU в RUN и на клемме входа «+» относительно общего 1M.
 *  - Выход Qx.y: транзистор соединяет клемму выхода с 4L+, пока операнд Qx.y включён программой Ladder и CPU в RUN.
 *  - 1214C: питание L1 / N (AC), реле выходов замыкают 1L / 2L на Qx.y; L+ / M — его выход 24 V (relay-pass.ts).
 */

import { S7_1200, S7_INDEX, S7_INPUTS, S7_OUTPUTS } from '../model/s7-1200';
import { S7_1214, S7_1214_INDEX, S7_1214_OUTPUT_TERMINALS } from '../model/s7-1214';
import type { Schema, SchemaElement } from '../model/types';
import type { BehaviorLink, TypeBehavior } from './behaviors';
import { isEnergized } from './loads';
import { terminalKey, type NetState, type TerminalKey } from './types';

export const s7PowerKey = (element: { id: number }): string => `@S7${element.id}`;

/** Клеммы, которые нужны движку: питание CPU, общий входов, первый вход. */
interface S7Pins { supply: readonly [number, number]; inputCommon: number; firstInput: number }

const PINS: Readonly<Record<number, S7Pins>> = {
  [S7_1200]: { supply: [S7_INDEX.L, S7_INDEX.M], inputCommon: S7_INDEX.INPUT_COMMON, firstInput: S7_INDEX.FIRST_INPUT },
  [S7_1214]: {
    supply: [S7_1214_INDEX.L1, S7_1214_INDEX.N], inputCommon: S7_1214_INDEX.INPUT_COMMON,
    firstInput: S7_1214_INDEX.FIRST_INPUT,
  },
};

export const S7_BEHAVIORS: readonly TypeBehavior[] = [{
  typeCode: S7_1200,
  links: S7_OUTPUTS.map((_, k): BehaviorLink => ({
    terminals: [S7_INDEX.OUTPUT_SUPPLY, S7_INDEX.FIRST_OUTPUT + k], kind: 'switch', control: 'plc-output', output: k,
  })),
}, {
  typeCode: S7_1214,
  links: S7_1214_OUTPUT_TERMINALS.map(({ common, terminal }, k): BehaviorLink => ({
    terminals: [common, terminal], kind: 'switch', control: 'plc-output', output: k,
  })),
}];

export const isS7 = (element: { typeCode: number }): boolean => PINS[element.typeCode] !== undefined;

/** Операнды, которые задаёт CPU: «в RUN» и входы (для списка катушек relay-loop.ts). */
export function s7RelayNames(schema: Schema): string[] {
  const cpus = schema.elements.filter(isS7);
  return cpus.length ? [...cpus.map(s7PowerKey), ...S7_INPUTS] : [];
}

/** Выставляет «в RUN» и входы CPU в карте катушек следующего прохода. */
export function applyS7Inputs(
  schema: Schema,
  terminalNet: Readonly<Record<TerminalKey, number>>,
  netById: ReadonlyMap<number, NetState>,
  next: Record<string, boolean>,
): void {
  const netOf = (element: SchemaElement, index: number): NetState | undefined => {
    const id = terminalNet[terminalKey(element.id, index)];
    return id === undefined ? undefined : netById.get(id);
  };
  const energized = (a?: NetState, b?: NetState): boolean => Boolean(a && b && isEnergized(a, b).energized);
  for (const element of schema.elements) {
    const pins = PINS[element.typeCode];
    if (!pins) continue;
    const run = energized(netOf(element, pins.supply[0]), netOf(element, pins.supply[1]));
    next[s7PowerKey(element)] = run;
    const common = netOf(element, pins.inputCommon);
    S7_INPUTS.forEach((name, k) => {
      next[name] = (next[name] ?? false) || (run && energized(netOf(element, pins.firstInput + k), common));
    });
  }
}

/** Выход CPU: операнд Qx.y включён и CPU в RUN. */
export function s7OutputActive(
  element: SchemaElement, link: BehaviorLink, coils: Readonly<Record<string, boolean>>,
): boolean {
  const name = S7_OUTPUTS[link.output ?? -1];
  return name !== undefined && (coils[name] ?? false) && (coils[s7PowerKey(element)] ?? false);
}

const MAINS: readonly string[] = ['L1', 'L2', 'L3', 'N'];

/** CPU, на питание L+ / M которых пришла сеть 230 В (для жёлтого предупреждения). */
export function s7MainsSupplied(
  schema: Schema,
  terminalNet: Readonly<Record<TerminalKey, number>>,
  nets: readonly NetState[],
): SchemaElement[] {
  const byId = new Map(nets.map((net) => [net.id, net] as const));
  const mains = (element: SchemaElement, index: number): boolean =>
    byId.get(terminalNet[terminalKey(element.id, index)] ?? -1)?.potentials.some((p) => MAINS.includes(p)) ?? false;
  return schema.elements.filter((element) =>
    element.typeCode === S7_1200 && (mains(element, S7_INDEX.L) || mains(element, S7_INDEX.M)));
}
