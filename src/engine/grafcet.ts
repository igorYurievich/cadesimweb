// ── GRAFCET в движке (model/grafcet.ts, model/grafcet-expr.ts) ──────────────────────────────────────────
// Состояние живёт в memory.timers по id элемента: у этапа q — активен, elapsed — сколько секунд активен;
// у перехода q — условие истинно; у действия q — его этап активен, elapsed — время этапа.
// Эволюция (advanceGrafcet) — после устойчивого состояния схемы, раз за кадр: все переходы, которые можно
// перейти, срабатывают одновременно, и так до устойчивости (не больше 16 кругов). Действия активных этапов
// включают одноимённые операнды в карте катушек (applyGrafcetOutputs) — как катушки: их видят контакты
// с тем же именем, выходы LOGO Q1…, другие условия.
// Операнд условия: X<n> — этап n активен; таймер действия «T1=5s»; катушка / вход LOGO / датчик с этим именем;
// кнопка или переключатель с этим именем нажат / включён.

import type { Schema, SchemaElement } from '../model/types';
import {
  GRAFCET, GRAFCET_TYPES, STEP_INDEX, isGrafcetBar, isGrafcetStep, isGrafcetType,
} from '../model/grafcet';
import type { GrafcetAction, GrafcetExpr } from '../model/grafcet-expr';
import { evaluateExpr, parseActions, stepOperand, tryParseReceptivity } from '../model/grafcet-expr';
import type { BehaviorLink, TypeBehavior } from './behaviors';
import type { TerminalKey, TimerState, UserInputs } from './types';
import { terminalKey } from './types';

/** Элементы GRAFCET не проводят ток: связи только логические. */
export const GRAFCET_BEHAVIORS: readonly TypeBehavior[] = GRAFCET_TYPES.map((typeCode) => ({
  typeCode, links: [] satisfies BehaviorLink[],
}));

interface StepNode { element: SchemaElement; initial: boolean; inGroup: number; outGroup: number }
interface TransitionNode { element: SchemaElement; expr: GrafcetExpr | undefined; up: StepNode[]; down: StepNode[] }
interface ActionNode { element: SchemaElement; actions: GrafcetAction[]; steps: StepNode[] }
export interface GrafcetTopology { steps: StepNode[]; transitions: TransitionNode[]; actions: ActionNode[] }

export const hasGrafcet = (schema: Schema): boolean =>
  schema.elements.some((element) => isGrafcetStep(element.typeCode));

/** Узлы связей: сети выводов, объединённые чертами разветвлений, линиями связи и блоками действий. */
export function grafcetTopology(schema: Schema, terminalNet: Readonly<Record<TerminalKey, number>>): GrafcetTopology {
  const parent = new Map<number, number>();
  let fresh = -1;
  const netOf = (element: SchemaElement, index: number): number => {
    const net = terminalNet[terminalKey(element.id, index)];
    if (net !== undefined) return net;
    fresh -= 1;
    return fresh;
  };
  const find = (id: number): number => {
    let root = id;
    while ((parent.get(root) ?? root) !== root) root = parent.get(root)!;
    parent.set(id, root);
    return root;
  };
  const union = (a: number, b: number): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };
  const ports = new Map<string, number>();
  const port = (element: SchemaElement, index: number): number => {
    const key = `${element.id}:${index}`;
    let net = ports.get(key);
    if (net === undefined) { net = netOf(element, index); ports.set(key, net); }
    return net;
  };
  const grafcet = schema.elements.filter((element) => isGrafcetType(element.typeCode));
  for (const element of grafcet) {
    const joined = isGrafcetBar(element.typeCode) || element.typeCode === GRAFCET.link
      || element.typeCode === GRAFCET.action;
    if (!joined) continue;
    const first = port(element, 0);
    for (let index = 1; index < element.terminals.length; index += 1) union(first, port(element, index));
  }
  const group = (element: SchemaElement, index: number): number => find(port(element, index));
  const steps: StepNode[] = grafcet.filter((element) => isGrafcetStep(element.typeCode)).map((element) => ({
    element, initial: element.typeCode === GRAFCET.initialStep,
    inGroup: group(element, STEP_INDEX.in), outGroup: group(element, STEP_INDEX.out),
  }));
  const transitions: TransitionNode[] = grafcet.filter((element) => element.typeCode === GRAFCET.transition)
    .map((element) => {
      const up = group(element, 0);
      const down = group(element, 1);
      return {
        element, expr: tryParseReceptivity(element.name),
        up: steps.filter((step) => step.outGroup === up), down: steps.filter((step) => step.inGroup === down),
      };
    });
  const actions: ActionNode[] = grafcet.filter((element) => element.typeCode === GRAFCET.action).map((element) => {
    const at = group(element, 0);
    const attached = steps.filter((step) =>
      group(step.element, STEP_INDEX.left) === at || group(step.element, STEP_INDEX.right) === at);
    return { element, actions: parseActions(element.name), steps: attached };
  });
  return { steps, transitions, actions };
}

/** Имена, которые задаёт GRAFCET: операнды действий (в т. ч. таймеры). */
export function grafcetRelayNames(schema: Schema): string[] {
  const names: string[] = [];
  for (const element of schema.elements) {
    if (element.typeCode !== GRAFCET.action) continue;
    for (const action of parseActions(element.name)) if (!names.includes(action.name)) names.push(action.name);
  }
  return names;
}

