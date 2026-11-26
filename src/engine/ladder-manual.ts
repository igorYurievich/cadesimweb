/**
 * Контакт Ladder с именем ручного аппарата схемы (кнопки, выключателя), а не операнда ПЛК: «-S2» в программе
 * следует за кнопкой -S2, как одноимённые контакты в CADe_SIMU (образцы tests/fixtures/s7-1214: фронт «-S2»
 * в Ejercicio_4 и Ejercicio_7). Операнд с таким именем включён, пока аппарат нажат или включён.
 */

import { LADDER_FALL, LADDER_RISE } from '../model/plc-blocks';
import { LADDER_NC, LADDER_NO } from '../model/plc-types';
import type { Schema, SchemaElement } from '../model/types';
import { normalizedName } from './name-index';
import type { UserInputs } from './types';

const LADDER_CONTACTS: ReadonlySet<number> = new Set([LADDER_NO, LADDER_NC, LADDER_RISE, LADDER_FALL]);
/** Лампы пилотов 8101 и 8125 в диапазоне ручных аппаратов, но нажать их нельзя. */
const NOT_MANUAL: ReadonlySet<number> = new Set([8101, 8125]);

/** Кнопки, выключатели и переключатели (8000…8199): только их нажатие задаёт такой операнд. */
const isManualTwin = (element: SchemaElement): boolean => element.typeCode >= 8000 && element.typeCode < 8200
  && !NOT_MANUAL.has(element.typeCode) && element.name.trim() !== '';

/** Имена контактов Ladder, совпадающие с именем аппарата схемы (для списка операндов relay-loop.ts). */
export function ladderManualNames(schema: Schema): string[] {
  const devices = new Set(schema.elements.filter(isManualTwin).map((element) => normalizedName(element.name)));
  if (devices.size === 0) return [];
  const names = schema.elements
    .filter((element) => LADDER_CONTACTS.has(element.typeCode) && devices.has(normalizedName(element.name)))
    .map((element) => element.name);
  return [...new Set(names)];
}

/** Выставляет такие операнды по нажатию / включению одноимённого аппарата. */
export function applyLadderManualInputs(
  schema: Schema, inputs: UserInputs, names: readonly string[], next: Record<string, boolean>,
): void {
  for (const name of names) {
    const key = normalizedName(name);
    next[name] = schema.elements.some((element) => isManualTwin(element) && normalizedName(element.name) === key
      && Boolean(inputs.pressed[element.id] || inputs.toggled[element.id]));
  }
}
