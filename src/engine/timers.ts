/** Расчёт выдержки таймеров по симулируемому времени. */

import type { Schema } from '../model/types';
import type { NetState, TerminalKey, TimerState } from './types';
import { isEnergized } from './loads';
import { terminalKey } from './types';

/** Короткий импульс таймированных контактов, чтобы схема успела переключить реле. */
export const TIMER_CONTACT_RELEASE_SECONDS = 0.2;

/** Обновляет таймеры 9004 и 9005. Время берётся только из симуляции. */
export function advanceTimers(
  schema: Schema,
  nets: readonly NetState[],
  terminalNet: Record<TerminalKey, number>,
  time: number,
  previous: Readonly<Record<number, TimerState>> = {},
): Record<number, TimerState> {
  const byNet = new Map(nets.map((net) => [net.id, net] as const));
  const result: Record<number, TimerState> = { ...previous };
  const now = Number.isFinite(time) ? time : 0;

  for (const element of schema.elements) {
    if (element.typeCode !== 9004 && element.typeCode !== 9005) continue;
    const prior = previous[element.id];
    const aId = terminalNet[terminalKey(element.id, 0)];
    const bId = terminalNet[terminalKey(element.id, 1)];
    const a = aId === undefined ? undefined : byNet.get(aId);
    const b = bId === undefined ? undefined : byNet.get(bId);
    const powered = Boolean(a && b && isEnergized(a, b).energized);

    if (element.typeCode === 9005) {
      const configured = Number(element.params.time ?? 0);
      const duration = Number.isFinite(configured) ? Math.max(0, configured) : 0;
      // Таймер отключения в этой схеме запускается импульсом: после начала
      // выдержки снятие питания не отменяет отсчёт. Новый импульс после
      // отпускания повторно запускает таймер.
      if (powered && !prior?.powered) {
        result[element.id] = duration === 0
          ? { phase: 'done', elapsed: 0, lastTime: now, powered: true }
          : { phase: 'counting', elapsed: 0, lastTime: now, powered: true };
        continue;
      }
      if (prior?.phase === 'counting') {
        const lastTime = Number.isFinite(prior.lastTime) ? prior.lastTime as number : now;
        const elapsed = Math.max(0, prior.elapsed) + Math.max(0, now - lastTime);
        result[element.id] = {
          phase: elapsed >= duration ? 'done' : 'counting',
          elapsed,
          lastTime: now,
          powered,
        };
      } else if (prior?.phase === 'done') {
        result[element.id] = { phase: 'done', elapsed: Math.max(duration, prior.elapsed), lastTime: now, powered };
      } else {
        result[element.id] = { phase: 'idle', elapsed: 0, lastTime: now, powered };
      }
      continue;
    }

    if (!powered) {
      if (prior?.phase === 'done') {
        result[element.id] = { phase: 'releasing', elapsed: prior.elapsed, releaseElapsed: 0, lastTime: now };
      } else if (prior?.phase === 'releasing') {
        const lastTime = Number.isFinite(prior.lastTime) ? prior.lastTime as number : now;
        const releaseElapsed = Math.max(0, prior.releaseElapsed ?? 0) + Math.max(0, now - lastTime);
        result[element.id] = releaseElapsed >= TIMER_CONTACT_RELEASE_SECONDS
          ? { phase: 'idle', elapsed: 0, lastTime: now }
          : { phase: 'releasing', elapsed: prior.elapsed, releaseElapsed, lastTime: now };
      } else {
        result[element.id] = { phase: 'idle', elapsed: 0, lastTime: now };
      }
      continue;
    }

    const configured = Number(element.params.time ?? 0);
    const duration = Number.isFinite(configured) ? Math.max(0, configured) : 0;
    if (duration === 0) {
      result[element.id] = { phase: 'done', elapsed: 0, lastTime: now };
      continue;
    }
    if (prior?.phase === 'done') {
      result[element.id] = { phase: 'done', elapsed: Math.max(duration, prior.elapsed), lastTime: now };
      continue;
    }
    if (prior?.phase === 'releasing') {
      result[element.id] = { phase: 'counting', elapsed: 0, lastTime: now };
      continue;
    }
    if (prior?.phase === 'counting') {
      const lastTime = Number.isFinite(prior.lastTime) ? prior.lastTime as number : now;
      const delta = Math.max(0, now - lastTime);
      const elapsed = Math.max(0, prior.elapsed) + delta;
      result[element.id] = { phase: elapsed >= duration ? 'done' : 'counting', elapsed, lastTime: now };
      continue;
    }
    result[element.id] = { phase: 'counting', elapsed: 0, lastTime: now };
  }
  return result;
}
