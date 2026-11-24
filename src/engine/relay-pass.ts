/** Один проход релейного расчёта: контакты, питание, нагрузки, катушки. */

import type { Schema } from '../model/types';
import { DIN_PSU_TYPE } from '../model/plc-power-supply';
import { buildNets } from './graph';
import { computeSwitching } from './switching';
import { findSources } from './sources';
import { propagatePotentials } from './propagate';
import { evaluateLoads, isEnergized } from './loads';
import type { Fault, NetState, TerminalKey, TimerState, UserInputs } from './types';
import { terminalKey } from './types';
import { evaluateMotors } from './motors';
import { resolveThermalState } from './thermal';
import { drivesNamedRelay, relayTriggerActive } from './sensors';
import { applyLogoInputs, applyPlcCoils } from './plc';
import { applyStairTimerInputs } from './stair-timer';
import { applyS7Inputs } from './s7-1200';
import { plcBlockSources } from './plc-blocks';
import { applyGrafcetOutputs } from './grafcet';
import { applyEmitterSupply } from './photo-beam';
import { applyVfdInputs, vfdOutput, vfdSources } from './vfd';
import { VFD_POWER_INDEX, isVfdDrive } from '../model/vfd';

export interface RelayPassResult {
  nets: NetState[];
  terminalNet: Record<TerminalKey, number>;
  coils: Record<string, boolean>;
  contacts: Record<number, boolean>;
  lamps: Record<number, boolean>;
  motors: Record<number, import('./types').MotorState>;
  tripped: Record<number, boolean>;
  faults: Fault[];
  warnings: string[];
}

/** Типовой код механической блокировки (Enclavamiento): имена двух контакторов в name и func. */
const INTERLOCK_TYPE = 2009;

/**
 * Механическая блокировка: пока включён один из двух контакторов, второй включиться не может.
 * `current` — состояние катушек в начале прохода (то, что уже физически притянуто), `next` — то, что
 * цепь хочет выставить; правим `next`. Если оба хотят включиться одновременно, выигрывает первый
 * (имя в name); релейный цикл меняет катушки по одной, так что исход детерминирован.
 */
function applyInterlocks(schema: Schema, current: Readonly<Record<string, boolean>>, next: Record<string, boolean>): void {
  for (const element of schema.elements) {
    if (element.typeCode !== INTERLOCK_TYPE) continue;
    const a = element.name.trim();
    const b = element.func.trim();
    if (a === '' || b === '' || a === b || !(a in next) || !(b in next)) continue;
    const aOn = current[a] ?? false;
    const bOn = current[b] ?? false;
    if (aOn && !bOn) next[b] = false;
    else if (bOn && !aOn) next[a] = false;
    else if (!aOn && !bOn && next[a] && next[b]) next[b] = false;
  }
}

/**
 * Двигатели, питаемые от преобразователя частоты: частота привода, к выходу U V W которого (через замкнутые
 * контакты) подключены выводы двигателя. Скорость на экране пропорциональна ей.
 */
function withDriveFrequency(
  schema: Schema,
  motors: Record<number, import('./types').MotorState>,
  terminalNet: Readonly<Record<TerminalKey, number>>,
  root: (id: number) => number,
  timers: Readonly<Record<number, TimerState>>,
): Record<number, import('./types').MotorState> {
  const groups = new Map<number, number>();
  for (const drive of schema.elements) {
    if (!isVfdDrive(drive.typeCode)) continue;
    const { hz } = vfdOutput(drive, timers);
    if (hz <= 0) continue;
    for (const index of VFD_POWER_INDEX[drive.typeCode]!.outputs) {
      const net = terminalNet[terminalKey(drive.id, index)];
      if (net !== undefined) groups.set(root(net), hz);
    }
  }
  if (groups.size === 0) return motors;
  const result = { ...motors };
  for (const [id, motor] of Object.entries(motors)) {
    if (!motor.running) continue;
    const first = (motor.directionTerminals ?? [0, 1, 2])[0];
    const net = terminalNet[terminalKey(Number(id), first)];
    const hz = net === undefined ? undefined : groups.get(root(net));
    if (hz !== undefined) result[Number(id)] = { ...motor, hz };
  }
  return result;
}

