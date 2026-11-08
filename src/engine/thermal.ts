/** Ручное состояние тепловой защиты и привязка вспомогательных контактов по имени. */

import type { Schema } from '../model/types';
import type { UserInputs } from './types';

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
    if (element.typeCode !== 6007) continue;
    // Ручное срабатывание FG меняет состояние связанных вспомогательных
    // контактов в цепи управления; силовые полюса остаются проводящими.
    const isTripped = (inputs.tripped[element.id] ?? false) || (inputs.toggled[element.id] === false);
    tripped[element.id] = isTripped;
    if (isTripped && element.name !== '') trippedNames.add(element.name);
  }
  return { tripped, trippedNames };
}
