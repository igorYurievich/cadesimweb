/**
 * Пропуск кадров в покое. Если входы и схема те же, а последний кадр был тихим (engine/quiet-frame.ts:
 * ни один таймер, рампа или кабина не движется), пересчёт дал бы тот же результат — его не делаем,
 * только сдвигаем время в памяти. Любое нажатие или правка схемы снова включает расчёт.
 */

import { advanceQuietMemory, isQuietFrame } from '@engine/quiet-frame';
import { jsonEqual } from '@engine/json-equal';
import type { EngineMemory } from '@engine/types';
import { breakersTripOnShortCircuit } from '../options-menu';
import type { AppContext } from '../context';
import type { QuietSnapshot, SimulationState } from './types';

/** Входы и схема на момент тихого кадра: с ними сравниваются следующие кадры. */
function takeSnapshot(ctx: AppContext, state: SimulationState): QuietSnapshot {
  return {
    schema: ctx.schema,
    elements: structuredClone(ctx.schema.elements),
    wires: structuredClone(ctx.schema.wires),
    inputs: structuredClone(state.inputs),
    breakersTrip: breakersTripOnShortCircuit(),
  };
}

/** После расчёта кадра: запомнить снимок, если кадр был тихим, иначе забыть старый. */
export function noteEvaluatedFrame(ctx: AppContext, state: SimulationState, before: EngineMemory): void {
  const previousTime = state.evaluatedAt;
  state.evaluatedAt = state.time;
  const quiet = state.mode === 'run' && previousTime !== undefined
    && isQuietFrame(before, state.memory, previousTime, state.time);
  if (!quiet) state.quiet = undefined;
  else state.quiet ??= takeSnapshot(ctx, state);
}

function unchangedSince(ctx: AppContext, state: SimulationState, snapshot: QuietSnapshot): boolean {
  return snapshot.schema === ctx.schema
    && snapshot.breakersTrip === breakersTripOnShortCircuit()
    && jsonEqual(snapshot.inputs, state.inputs)
    && jsonEqual(snapshot.elements, ctx.schema.elements)
    && jsonEqual(snapshot.wires, ctx.schema.wires);
}

/**
 * Пропустить расчёт этого кадра? Если да, память уже сдвинута на текущее время, как сделал бы
 * расчёт. Снимок сбрасывается при любом отличии входов или схемы.
 */
export function skipQuietFrame(ctx: AppContext, state: SimulationState): boolean {
  const snapshot = state.quiet;
  if (!snapshot) return false;
  if (!unchangedSince(ctx, state, snapshot)) {
    state.quiet = undefined;
    return false;
  }
  state.memory = advanceQuietMemory(state.memory, state.time);
  state.evaluatedAt = state.time;
  return true;
}

/** Нужна ли перерисовка без пересчёта: стрелки моторов и мигающие лампы идут по времени. */
export function hasTimeAnimation(ctx: AppContext, state: SimulationState): boolean {
  const result = state.result;
  if (!result) return false;
  if (Object.values(result.motors).some((motor) => motor.running)) return true;
  return ctx.schema.elements.some((element) => element.typeCode === 9009 && result.lamps[element.id]);
}
