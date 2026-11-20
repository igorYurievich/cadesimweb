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
