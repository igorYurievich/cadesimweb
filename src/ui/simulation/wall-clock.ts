/**
 * Часы компьютера для реле времени 9014 (engine/coil-relays.ts): секунды от понедельника 00:00 по местному
 * времени. Задаются, только если на листе есть такое реле, чтобы остальные схемы оставались «тихими»
 * (quiet-skip.ts сравнивает входы кадра).
 */

import { TIME_SWITCH } from '@model/coil-relays';
import type { Schema } from '@model/types';
import type { UserInputs } from '@engine/types';

export function applyWallClock(schema: Schema, inputs: UserInputs, date: Date = new Date()): void {
  if (!schema.elements.some((element) => element.typeCode === TIME_SWITCH)) {
    delete inputs.clock;
    return;
  }
  const weekday = (date.getDay() + 6) % 7;
  inputs.clock = weekday * 86400 + date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
}
