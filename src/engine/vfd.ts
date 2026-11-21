/** Преобразователь частоты 1054/1055 + блок управления 1056 (model/vfd.ts): питание, входы, частота с рампами. */

import type { Schema, SchemaElement } from '../model/types';
import {
  VFD_2D_1PH, VFD_CONTROL, isVfd2d, VFD_NOMINAL_HZ, VFD_POWER_INDEX, VFD_SIGNALS, isVfdDrive, vfdControlFor, vfdControlIndex,
  vfdDriveFor, vfdKey, vfdSettings,
} from '../model/vfd';
import type { PotentialSource } from './sources';
import { terminalKey, type NetState, type PotentialLabel, type TerminalKey, type TimerState, type UserInputs } from './types';

const PHASES = ['L1', 'L2', 'L3'] as const;
type Nets = ReadonlyMap<number, NetState>;
type TerminalNets = Readonly<Record<TerminalKey, number>>;

const netOf = (element: SchemaElement, index: number, terminalNet: TerminalNets, nets: Nets): NetState | undefined => {
  const id = terminalNet[terminalKey(element.id, index)];
  return id === undefined ? undefined : nets.get(id);
};

/** Питание силовой части: III — три разные фазы на L1 L2 L3; II — фаза и N (или две разные фазы) на L1 N. */
export function vfdSupplied(drive: SchemaElement, terminalNet: TerminalNets, nets: Nets): boolean {
  const spec = VFD_POWER_INDEX[drive.typeCode];
  if (!spec) return false;
  const potentials = spec.inputs.map((index) => netOf(drive, index, terminalNet, nets)?.potentials ?? []);
  const phases = potentials.map((list) => PHASES.filter((phase) => list.includes(phase)));
  if (spec.inputs.length === 3) {
    return phases.every((list) => list.length === 1) && new Set(phases.map((list) => list[0])).size === 3;
  }
  const [a = [], b = []] = phases;
  const [pa = [], pb = []] = potentials;
  const twoPhases = a.length === 1 && b.length === 1 && a[0] !== b[0];
  const phaseNeutral = (a.length === 1 && b.length === 0 && pb.includes('N')) || (b.length === 1 && a.length === 0 && pa.includes('N'));
  return twoPhases || phaseNeutral;
}

/** Частота на выходе привода (Гц) и направление по памяти кадра. */
export const vfdOutput = (drive: SchemaElement, timers: Readonly<Record<number, TimerState>>): { hz: number; dir: 1 | -1 } => ({
  hz: Math.max(0, timers[drive.id]?.hz ?? 0),
  dir: timers[drive.id]?.dir === -1 ? -1 : 1,
});

/** Реле RA–RC блока управления: замкнуто, пока привод выдаёт частоту. */
export function vfdRelayActive(control: SchemaElement, schema: Schema, timers: Readonly<Record<number, TimerState>>): boolean {
  const drive = vfdDriveFor(schema, control);
  return drive !== undefined && vfdOutput(drive, timers).hz > 0;
}

/** Операнды всех приводов (для списка катушек relay-loop.ts). */
export function vfdKeys(schema: Schema): string[] {
  return schema.elements.filter((element) => isVfdDrive(element.typeCode)).flatMap((drive) => VFD_SIGNALS.map((s) => vfdKey(drive, s)));
}

/**
 * Источники потенциала приводов: при питании — «+» 24 V на клеммах «+» и «−» на 0V блока управления;
 * пока есть частота — фазы на U V W (вперёд L1 L2 L3, назад L1 L3 L2).
 */
export function vfdSources(
  schema: Schema, terminalNet: TerminalNets, nets: Nets, timers: Readonly<Record<number, TimerState>>,
): PotentialSource[] {
  const sources: PotentialSource[] = [];
  const add = (element: SchemaElement, index: number, potential: PotentialLabel): void => {
    const net = terminalNet[terminalKey(element.id, index)];
    if (net !== undefined) sources.push({ terminal: { element: element.id, index }, net, potential });
  };
  for (const drive of schema.elements) {
    if (!isVfdDrive(drive.typeCode) || !vfdSupplied(drive, terminalNet, nets)) continue;
    const control = vfdControlFor(schema, drive);
    if (control) {
      const index = vfdControlIndex(control);
      for (const plus of index.PLUS) add(control, plus, '+');
      add(control, index.ZERO, '-');
    }
    const { hz, dir } = vfdOutput(drive, timers);
    if (hz <= 0) continue;
    const order = dir === 1 ? PHASES : (['L1', 'L3', 'L2'] as const);
    VFD_POWER_INDEX[drive.typeCode]!.outputs.forEach((index, k) => add(drive, index, order[k] as PotentialLabel));
  }
  return sources;
}