const stepActive = (timers: Readonly<Record<number, TimerState>>, step: SchemaElement): boolean =>
  timers[step.id]?.q ?? false;

/** Состояние операнда для условий: катушки, этапы, таймеры действий, нажатые кнопки. */
export function grafcetOperand(
  name: string, schema: Schema, topology: GrafcetTopology, coils: Readonly<Record<string, boolean>>,
  inputs: UserInputs, timers: Readonly<Record<number, TimerState>>,
): boolean {
  const stepNumber = stepOperand(name);
  if (stepNumber !== undefined) {
    return topology.steps.some((step) => step.element.name.trim() === stepNumber && stepActive(timers, step.element));
  }
  for (const node of topology.actions) {
    const timer = node.actions.find((action) => action.name === name && action.seconds !== undefined);
    if (timer && node.steps.some((step) => stepActive(timers, step.element)
      && (timers[step.element.id]?.elapsed ?? 0) >= (timer.seconds ?? 0) - 1e-9)) return true;
  }
  if (coils[name]) return true;
  return schema.elements.some((element) => element.name === name && !isGrafcetType(element.typeCode)
    && (inputs.pressed[element.id] === true || inputs.toggled[element.id] === true));
}

const MAX_ROUNDS = 16;

/**
 * Эволюция GRAFCET за кадр. Первый кадр (у этапов ещё нет состояния) — активны начальные этапы.
 * Возвращает новую карту таймеров со состояниями этапов, переходов и действий.
 */
export function advanceGrafcet(
  schema: Schema, terminalNet: Readonly<Record<TerminalKey, number>>, coils: Readonly<Record<string, boolean>>,
  inputs: UserInputs, time: number, timers: Readonly<Record<number, TimerState>>,
): Record<number, TimerState> {
  const next: Record<number, TimerState> = { ...timers };
  if (!hasGrafcet(schema)) return next;
  const topology = grafcetTopology(schema, terminalNet);
  const fresh = topology.steps.every((step) => timers[step.element.id] === undefined);
  const active = new Map(topology.steps.map((step) =>
    [step.element.id, fresh ? step.initial : stepActive(timers, step.element)] as const));
  // Начало активности этапа: время прошлого кадра минус сколько он был активен к тому моменту.
  const since = new Map(topology.steps.map((step) => {
    const saved = timers[step.element.id];
    return [step.element.id, fresh || !saved ? time : (saved.lastTime ?? time) - saved.elapsed] as const;
  }));
  const view = (): Record<number, TimerState> => {
    const out: Record<number, TimerState> = { ...next };
    for (const step of topology.steps) {
      const id = step.element.id;
      out[id] = { phase: 'idle', elapsed: time - (since.get(id) ?? time), q: active.get(id) ?? false };
    }
    return out;
  };
  const receptive = (node: TransitionNode, state: Record<number, TimerState>): boolean => {
    const stepTime = Math.min(...node.up.map((step) => time - (since.get(step.element.id) ?? time)));
    return evaluateExpr(node.expr, {
      operand: (name) => grafcetOperand(name, schema, topology, coils, inputs, state),
      stepTime: Number.isFinite(stepTime) ? stepTime : 0,
    });
  };
  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const state = view();
    const fire = topology.transitions.filter((node) => node.up.length > 0
      && node.up.every((step) => active.get(step.element.id)) && receptive(node, state));
    if (fire.length === 0) break;
    for (const node of fire) for (const step of node.up) active.set(step.element.id, false);
    // Активация важнее деактивации: этап, который гасится и включается одновременно, остаётся активным.
    for (const node of fire) {
      for (const step of node.down) {
        active.set(step.element.id, true);
        since.set(step.element.id, time);
      }
    }
  }
  const state = view();
  for (const step of topology.steps) {
    const on = active.get(step.element.id) ?? false;
    const elapsed = on ? time - (since.get(step.element.id) ?? time) : 0;
    next[step.element.id] = { phase: on ? 'counting' : 'idle', elapsed, lastTime: time, q: on };
  }
  for (const node of topology.transitions) {
    next[node.element.id] = { phase: 'idle', elapsed: 0, q: receptive(node, { ...state, ...next }) };
  }
  for (const node of topology.actions) {
    const owner = node.steps.find((step) => next[step.element.id]?.q);
    const elapsed = owner ? next[owner.element.id]?.elapsed ?? 0 : 0;
    next[node.element.id] = { phase: 'idle', elapsed, q: owner !== undefined };
  }
  return next;
}

/** Действия активных этапов включают свои операнды; таймер «T1=5s» — по истечении времени этапа. */
export function applyGrafcetOutputs(
  schema: Schema, timers: Readonly<Record<number, TimerState>>, nextCoils: Record<string, boolean>,
): void {
  for (const element of schema.elements) {
    if (element.typeCode !== GRAFCET.action) continue;
    const state = timers[element.id];
    if (!state?.q) continue;
    for (const action of parseActions(element.name)) {
      if (action.seconds === undefined || state.elapsed >= action.seconds - 1e-9) nextCoils[action.name] = true;
    }
  }
}
