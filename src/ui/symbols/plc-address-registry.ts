import type { SchemaElement } from "@model/types";
import { plcAddresses, standaloneAddress, syncModuleLabels, type ModuleAddress } from "@model/plc-modules";
import type { Schema } from "@model/types";

// Адреса модулей LOGO на текущем листе: символ DM8 подписывает входы и выходы по соседству с базовым модулем.
// Отрисовщик листа обновляет их перед построением символов; превью палитры берёт адрес одиночного модуля.

let current = new Map<number, ModuleAddress>();

export function updatePlcAddresses(schema: Pick<Schema, "elements">): void {
  current = plcAddresses(schema);
  // Метки клемм в свойствах — те же адреса (I9…, Q5.1…), если DM8 стоит рядом с базовым модулем.
  syncModuleLabels(schema);
}

export function addressOf(element: SchemaElement): ModuleAddress | undefined {
  return current.get(element.id) ?? standaloneAddress(element);
}

const operandNumber = (name: string): number => Number(name.slice(1));

/**
 * Все входы и выходы, которые видит базовый LOGO: свои и всех DM8 листа (I1…I12, Q1…Q8 с одним DM8).
 * Для превью в палитре и для модуля не с листа — только свои.
 */
export function logoScreenIo(element: SchemaElement): { inputs: string[]; outputs: string[] } {
  const own = addressOf(element);
  if (!current.has(element.id)) return { inputs: own?.inputs ?? [], outputs: own?.outputs ?? [] };
  const all = [...current.values()];
  const sorted = (names: string[]): string[] => [...new Set(names)].sort((a, b) => operandNumber(a) - operandNumber(b));
  return { inputs: sorted(all.flatMap((a) => a.inputs)), outputs: sorted(all.flatMap((a) => a.outputs)) };
}
