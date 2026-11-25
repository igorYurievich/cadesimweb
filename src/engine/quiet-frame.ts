/**
 * «Тихий» кадр: схема пришла в покой, и следующие кадры ничего не изменят, пока не изменятся
 * входы или сама схема. Тогда интерфейс может не пересчитывать кадр, а только сдвинуть время.
 *
 * Всё, что зависит от времени, хранит в памяти отсчёт (elapsed, частота, положение кабины…) и
 * отметку lastTime, от которой считает шаг. Если за кадр с ненулевым шагом память не изменилась
 * ничем, кроме lastTime, кадр — неподвижная точка: идущий таймер, рампа или движение кабины
 * изменили бы свой отсчёт.
 */

import type { EngineMemory, TimerState } from './types';
import { jsonEqual } from './json-equal';

const LAST_TIME = new Set(['lastTime']);

/**
 * Был ли кадр `previousTime → time` тихим: память до кадра (`before`) и после (`after`) совпадают
 * без учёта lastTime, а каждая отметка lastTime после кадра равна его времени (иначе пропуск
 * кадров сдвинул бы отметку не так, как настоящий расчёт).
 */
export function isQuietFrame(before: EngineMemory, after: EngineMemory, previousTime: number, time: number): boolean {
  if (!(time > previousTime)) return false;
  for (const timer of Object.values(after.timers)) {
    if (timer.lastTime !== undefined && timer.lastTime !== time) return false;
  }
  return jsonEqual(before, after, LAST_TIME);
}

/**
 * Память после тихого кадра в момент `time`: ровно то, что дал бы расчёт, — те же значения и
 * отметки lastTime, сдвинутые на новое время. Без этого первый настоящий кадр после покоя
 * получил бы огромный шаг (рампа частотника или таймер Ladder прыгнули бы сразу).
 */
export function advanceQuietMemory(memory: EngineMemory, time: number): EngineMemory {
  const timers: Record<number, TimerState> = {};
  for (const [id, timer] of Object.entries(memory.timers)) {
    timers[Number(id)] = timer.lastTime === undefined ? timer : { ...timer, lastTime: time };
  }
  return { ...memory, timers };
}
