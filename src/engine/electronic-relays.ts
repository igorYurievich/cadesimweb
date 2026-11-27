/**
 * Логика панели «Relés electrónicos y protecciones» (model/electronic-relays.ts).
 *
 *  - SSR 1070 / 1071 и реле SPST / SPDT 1074 / 1075: вход A1–A2 под напряжением → контакты с тем же именем
 *    переключаются (как катушка 9000). У SSR DC 1070 вход полярный: «−» на A1 и «+» на A2 не включают реле.
 *  - Твердотельный контактор 1072: A1–A2 замыкает 1-2, 3-4, 5-6.
 *  - Реверсивный 1073: A1–A2 — прямое направление (1-2, 3-4, 5-6), A3–A2 — обратное (1-2, 3-6, 5-4,
 *    меняются местами L2 и L3). Оба входа сразу — ни одного направления (внутренняя блокировка).
 *  - Реле контроля фаз 9040 / 9041: включено, пока на L1 L2 L3 три разные фазы (у 9040 ещё N на N).
 *  - Реле чередования фаз 9042 / 9043: как 9041, и порядок фаз прямой (L1-L2-L3 по кругу).
 *  - Защита от перенапряжений 9044 / 9045: полюса как у автомата (клик в симуляции включает и выключает);
 *    если на катушке U (A1–A2) межфазное напряжение вместо фазного, аппарат отключается и ждёт ручного
 *    включения (findOvervoltageTrips, вызывается из цикла симуляции).
 */

import type { Schema, SchemaElement } from '../model/types';
import {
  OVERVOLTAGE_2P, OVERVOLTAGE_4P, PHASE_FAIL, PHASE_FAIL_N, PHASE_SEQUENCE, PHASE_SEQUENCE_N, RELAY_SPDT,
  RELAY_SPST, SSR_3PH, SSR_AC, SSR_DC, SSR_REVERSING,
} from '../model/electronic-relays';
import type { BehaviorLink, TypeBehavior } from './behaviors';
import { isEnergized } from './loads';
import type { EngineState, NetState, PotentialLabel, TerminalKey, UserInputs } from './types';
import { terminalKey } from './types';

/** Суффикс ключа катушки для входа A3 реверсивного контактора 1073. */
export const REVERSE_SUFFIX = '@A3';

const sw = (terminals: [number, number], extra: Partial<BehaviorLink> = {}): BehaviorLink => ({
  terminals, kind: 'switch', control: 'coil-name', ...extra,
});
const load = (a: number, b: number): BehaviorLink => ({ terminals: [a, b], kind: 'load', control: 'always' });
const breaker = (a: number, b: number): BehaviorLink => ({
  terminals: [a, b], kind: 'switch', control: 'toggled', defaultClosed: true, opensWhenTripped: true,
});
const none: BehaviorLink = { terminals: [], kind: 'none', control: 'always' };
const reverse = { coilSuffix: REVERSE_SUFFIX } as const;

export const ELECTRONIC_RELAY_BEHAVIORS: readonly TypeBehavior[] = [
  { typeCode: SSR_DC, links: [load(0, 1), sw([2, 3])] },
  { typeCode: SSR_AC, links: [load(0, 1), sw([2, 3])] },
  { typeCode: SSR_3PH, links: [load(6, 7), sw([0, 3]), sw([1, 4]), sw([2, 5])] },
  {
    typeCode: SSR_REVERSING,
    links: [
      load(6, 7), load(8, 7), sw([0, 3]), sw([1, 4]), sw([2, 5]),
      sw([0, 3], reverse), sw([1, 5], reverse), sw([2, 4], reverse),
    ],
  },
  { typeCode: PHASE_FAIL_N, links: [none] },
  { typeCode: PHASE_FAIL, links: [none] },
  { typeCode: PHASE_SEQUENCE_N, links: [none] },
  { typeCode: PHASE_SEQUENCE, links: [none] },
  { typeCode: OVERVOLTAGE_2P, links: [breaker(0, 2), breaker(1, 3), load(4, 5)] },
  {
    typeCode: OVERVOLTAGE_4P,
    links: [breaker(0, 4), breaker(1, 5), breaker(2, 6), breaker(3, 7), load(8, 9), load(10, 11), load(12, 13)],
  },
  { typeCode: RELAY_SPST, links: [load(0, 1), sw([2, 3])] },
  // 12 11 14: 11-12 НЗ, 11-14 НО.
  { typeCode: RELAY_SPDT, links: [load(0, 1), sw([3, 2], { normallyClosed: true }), sw([3, 4])] },
];

/** Входы катушек: [A1, A2] по типу. */
const COIL_INPUTS: Readonly<Record<number, readonly [number, number]>> = {
  [SSR_DC]: [0, 1], [SSR_AC]: [0, 1], [RELAY_SPST]: [0, 1], [RELAY_SPDT]: [0, 1],
  [SSR_3PH]: [6, 7], [SSR_REVERSING]: [6, 7],
};
const PHASE_RELAYS: ReadonlySet<number> = new Set([PHASE_FAIL_N, PHASE_FAIL, PHASE_SEQUENCE_N, PHASE_SEQUENCE]);
const SEQUENCE_RELAYS: ReadonlySet<number> = new Set([PHASE_SEQUENCE_N, PHASE_SEQUENCE]);
const PHASES: readonly PotentialLabel[] = ['L1', 'L2', 'L3'];

