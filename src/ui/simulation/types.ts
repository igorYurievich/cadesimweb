import type { EngineMemory, EngineState, TerminalKey, UserInputs } from '@engine/types';
import type { AppContext } from '../context';
import type { InterfaceText } from '../i18n';

export interface SimulationState {
  mode: 'edit' | 'run';
  /** Пауза: время симуляции стоит, схема остаётся в своём состоянии (loop.ts). */
  paused: boolean;
  time: number;
  speed: number;
  memory: EngineMemory;
  inputs: UserInputs;
  result: EngineState | undefined;
  lastFrameTime: number | undefined;
  animationFrame: number | undefined;
  contextElementId: number | undefined;
  heldInputs: Set<number>;
  /** Угол стрелки ротора по id двигателя и время симуляции, к которому он посчитан (вращение без скачков при смене скорости). */
  motorAngles: Map<number, { angle: number; time: number }>;
  wireGroupOf: Map<number, number>;
  wireTerminalKeys: Map<number, Set<TerminalKey>>;
  /** Автоматы, выбитые коротким замыканием (опция «Opciones», engine/cc-trip.ts): id → пары КЗ. */
  ccTrips: Map<number, string[]>;
}

export interface SimulationDependencies {
  wireLayer: SVGGElement;
  elementLayer: SVGGElement;
  simulationMessage: HTMLElement;
  simulationMessageText: HTMLElement;
  runButton: HTMLButtonElement;
  stopButton: HTMLButtonElement;
  simStateValue: HTMLElement;
  simulationContextMenu: HTMLElement;
  overloadAction: HTMLButtonElement;
  status: HTMLElement;
  uiText(): InterfaceText;
  renderSchema(): void;
  uniformWireColors(): boolean;
  clearSelection(): void;
}

export interface SimulationRuntime {
  ctx: AppContext;
  deps: SimulationDependencies;
  state: SimulationState;
}

export interface SimulationWireContext {
  nets: Map<number, EngineState['nets'][number]>;
  motorCurrentGroups: Set<number>;
  autotransformerCurrentGroups: Set<number>;
}

