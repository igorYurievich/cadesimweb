/**
 * LOGO! 10202 и Ladder (10050 NA, 10051 NC, 10060 катушка).
 *
 * Программа LOGO — это контакты и катушки Ladder на листе. Катушка Ladder — обычная именованная катушка:
 * включена, когда между шинами «+» и «−» (3008 / 3009) есть путь через замкнутые контакты. Контакт Ladder
 * следует за операндом с тем же именем, как вспомогательный контакт за катушкой. Операнды I1…I8 задаёт
 * сам модуль: вход включён, когда модуль запитан (фаза на P1, нейтраль на P2) и на входе есть фаза
 * относительно P2. Выход Qk — сухой контакт 1-2, замкнут, пока модуль запитан и операнд Qk включён.
 */

import type { Schema, SchemaElement } from '../model/types';
import {
  LADDER_COIL, LADDER_NC, LADDER_NO, LOGO_POWER, PLC_FIXED_LABELS,
} from '../model/plc-types';
import {
  LOGO_BASE, LOGO_DM8, LOGO_MODULE_TYPES, MODULE_SHAPE, moduleInputIndex, moduleOutputPair, plcAddresses,
} from '../model/plc-modules';
import {
  LADDER_FALL, LADDER_FIRST_SCAN, LADDER_RESET, LADDER_RISE, LADDER_SET, PLC_BLOCK, isPlcBlock,
} from '../model/plc-blocks';
import type { BehaviorLink, TypeBehavior } from './behaviors';
import { isEnergized } from './loads';
import type { NetState, TerminalKey, TimerState } from './types';
import { terminalKey } from './types';

/** Ключ «модуль запитан» в карте катушек (с именем пользователя не совпадёт). */
export const logoPowerKey = (element: SchemaElement): string => `@LOGO${element.id}`;

const outputLinks = (typeCode: number): BehaviorLink[] =>
  Array.from({ length: MODULE_SHAPE[typeCode]?.outputs ?? 0 }, (_, k) => ({
    terminals: moduleOutputPair(typeCode, k), kind: 'switch', control: 'plc-output', output: k,
  }));

export const PLC_BEHAVIORS: readonly TypeBehavior[] = [
  { typeCode: LOGO_BASE, links: outputLinks(LOGO_BASE) },
  { typeCode: LOGO_DM8, links: outputLinks(LOGO_DM8) },
  // Провода образца CADe_S1.cad (шина «+» и «Cable color»): ребра даёт graph.ts.
  { typeCode: 4018, links: [{ terminals: [], kind: 'none', control: 'always' }] },
  { typeCode: 4019, links: [{ terminals: [], kind: 'none', control: 'always' }] },
  { typeCode: LADDER_NO, links: [{ terminals: [0, 1], kind: 'switch', control: 'coil-name' }] },
  { typeCode: LADDER_NC, links: [{ terminals: [0, 1], kind: 'switch', control: 'coil-name', normallyClosed: true }] },
  { typeCode: LADDER_COIL, links: [{ terminals: [0, 1], kind: 'load', control: 'always' }] },
  // Фронты и First Scan: контакт проводит один кадр (plcEdgeActive).
  ...[LADDER_RISE, LADDER_FALL, LADDER_FIRST_SCAN].map((typeCode): TypeBehavior => ({
    typeCode, links: [{ terminals: [0, 1], kind: 'switch', control: 'plc-edge' }],
  })),
  // Set / Reset: защёлка операнда (applyPlcCoils); блоки: выход — источник «+» (plc-blocks.ts).
  ...[LADDER_SET, LADDER_RESET].map((typeCode): TypeBehavior => ({
    typeCode, links: [{ terminals: [0, 1], kind: 'load', control: 'always' }],
  })),
  ...Object.values(PLC_BLOCK).map((typeCode): TypeBehavior => ({
    typeCode, links: [{ terminals: [], kind: 'none', control: 'always' }],
  })),
];

/** Ключи кадра в карте катушек: значение операнда в прошлом кадре и признак первого кадра. */
export const PREV_PREFIX = '@prev:';
export const FIRST_SCAN_KEY = '@first';
export const SCANNED_KEY = '@scanned';

/** Контакт фронта / First Scan: нарастание или спад операнда в этом кадре, либо первый кадр. */
export function plcEdgeActive(element: SchemaElement, coils: Readonly<Record<string, boolean>>): boolean {
  if (element.typeCode === LADDER_FIRST_SCAN) return coils[FIRST_SCAN_KEY] ?? false;
  const now = coils[element.name] ?? false;
  const before = coils[PREV_PREFIX + element.name] ?? false;
  return element.typeCode === LADDER_RISE ? now && !before : !now && before;
}