/**
 * Выставляет операнды привода: питание и входы I1…I4 (активен, когда на входе «+»).
 * У 2D-преобразователя ещё панель: RUN включает ход вперёд (inputs.toggled[id]), STOP — снимает; клеммы X1/X2 тоже работают.
 */
export function applyVfdInputs(
  schema: Schema, terminalNet: TerminalNets, nets: Nets, next: Record<string, boolean>, inputs?: UserInputs,
): void {
  for (const drive of schema.elements) {
    if (!isVfdDrive(drive.typeCode)) continue;
    const on = vfdSupplied(drive, terminalNet, nets);
    const control = vfdControlFor(schema, drive);
    const input = (index: number): boolean => {
      if (!on || !control) return false;
      const potentials = netOf(control, index, terminalNet, nets)?.potentials ?? [];
      return potentials.includes('+') && !potentials.includes('-');
    };
    const index = control ? vfdControlIndex(control) : undefined;
    // Панель 2D: RUN / STOP — inputs.toggled[id]; REV/JOG (у однофазного) — направление с панели, inputs.positions[id] = 1.
    const panelRun = on && isVfd2d(drive.typeCode) && inputs?.toggled[drive.id] === true;
    const panelRev = drive.typeCode === VFD_2D_1PH && inputs?.positions?.[drive.id] === 1;
    const x1 = index !== undefined && input(index.I1);
    const x2 = index !== undefined && input(index.I2);
    next[vfdKey(drive, 'ON')] = on;
    next[vfdKey(drive, 'F')] = x1 || (panelRun && !panelRev && !x2);
    next[vfdKey(drive, 'R')] = x2 || (panelRun && panelRev && !x1);
    next[vfdKey(drive, 'P1')] = index !== undefined && input(index.I3);
    next[vfdKey(drive, 'P2')] = index !== undefined && input(index.I4);
  }
}

/** Заданная частота по входам I3/I4: без них — AI, I3 — 1, I4 — 2, I3+I4 — 3. */
export function vfdTargetHz(control: SchemaElement | undefined, p1: boolean, p2: boolean): number {
  const s = vfdSettings(control);
  return [s.aiHz, s.preset1, s.preset2, s.preset3][(p1 ? 1 : 0) + (p2 ? 2 : 0)] as number;
}

/**
 * Частота приводов на кадр: разгон и торможение по рампам (время 0 ↔ 50 Гц), смена направления — через ноль.
 * Пропало питание — частота сразу 0. Состояние хранится в EngineMemory.timers по id силовой части (hz, dir).
 */
export function advanceVfds(
  schema: Schema, coils: Readonly<Record<string, boolean>>, time: number, previous: Readonly<Record<number, TimerState>>,
): Record<number, TimerState> {
  const result: Record<number, TimerState> = { ...previous };
  const now = Number.isFinite(time) ? time : 0;
  for (const drive of schema.elements) {
    if (!isVfdDrive(drive.typeCode)) continue;
    const prior = previous[drive.id];
    const dt = Math.max(0, now - (Number.isFinite(prior?.lastTime) ? prior!.lastTime as number : now));
    const control = vfdControlFor(schema, drive);
    const settings = vfdSettings(control);
    const on = coils[vfdKey(drive, 'ON')] ?? false;
    const fwd = coils[vfdKey(drive, 'F')] ?? false;
    const rev = coils[vfdKey(drive, 'R')] ?? false;
    const command: 0 | 1 | -1 = on && fwd !== rev ? (fwd ? 1 : -1) : 0;
    let hz = Math.max(0, prior?.hz ?? 0);
    let dir: 1 | -1 = prior?.dir === -1 ? -1 : 1;
    const upRate = settings.rampUp > 0 ? VFD_NOMINAL_HZ / settings.rampUp : Infinity;
    const downRate = settings.rampDown > 0 ? VFD_NOMINAL_HZ / settings.rampDown : Infinity;
    const toward = (target: number): void => {
      if (hz < target) hz = Math.min(target, hz + upRate * dt);
      else if (hz > target) hz = Math.max(target, hz - downRate * dt);
    };
    if (!on) hz = 0;
    else if (command === 0) toward(0);
    else if (command !== dir && hz > 0) toward(0);
    else {
      dir = command;
      toward(vfdTargetHz(control, coils[vfdKey(drive, 'P1')] ?? false, coils[vfdKey(drive, 'P2')] ?? false));
    }
    if (hz < 1e-6) hz = 0;
    result[drive.id] = { phase: hz > 0 ? 'counting' : 'idle', elapsed: 0, lastTime: now, hz: Math.round(hz * 1000) / 1000, dir };
  }
  return result;
}

export const isVfdControlBlock = (element: SchemaElement): boolean => element.typeCode === VFD_CONTROL;
