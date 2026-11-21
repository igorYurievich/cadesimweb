/** Состояние двигателей: трёхфазные 1000 (этап 5.6a), шестивыводные 1001 (звезда/треугольник), остальные типы панели «Motores». */

import type { Schema } from '../model/types';
import type { MotorState, NetState, TerminalKey } from './types';
import type { ClosedEdge } from './switching';
import { terminalKey } from './types';

const PHASES = ['L1', 'L2', 'L3'] as const;
/** Потенциалы питания переменного тока (фазы и нейтраль): PE питанием не считается. */
const AC_SUPPLY = ['L1', 'L2', 'L3', 'N'] as const;

/** Двухскоростные двигатели: U1 V1 W1 (0, 1, 2) — малая скорость, U2 V2 W2 (4, 5, 6) — большая. */
const LOW_SET = [0, 1, 2] as const;
const HIGH_SET = [4, 5, 6] as const;

/** Резисторы 1050 / 1051: через них ротор 1004 замкнут на пусковые сопротивления (пониженная скорость). */
const RESISTOR_TYPES: ReadonlySet<number> = new Set([1050, 1051]);

/** Мотор вращается только при одной отдельной фазе на каждом U1/V1/W1. */
export function evaluateMotors(
  schema: Schema,
  nets: readonly NetState[],
  terminalNet: Record<TerminalKey, number>,
  edges: readonly ClosedEdge[] = [],
): Record<number, MotorState> {
  const netById = new Map(nets.map((net) => [net.id, net] as const));
  const motors: Record<number, MotorState> = {};

  // Цепи, соединённые замкнутыми контактами, образуют одну группу (нужно для общей точки звезды без источника).
  const parent = new Map<number, number>();
  const root = (id: number): number => {
    let current = id;
    while ((parent.get(current) ?? current) !== current) current = parent.get(current) as number;
    return current;
  };
  for (const edge of edges) {
    const a = terminalNet[terminalKey(edge.a.element, edge.a.index)];
    const b = terminalNet[terminalKey(edge.b.element, edge.b.index)];
    if (a === undefined || b === undefined) continue;
    const ra = root(a);
    const rb = root(b);
    if (ra !== rb) parent.set(ra, rb);
  }
  // Те же группы, но без резисторов: так видно, замкнут ли ротор накоротко (контактором) или через сопротивления.
  const directParent = new Map<number, number>();
  const directRoot = (id: number): number => {
    let current = id;
    while ((directParent.get(current) ?? current) !== current) current = directParent.get(current) as number;
    return current;
  };
  const typeOf = new Map(schema.elements.map((element) => [element.id, element.typeCode] as const));
  for (const edge of edges) {
    if (RESISTOR_TYPES.has(typeOf.get(edge.element) ?? 0)) continue;
    const a = terminalNet[terminalKey(edge.a.element, edge.a.index)];
    const b = terminalNet[terminalKey(edge.b.element, edge.b.index)];
    if (a === undefined || b === undefined) continue;
    const ra = directRoot(a);
    const rb = directRoot(b);
    if (ra !== rb) directParent.set(ra, rb);
  }
  const groupPhases = (id: number): string[] => {
    const group = root(id);
    return PHASES.filter((phase) => nets.some((net) => root(net.id) === group && net.potentials.includes(phase)));
  };

  const netOf = (elementId: number, index: number): NetState | undefined => {
    const netId = terminalNet[terminalKey(elementId, index)];
    return netId === undefined ? undefined : netById.get(netId);
  };
  const phasesOf = (net: NetState | undefined): string[] => PHASES.filter((phase) => net?.potentials.includes(phase));
  const acPotentialsOf = (elementId: number, index: number): string[] =>
    AC_SUPPLY.filter((potential) => netOf(elementId, index)?.potentials.includes(potential));
  /** Однофазное питание между двумя выводами: на каждом ровно один потенциал питания, они разные, и хотя бы один из них фаза. */
  const singlePhaseSupplied = (elementId: number, a: number, b: number): boolean => {
    const left = acPotentialsOf(elementId, a);
    const right = acPotentialsOf(elementId, b);
    const first = left[0];
    const second = right[0];
    return left.length === 1 && right.length === 1 && first !== second;
  };

  for (const element of schema.elements) {
    if (element.typeCode === 1004) {
      // Ротор с кольцами: статор U1 V1 W1 на трёх разных фазах, цепь ротора K L M (4, 5, 6) замкнута в звезду
      // без фазы — накоротко (полная скорость) или через пусковые резисторы (медленно). Ротор разомкнут — не идёт.
      const stator = [0, 1, 2].map((index) => phasesOf(netOf(element.id, index)));
      const statorOk = stator.every((phases) => phases.length === 1)
        && new Set(stator.map((phases) => phases[0])).size === 3;
      const rotor = [4, 5, 6].map((index) => netOf(element.id, index));
      const closedBy = (group: (id: number) => number): boolean => {
        const first = rotor[0];
        return first !== undefined && rotor.every((net) => net !== undefined && group(net.id) === group(first.id))
          && !nets.some((net) => group(net.id) === group(first.id) && net.potentials.some((p) => p !== 'PE'));
      };
      const shorted = closedBy(directRoot);
      const running = statorOk && (shorted || closedBy(root));
      motors[element.id] = {
        running,
        faulted: stator.some((phases) => phases.length > 0) && !running,
        ...(running && !shorted ? { slow: true } : {}),
      };
      continue;
    }
    if (element.typeCode === 1001) {
      // Шесть выводов: обмотки U1–U2, V1–V2, W1–W2 (индексы 0–5, 1–6, 2–4; PE — индекс 3).
      const top = [0, 1, 2].map((index) => phasesOf(netOf(element.id, index)));
      const topDistinct = top.every((phases) => phases.length === 1) && new Set(top.map((phases) => phases[0])).size === 3;
      const topHasPhase = top.some((phases) => phases.length > 0);
      const bottomIndexes = [5, 6, 4];
      const bottomNets = bottomIndexes.map((index) => netOf(element.id, index));
      // Звезда: W2 U2 V2 соединены между собой замкнутыми контактами и общая точка без фазы.
      const first = bottomNets[0];
      const star = first !== undefined
        && bottomNets.every((net) => net !== undefined && root(net.id) === root(first.id))
        && groupPhases(first.id).length === 0;
      // Треугольник: на каждом нижнем выводе ровно одна фаза, отличная от фазы своего верхнего вывода.
      const delta = bottomNets.every((net, i) => {
        const bottom = phasesOf(net);
        const upper = top[i] ?? [];
        return bottom.length === 1 && upper.length === 1 && bottom[0] !== upper[0];
      });
      motors[element.id] = {
        running: topDistinct && (star || delta),
        faulted: topHasPhase && !topDistinct,
      };
      continue;
    }
    if (element.typeCode === 1003 || element.typeCode === 1005) {
      // Две скорости.
      // 1003 Dahlander (одна обмотка): малая — треугольник, три фазы на U1 V1 W1, а U2 V2 W2 свободны;
      //   большая — двойная звезда, три фазы на U2 V2 W2, а U1 V1 W1 закорочены между собой (точка звезды без фазы).
      // 1005 (две отдельные обмотки): малая — три фазы на U1 V1 W1, большая — на U2 V2 W2.
      // Фазы на обеих тройках сразу — короткое замыкание: двигатель не идёт.
      const distinct = (set: readonly number[]): boolean => {
        const phases = set.map((index) => phasesOf(netOf(element.id, index)));
        return phases.every((list) => list.length === 1) && new Set(phases.map((list) => list[0])).size === 3;
      };
      const touched = (set: readonly number[]): boolean => set.some((index) => phasesOf(netOf(element.id, index)).length > 0);
      const lowFed = distinct(LOW_SET);
      const highFed = distinct(HIGH_SET);
      const starPoint = (): boolean => {
        const nets3 = LOW_SET.map((index) => netOf(element.id, index));
        const first = nets3[0];
        return first !== undefined && nets3.every((net) => net !== undefined && root(net.id) === root(first.id))
          && groupPhases(first.id).length === 0;
      };
      const low = lowFed && !touched(HIGH_SET);
      const high = highFed && !touched(LOW_SET) && (element.typeCode === 1005 || starPoint());
      const running = low || high;
      motors[element.id] = {
        running,
        faulted: (touched(LOW_SET) || touched(HIGH_SET)) && !running,
        ...(running ? { speed: high ? 'high' as const : 'low' as const } : {}),
        ...(high ? { directionTerminals: HIGH_SET } : {}),
      };
      continue;
    }
    if (element.typeCode === 1008) {
      // У этого двигателя обмотки расположены между U1–V1 и U2–V2; их полярность задаёт направление.
      const mainWinding = singlePhaseSupplied(element.id, 0, 1);
      const auxiliaryWinding = singlePhaseSupplied(element.id, 3, 4);
      const main = [acPotentialsOf(element.id, 0)[0], acPotentialsOf(element.id, 1)[0]];
      const auxiliary = [acPotentialsOf(element.id, 3)[0], acPotentialsOf(element.id, 4)[0]];
      const running = mainWinding && auxiliaryWinding;
      motors[element.id] = {
        running,
        faulted: false,
        reversed: running && main[0] === auxiliary[1] && main[1] === auxiliary[0],
      };
      continue;
    }
    if (element.typeCode === 1002) {
      // Однофазный: обмотка U1–V1, нужна фаза на одном выводе и нейтраль (или другая фаза) на другом.
      motors[element.id] = { running: singlePhaseSupplied(element.id, 0, 1), faulted: false };
      continue;
    }
    if (element.typeCode === 1010) {
      // Трёхфазный как однофазный (с конденсатором): питание между любыми двумя выводами U1 V1 W1.
      const pairs: Array<[number, number]> = [[0, 1], [0, 2], [1, 2]];
      motors[element.id] = { running: pairs.some(([a, b]) => singlePhaseSupplied(element.id, a, b)), faulted: false };
      continue;
    }
    if (element.typeCode === 1006 || element.typeCode === 1007) {
      // Постоянный ток: «+» на одном якорном выводе A1/A2 и «−» на другом; у 1007 ещё питание обмотки возбуждения F1/F2.
      const polarity = (a: number, b: number): 1 | -1 | 0 => {
        const pa = netOf(element.id, a)?.potentials ?? [];
        const pb = netOf(element.id, b)?.potentials ?? [];
        if (pa.includes('+') && pb.includes('-') && !pa.includes('-') && !pb.includes('+')) return 1;
        if (pa.includes('-') && pb.includes('+') && !pa.includes('+') && !pb.includes('-')) return -1;
        return 0;
      };
      const armature = polarity(0, 1);
      const fieldOk = element.typeCode === 1006 || polarity(3, 4) !== 0;
      motors[element.id] = { running: armature !== 0 && fieldOk, faulted: false, reversed: armature === -1 };
      continue;
    }
    if (element.typeCode !== 1000) continue;
    const phaseSets = [0, 1, 2].map((index) => {
      const netId = terminalNet[terminalKey(element.id, index)];
      const net = netId === undefined ? undefined : netById.get(netId);
      return new Set(PHASES.filter((phase) => net?.potentials.includes(phase)));
    });
    const hasPower = [0, 1, 2].some((index) => {
      const netId = terminalNet[terminalKey(element.id, index)];
      const net = netId === undefined ? undefined : netById.get(netId);
      return net?.potentials.some((potential) => potential !== 'PE') ?? false;
    });

    const uniquePhases = phaseSets.every((phases) => phases.size === 1)
      && new Set(phaseSets.map((phases) => [...phases][0])).size === 3;
    motors[element.id] = {
      running: uniquePhases,
      faulted: hasPower && !uniquePhases,
    };
  }

  return motors;
}