/**
 * Выполняет расчёт с заданными состояниями катушек. Новые состояния катушек
 * становятся входом следующего прохода, поэтому соответствующие контакты
 * меняются на следующей итерации, а не внутри этого прохода.
 */
export function solvePass(
  schema: Schema,
  inputs: UserInputs,
  coils: Readonly<Record<string, boolean>> = {},
  timers: Readonly<Record<number, TimerState>> = {},
): RelayPassResult {
  const graph = buildNets(schema);
  const thermal = resolveThermalState(schema, inputs);
  const switching = computeSwitching(schema, inputs, coils, thermal, timers);
  const sourceResult = findSources(schema, graph.terminalNet);
  let nets = propagatePotentials(graph.nets, graph.terminalNet, sourceResult.sources, switching.edges, switching.transfers);
  // Блоки питания создают DC-шины только при наличии подходящего AC-входа (блок на DIN-рейку — как 3014).
  const converterSources: import('./sources').PotentialSource[] = [];
  const converterTypes: readonly number[] = [3014, DIN_PSU_TYPE, 3018];
  for (const converter of schema.elements) {
    if (!converterTypes.includes(converter.typeCode)) continue;
    const phaseInputs = converter.typeCode === 3018 ? [0, 1, 2] : [0, 1];
    const inputPotentials = phaseInputs.map((index) => {
      const netId = graph.terminalNet[terminalKey(converter.id, index)];
      return netId === undefined ? undefined : nets.find((net) => net.id === netId)?.potentials ?? [];
    });
    let active = false;
    if (converter.typeCode === 3018) {
      const inputNets = phaseInputs.map((index) => graph.terminalNet[terminalKey(converter.id, index)]);
      active = inputPotentials.every((potentials, index) => potentials?.includes((['L1', 'L2', 'L3'] as const)[index] as 'L1' | 'L2' | 'L3'))
        && inputNets.every((net) => net !== undefined) && new Set(inputNets).size === 3;
    } else {
      const firstNet = graph.terminalNet[terminalKey(converter.id, 0)];
      const secondNet = graph.terminalNet[terminalKey(converter.id, 1)];
      const first = inputPotentials[0] ?? [];
      const second = inputPotentials[1] ?? [];
      const phaseLabels = ['L1', 'L2', 'L3'] as const;
      const firstPhases = phaseLabels.filter((phase) => first.includes(phase));
      const secondPhases = phaseLabels.filter((phase) => second.includes(phase));
      const twoPhases = firstNet !== undefined && secondNet !== undefined && firstNet !== secondNet
        && firstPhases.some((phase) => secondPhases.some((other) => phase !== other));
      const separateInputs = firstNet !== undefined && secondNet !== undefined && firstNet !== secondNet;
      const phaseAndNeutral = separateInputs && ((firstPhases.length > 0 && second.includes('N')) || (secondPhases.length > 0 && first.includes('N')));
      active = twoPhases || phaseAndNeutral;
    }
    if (!active) continue;
    const positiveIndex = converter.typeCode === 3018 ? 3 : 2;
    const negativeIndex = converter.typeCode === 3018 ? 4 : 3;
    const positiveNet = graph.terminalNet[terminalKey(converter.id, positiveIndex)];
    const negativeNet = graph.terminalNet[terminalKey(converter.id, negativeIndex)];
    if (positiveNet !== undefined) converterSources.push({ terminal: { element: converter.id, index: positiveIndex }, net: positiveNet, potential: '+' });
    if (negativeNet !== undefined) converterSources.push({ terminal: { element: converter.id, index: negativeIndex }, net: negativeNet, potential: '-' });
  }
  // Выходы включённых блоков Ladder отдают «+» (plc-blocks.ts).
  converterSources.push(...plcBlockSources(schema, graph.terminalNet, timers));
  // Преобразователи частоты: «+»/0V блока управления и фазы на U V W, пока есть частота (vfd.ts).
  converterSources.push(...vfdSources(schema, graph.terminalNet, new Map(nets.map((net) => [net.id, net] as const)), timers));
  if (converterSources.length) {
    nets = propagatePotentials(graph.nets, graph.terminalNet, [...sourceResult.sources, ...converterSources], switching.edges, switching.transfers);
  }
  const initialMotors = evaluateMotors(schema, nets, graph.terminalNet, switching.edges);
  // В сбалансированном режиме «звезда» общая точка U2/V2/W2 имеет потенциал
  // нейтрали. Добавляем этот опорный потенциал после проверки трёх фаз и
  // замкнутой звёздной цепи; он позволяет движку запитывать подключённые нагрузки,
  // не протаскивая L1/L2/L3 в общую точку и не создавая ложное КЗ.
  const potentialParent = new Map(nets.map((net) => [net.id, net.id] as const));
  const potentialRoot = (id: number): number => {
    let current = id;
    while ((potentialParent.get(current) ?? current) !== current) current = potentialParent.get(current) as number;
    return current;
  };
  for (const edge of switching.edges) {
    const a = graph.terminalNet[terminalKey(edge.a.element, edge.a.index)];
    const b = graph.terminalNet[terminalKey(edge.b.element, edge.b.index)];
    if (a === undefined || b === undefined) continue;
    const ra = potentialRoot(a); const rb = potentialRoot(b);
    if (ra !== rb) potentialParent.set(ra, rb);
  }
  const starSources: import('./sources').PotentialSource[] = [];
  for (const motor of schema.elements) {
    if (motor.typeCode !== 1001 || !initialMotors[motor.id]?.running) continue;
    const lower = [5, 6, 4].map((index) => graph.terminalNet[terminalKey(motor.id, index)]);
    const starNet = lower[0];
    if (starNet === undefined || lower.some((id) => id === undefined || potentialRoot(id) !== potentialRoot(starNet))) continue;
    const starRoot = potentialRoot(starNet);
    if (nets.some((net) => potentialRoot(net.id) === starRoot && net.potentials.some((potential) => potential === 'L1' || potential === 'L2' || potential === 'L3'))) continue;
    starSources.push({ terminal: { element: motor.id, index: 5 }, net: starNet, potential: 'N' });
  }
  if (starSources.length > 0) {
    nets = propagatePotentials(graph.nets, graph.terminalNet, [...sourceResult.sources, ...starSources], switching.edges, switching.transfers);
  }
  const loads = evaluateLoads(schema, nets, graph.terminalNet);
  const netById = new Map(nets.map((net) => [net.id, net] as const));
  const nextCoils: Record<string, boolean> = {};

  for (const element of schema.elements) {
    if (!drivesNamedRelay(element) || element.name === '') continue;
    nextCoils[element.name] ??= false;
    if (!relayTriggerActive(element, inputs)) continue;
    const aId = graph.terminalNet[terminalKey(element.id, 0)];
    const bId = graph.terminalNet[terminalKey(element.id, 1)];
    const a = aId === undefined ? undefined : netById.get(aId);
    const b = bId === undefined ? undefined : netById.get(bId);
    if (a && b && isEnergized(a, b).energized) nextCoils[element.name] = true;
  }

  // LOGO: питание модуля и входы I1…I8 (plc.ts).
  applyLogoInputs(schema, graph.terminalNet, netById, nextCoils);
  applyStairTimerInputs(schema, graph.terminalNet, netById, nextCoils);
  applyS7Inputs(schema, graph.terminalNet, netById, nextCoils);
  applyVfdInputs(schema, graph.terminalNet, netById, nextCoils, inputs);
  // Излучатели фотобарьеров: светят, пока запитаны (photo-beam.ts).
  applyEmitterSupply(schema, graph.terminalNet, netById, nextCoils);
  applyPlcCoils(schema, graph.terminalNet, netById, coils, nextCoils, timers);
  // Действия активных этапов GRAFCET (grafcet.ts).
  applyGrafcetOutputs(schema, timers, nextCoils);
  applyInterlocks(schema, coils, nextCoils);

  return {
    nets,
    terminalNet: graph.terminalNet,
    coils: nextCoils,
    contacts: switching.contacts,
    lamps: loads.lamps,
    motors: withDriveFrequency(schema, evaluateMotors(schema, nets, graph.terminalNet, switching.edges), graph.terminalNet, potentialRoot, timers),
    tripped: thermal.tripped,
    faults: loads.faults,
    warnings: [
      ...graph.warnings.map((warning) => warning.message),
      ...switching.warnings,
      ...sourceResult.warnings,
    ],
  };
}