const drivesKey = (element: SchemaElement): boolean => element.name !== ''
  && (COIL_INPUTS[element.typeCode] !== undefined || PHASE_RELAYS.has(element.typeCode));

/** Ключи катушек, которые выставляет панель (для порядка пересчёта в relay-loop.ts). */
export function electronicRelayKeys(schema: Schema): string[] {
  return schema.elements.filter(drivesKey).flatMap((element) => (element.typeCode === SSR_REVERSING
    ? [element.name, element.name + REVERSE_SUFFIX] : [element.name]));
}

/** Единственная фаза сети или undefined (нет фазы или КЗ между фазами). */
function phaseOf(net: NetState | undefined): number | undefined {
  const found = PHASES.flatMap((phase, index) => (net?.potentials.includes(phase) ? [index] : []));
  return found.length === 1 ? found[0] : undefined;
}

/** Реле контроля фаз: три разные фазы, у «+ N» нейтраль, у реле чередования прямой порядок. */
export function phaseRelayOn(typeCode: number, nets: readonly (NetState | undefined)[]): boolean {
  const phases = nets.slice(0, 3).map(phaseOf);
  if (phases.some((phase) => phase === undefined) || new Set(phases).size !== 3) return false;
  if (typeCode === PHASE_FAIL_N && !(nets[3]?.potentials.includes('N') && phaseOf(nets[3]) === undefined)) return false;
  if (!SEQUENCE_RELAYS.has(typeCode)) return true;
  const [a, b, c] = phases as number[];
  return (b! - a! + 3) % 3 === 1 && (c! - b! + 3) % 3 === 1;
}

function coilOn(typeCode: number, a: NetState | undefined, b: NetState | undefined): boolean {
  if (!a || !b || !isEnergized(a, b).energized) return false;
  // SSR DC: вход через диод, при обратной полярности не включается.
  return !(typeCode === SSR_DC && a.potentials.includes('-') && b.potentials.includes('+'));
}

/** Выставляет катушки панели по напряжению на входах (вызывается из relay-pass.ts). */
export function applyElectronicRelayInputs(
  schema: Schema,
  terminalNet: Readonly<Record<TerminalKey, number>>,
  netById: ReadonlyMap<number, NetState>,
  next: Record<string, boolean>,
): void {
  const netOf = (element: SchemaElement, index: number): NetState | undefined => {
    const id = terminalNet[terminalKey(element.id, index)];
    return id === undefined ? undefined : netById.get(id);
  };
  const set = (key: string, on: boolean): void => { next[key] = (next[key] ?? false) || on; };
  for (const element of schema.elements) {
    if (!drivesKey(element)) continue;
    if (PHASE_RELAYS.has(element.typeCode)) {
      const nets = element.terminals.map((_, index) => netOf(element, index));
      set(element.name, phaseRelayOn(element.typeCode, nets));
      continue;
    }
    const [a1, a2] = COIL_INPUTS[element.typeCode]!;
    const forward = coilOn(element.typeCode, netOf(element, a1), netOf(element, a2));
    if (element.typeCode !== SSR_REVERSING) {
      set(element.name, forward);
      continue;
    }
    const backward = coilOn(element.typeCode, netOf(element, 8), netOf(element, a2));
    set(element.name, forward && !backward);
    set(element.name + REVERSE_SUFFIX, backward && !forward);
  }
}

/** Пары A1–A2 катушек U защиты от перенапряжений. */
const OVERVOLTAGE_COILS: Readonly<Record<number, ReadonlyArray<readonly [number, number]>>> = {
  [OVERVOLTAGE_2P]: [[4, 5]],
  [OVERVOLTAGE_4P]: [[8, 9], [10, 11], [12, 13]],
};

/** Межфазное напряжение (400 V) на катушке, рассчитанной на фазное. */
function overvoltage(a: NetState | undefined, b: NetState | undefined): boolean {
  const pa = phaseOf(a);
  const pb = phaseOf(b);
  return pa !== undefined && pb !== undefined && pa !== pb;
}

/**
 * Включённые аппараты 9044 / 9045, на катушке которых перенапряжение. Ничего не меняет: вызывающий
 * выключает их (inputs.toggled[id] = false) и пересчитывает схему; включить снова можно только кликом.
 */
export function findOvervoltageTrips(schema: Schema, state: EngineState, inputs: UserInputs): number[] {
  const nets = new Map(state.nets.map((net) => [net.id, net] as const));
  const netOf = (element: SchemaElement, index: number): NetState | undefined => {
    const id = state.terminalNet[terminalKey(element.id, index)];
    return id === undefined ? undefined : nets.get(id);
  };
  return schema.elements.filter((element) => {
    const coils = OVERVOLTAGE_COILS[element.typeCode];
    if (!coils || inputs.toggled[element.id] === false) return false;
    return coils.some(([a, b]) => overvoltage(netOf(element, a), netOf(element, b)));
  }).map((element) => element.id);
}
