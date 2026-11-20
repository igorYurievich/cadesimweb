/**
 * Блоки контактов с выдержкой 2D: 7020 (ON delay) и 7021 (OFF delay). Блок следит за катушкой с тем же именем
 * (как контакты контактора) и хранит отсчёт в EngineMemory.timers по id блока, как таймеры 9004–9006.
 *  - ON delay: срабатывает через выдержку после включения катушки, отпускает сразу при отключении;
 *  - OFF delay: срабатывает сразу с катушкой, отпускает через выдержку после её отключения.
 */

import { DELAY_BLOCK_2D, DELAY_BLOCK_DEFAULT_TIME, isDelayBlock2d } from '../model/realistic-2d-types';
import type { Schema, SchemaElement } from '../model/types';
import type { TimerState } from './types';

/** Выдержка блока в секундах; пустое или неверное значение — выдержка по умолчанию. */
export function delayBlockSeconds(element: SchemaElement): number {
  const value = Number(element.params.time ?? DELAY_BLOCK_DEFAULT_TIME);
  return Number.isFinite(value) ? Math.max(0, value) : DELAY_BLOCK_DEFAULT_TIME;
}

/** Сработал ли блок (НО замкнут, НЗ разомкнут) по сохранённому отсчёту. */
export function delayBlockActive(element: SchemaElement, timers: Readonly<Record<number, TimerState>>): boolean {
  const phase = timers[element.id]?.phase;
  if (element.typeCode === DELAY_BLOCK_2D.OFF) return phase === 'done' || phase === 'releasing';
  return phase === 'done';
}

const sinceLast = (prior: TimerState, now: number): number =>
  Math.max(0, now - (Number.isFinite(prior.lastTime) ? prior.lastTime as number : now));

function nextOnDelay(prior: TimerState | undefined, coil: boolean, duration: number, now: number): TimerState {
  if (!coil) return { phase: 'idle', elapsed: 0, lastTime: now, powered: false };
  if (prior?.phase === 'done') {
    return { phase: 'done', elapsed: Math.max(duration, prior.elapsed), lastTime: now, powered: true };
  }
  const elapsed = prior?.phase === 'counting' ? Math.max(0, prior.elapsed) + sinceLast(prior, now) : 0;
  return { phase: elapsed >= duration ? 'done' : 'counting', elapsed, lastTime: now, powered: true };
}

function nextOffDelay(prior: TimerState | undefined, coil: boolean, duration: number, now: number): TimerState {
  if (coil) return { phase: 'done', elapsed: 0, lastTime: now, powered: true };
  const idle: TimerState = { phase: 'idle', elapsed: 0, lastTime: now, powered: false };
  if (prior?.phase !== 'done' && prior?.phase !== 'releasing') return idle;
  const releaseElapsed = prior.phase === 'releasing'
    ? Math.max(0, prior.releaseElapsed ?? 0) + sinceLast(prior, now)
    : 0;
  if (releaseElapsed >= duration) return idle;
  return { phase: 'releasing', elapsed: 0, releaseElapsed, lastTime: now, powered: false };
}

/** Обновляет отсчёт всех блоков по устойчивому состоянию катушек. Время берётся только из симуляции. */
export function advanceDelayBlocks(
  schema: Schema,
  coils: Readonly<Record<string, boolean>>,
  time: number,
  previous: Readonly<Record<number, TimerState>>,
): Record<number, TimerState> {
  const result: Record<number, TimerState> = { ...previous };
  const now = Number.isFinite(time) ? time : 0;
  for (const element of schema.elements) {
    if (!isDelayBlock2d(element.typeCode)) continue;
    const coil = element.name !== '' && (coils[element.name] ?? false);
    const step = element.typeCode === DELAY_BLOCK_2D.OFF ? nextOffDelay : nextOnDelay;
    result[element.id] = step(previous[element.id], coil, delayBlockSeconds(element), now);
  }
  return result;
}