const hasPlc = (schema: Schema): boolean =>
  schema.elements.some((element) => element.typeCode >= 10000 && element.typeCode in PLC_FIXED_LABELS);

/** Перед релейным циклом: значения операндов прошлого кадра и признак первого кадра. */
export function beginPlcScan(schema: Schema, names: readonly string[], prev: Readonly<Record<string, boolean>>,
  coils: Record<string, boolean>): void {
  if (!hasPlc(schema)) return;
  for (const name of names) coils[PREV_PREFIX + name] = prev[name] ?? false;
  coils[FIRST_SCAN_KEY] = !(prev[SCANNED_KEY] ?? false);
}

/** После цикла: убрать служебные ключи кадра, отметить, что первый кадр прошёл. */
export function endPlcScan(schema: Schema, coils: Record<string, boolean>): void {
  if (!hasPlc(schema)) return;
  for (const key of Object.keys(coils)) if (key.startsWith(PREV_PREFIX) || key === FIRST_SCAN_KEY) delete coils[key];
  coils[SCANNED_KEY] = true;
}

/** Имена, которые задаёт программа: «запитан» и входы модулей, операнды Set/Reset и имена блоков. */
export function logoRelayNames(schema: Schema): string[] {
  const modules = schema.elements.filter((element) => LOGO_MODULE_TYPES.has(element.typeCode));
  const addresses = plcAddresses(schema);
  const inputs = modules.flatMap((element) => addresses.get(element.id)?.inputs ?? []);
  const named = schema.elements
    .filter((element) => element.name !== '' && (isLatchCoil(element) || isPlcBlock(element.typeCode)))
    .map((element) => element.name);
  return [...modules.map(logoPowerKey), ...inputs, ...named];
}

const isLatchCoil = (element: SchemaElement): boolean =>
  element.typeCode === LADDER_SET || element.typeCode === LADDER_RESET;

/**
 * Set / Reset и блоки в карте катушек следующего прохода: Set включает операнд и держит его, пока нет Reset;
 * имя блока — его выход Q из памяти. `current` — состояние катушек в начале прохода.
 */
export function applyPlcCoils(
  schema: Schema,
  terminalNet: Readonly<Record<TerminalKey, number>>,
  netById: ReadonlyMap<number, NetState>,
  current: Readonly<Record<string, boolean>>,
  next: Record<string, boolean>,
  timers: Readonly<Record<number, TimerState>>,
): void {
  const set = new Map<string, boolean>();
  const reset = new Map<string, boolean>();
  for (const element of schema.elements) {
    if (element.name === '') continue;
    if (isPlcBlock(element.typeCode)) {
      next[element.name] = (next[element.name] ?? false) || (timers[element.id]?.q ?? false);
    }
    if (!isLatchCoil(element)) continue;
    const a = netById.get(terminalNet[terminalKey(element.id, 0)] ?? -1);
    const b = netById.get(terminalNet[terminalKey(element.id, 1)] ?? -1);
    const powered = Boolean(a && b && isEnergized(a, b).energized);
    const target = element.typeCode === LADDER_SET ? set : reset;
    target.set(element.name, (target.get(element.name) ?? false) || powered);
  }
  for (const name of new Set([...set.keys(), ...reset.keys()])) {
    const held = (set.get(name) ?? false) || (current[name] ?? false);
    next[name] = (next[name] ?? false) || (held && !(reset.get(name) ?? false));
  }
}

/** Выход модуля: его операнд (Q1… у базового, Q5… у DM8 рядом с ним) включён и модуль запитан. */
export function logoOutputActive(
  element: SchemaElement, link: BehaviorLink, coils: Readonly<Record<string, boolean>>, schema: Schema,
): boolean {
  const name = plcAddresses(schema).get(element.id)?.outputs[link.output ?? -1];
  return name !== undefined && (coils[name] ?? false) && (coils[logoPowerKey(element)] ?? false);
}

/** Выставляет «запитан» и входы модулей в карте катушек следующего прохода. */
export function applyLogoInputs(
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
  const addresses = plcAddresses(schema);
  for (const element of schema.elements) {
    if (!LOGO_MODULE_TYPES.has(element.typeCode)) continue;
    const neutral = netOf(element, LOGO_POWER.N);
    const powered = energized(netOf(element, LOGO_POWER.L), neutral);
    next[logoPowerKey(element)] = powered;
    addresses.get(element.id)?.inputs.forEach((name, k) => {
      next[name] = (next[name] ?? false) || (powered && energized(netOf(element, moduleInputIndex(k)), neutral));
    });
  }
}
