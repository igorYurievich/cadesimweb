import { terminalKey } from '@engine/types';
import type { EngineState } from '@engine/types';
import { getBehavior } from '@engine/behaviors';
import type { AppContext } from '../context';
import { PHASE_LABELS } from '../constants';
import type { SimulationState } from './types';

interface NetUnion {
  root(id: number): number;
  join(a: number, b: number): void;
}

function createNetUnion(result: EngineState): NetUnion {
  const parent = new Map(result.nets.map((net) => [net.id, net.id] as const));
  const root = (id: number): number => {
    let current = id;
    while (parent.get(current) !== undefined && parent.get(current) !== current) {
      current = parent.get(current)!;
    }
    return current;
  };
  const join = (a: number, b: number): void => {
    const rootA = root(a);
    const rootB = root(b);
    if (rootA !== rootB) parent.set(rootA, rootB);
  };
  return { root, join };
}

function joinClosedSwitches(ctx: AppContext, result: EngineState, union: NetUnion): void {
  for (const element of ctx.schema.elements) {
    const closedContactor = element.typeCode === 2001 && result.contacts[element.id];
    const closedRelay = element.typeCode === 6007 && result.contacts[element.id] && !result.tripped[element.id];
    if (!closedContactor && !closedRelay) continue;
    for (const link of getBehavior(element.typeCode).links) {
      if (link.kind !== 'switch') continue;
      const [a, b] = link.terminals;
      const netA = result.terminalNet[terminalKey(element.id, a!)];
      const netB = result.terminalNet[terminalKey(element.id, b!)];
      if (netA !== undefined && netB !== undefined) union.join(netA, netB);
    }
  }
}

function collectMotorCurrentGroups(
  ctx: AppContext,
  state: SimulationState,
  result: EngineState,
  union: NetUnion,
  nets: Map<number, EngineState['nets'][number]>,
): Set<number> {
  const groups = new Set<number>();
  for (const motor of ctx.schema.elements) {
    if (motor.typeCode !== 1001 || !result.motors[motor.id]?.running) continue;
    const bottomNets = new Set([4, 5, 6]
      .map((index) => result.terminalNet[terminalKey(motor.id, index)])
      .filter((id): id is number => id !== undefined));
    for (const [group, keys] of state.wireTerminalKeys) {
      if ([...keys].some((key) => {
        const netId = result.terminalNet[key];
        return netId !== undefined && bottomNets.has(netId) && !(nets.get(netId)?.potentials.length);
      })) groups.add(group);
    }
    collectStarCurrentGroups(motor.id, state, result, union, groups);
  }
  return groups;
}

function collectStarCurrentGroups(
  motorId: number,
  state: SimulationState,
  result: EngineState,
  union: NetUnion,
  groups: Set<number>,
): void {
  const bottomNets = [5, 6, 4].map((index) => result.terminalNet[terminalKey(motorId, index)]);
  const starRoot = bottomNets[0];
  const sameRoot = starRoot !== undefined
    && bottomNets.every((id) => id !== undefined && union.root(id) === union.root(starRoot));
  const hasPhase = starRoot !== undefined && result.nets.some((net) => union.root(net.id) === union.root(starRoot)
    && net.potentials.some((potential) => PHASE_LABELS.includes(potential)));
  if (!sameRoot || hasPhase || starRoot === undefined) return;
  const currentNets = new Set(result.nets
    .filter((net) => union.root(net.id) === union.root(starRoot)).map((net) => net.id));
  for (const [group, keys] of state.wireTerminalKeys) {
    if ([...keys].some((key) => currentNets.has(result.terminalNet[key] ?? -1))) groups.add(group);
  }
}

function collectAutotransformerCurrentGroups(
  ctx: AppContext,
  result: EngineState,
  nets: Map<number, EngineState['nets'][number]>,
): Set<number> {
  const groups = new Set<number>();
  const motorRunning = ctx.schema.elements.some((element) =>
    (element.typeCode === 1000 || element.typeCode === 1001) && Boolean(result.motors[element.id]?.running));
  if (!motorRunning) return groups;
  for (const transformer of ctx.schema.elements) {
    if (transformer.typeCode !== 1052) continue;
    const inputPhases = [0, 1, 2].map((index) => {
      const netId = result.terminalNet[terminalKey(transformer.id, index)];
      return nets.get(netId ?? -1)?.potentials.filter((potential) => PHASE_LABELS.includes(potential)) ?? [];
    });
    const complete = inputPhases.every((phases) => phases.length === 1)
      && new Set(inputPhases.map((phases) => phases[0])).size === 3;
    if (!complete) continue;
    const starNets = new Set([3, 4, 5]
      .map((index) => result.terminalNet[terminalKey(transformer.id, index)])
      .filter((id): id is number => id !== undefined));
    for (const netId of starNets) groups.add(netId);
  }
  return groups;
}

export function buildWireCurrentGroups(
  ctx: AppContext,
  state: SimulationState,
  result: EngineState | undefined,
  nets: Map<number, EngineState['nets'][number]>,
): { motor: Set<number>; autotransformer: Set<number> } {
  if (!result) return { motor: new Set(), autotransformer: new Set() };
  const union = createNetUnion(result);
  joinClosedSwitches(ctx, result, union);
  const motor = collectMotorCurrentGroups(ctx, state, result, union, nets);
  const transformerNets = collectAutotransformerCurrentGroups(ctx, result, nets);
  const autotransformer = new Set<number>();
  for (const [group, keys] of state.wireTerminalKeys) {
    if ([...keys].some((key) => transformerNets.has(result.terminalNet[key] ?? -1))) {
      motor.add(group);
      autotransformer.add(group);
    }
  }
  return { motor, autotransformer };
}
