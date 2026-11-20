/** Ручное состояние тепловой защиты и привязка вспомогательных контактов по имени. */

import type { Schema } from '../model/types';
import type { UserInputs } from './types';

/** Тепловые реле с ручным срабатыванием: 6007 и 6016 (2D). */
export const THERMAL_RELAY_TYPES: ReadonlySet<number> = new Set([6007, 6016]);

export interface ThermalState {
  /** Состояние защиты по id; для каждого 6007 отсутствие входа означает reset. */
  tripped: Record<number, boolean>;
  /** Имена сработавших моторных защит 6007, управляющие контактами 8018. */
  trippedNames: ReadonlySet<string>;
}

export function resolveThermalState(schema: Schema, inputs: UserInputs): ThermalState {
  const tripped: Record<number, boolean> = { ...inputs.tripped };
  const trippedNames = new Set<string>();
  for (const element of schema.elements) {
    if (!THERMAL_RELAY_TYPES.has(element.typeCode)) continue;
    // Ручное срабатывание FG меняет состояние связанных вспомогательных
    // контактов в цепи управления; силовые полюса остаются проводящими.
    const isTripped = (inputs.tripped[element.id] ?? false) || (inputs.toggled[element.id] === false);
    tripped[element.id] = isTripped;
    const name = element.name.trim().toLocaleUpperCase();
    if (isTripped && name !== '') trippedNames.add(name);
  }
  return { tripped, trippedNames };
}
