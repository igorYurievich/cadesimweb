import type { Schema } from './types';

export const SCHEMA_JSON_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireString(value: unknown, label: string): void {
  if (typeof value !== 'string') throw new Error(`${label}: ожидалась строка.`);
}

function requireFinite(value: unknown, label: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label}: ожидалось число.`);
}

function validatePoint(value: unknown, label: string): void {
  if (!isRecord(value)) throw new Error(`${label}: некорректная точка.`);
  requireFinite(value.x, `${label}.x`);
  requireFinite(value.y, `${label}.y`);
}

/** Parse and validate a CADe SIMU Web JSON document before it enters the editor. */
export function parseSchemaJson(text: string): Schema {
  let value: unknown;
  try { value = JSON.parse(text); }
  catch (error) { throw new Error(`Некорректный JSON: ${error instanceof Error ? error.message : String(error)}`); }
  if (!isRecord(value) || value.formatVersion !== SCHEMA_JSON_VERSION) {
    throw new Error(`Неподдерживаемый формат схемы (ожидается версия ${SCHEMA_JSON_VERSION}).`);
  }
  if (!Array.isArray(value.elements) || !Array.isArray(value.wires) || !isRecord(value.sheet)) {
    throw new Error('В файле должны быть поля elements, wires и sheet.');
  }
  for (const [index, item] of value.elements.entries()) {
    const label = `Элемент ${index + 1}`;
    if (!isRecord(item)) throw new Error(`${label}: некорректная запись.`);
    requireFinite(item.id, `${label}.id`); requireFinite(item.typeCode, `${label}.typeCode`);
    requireString(item.name, `${label}.name`); requireString(item.func, `${label}.func`);
    validatePoint(item.position, `${label}.position`); validatePoint(item.labelOffset, `${label}.labelOffset`);
    if (!isRecord(item.size)) throw new Error(`${label}.size: некорректный размер.`);
    requireFinite(item.size.w, `${label}.size.w`); requireFinite(item.size.h, `${label}.size.h`);
    if (!Array.isArray(item.terminals) || !isRecord(item.params)) throw new Error(`${label}: некорректные terminals или params.`);
    for (const [terminalIndex, terminal] of item.terminals.entries()) {
      if (!isRecord(terminal)) throw new Error(`${label}, клемма ${terminalIndex + 1}: некорректная запись.`);
      requireString(terminal.label, `${label}.terminals[${terminalIndex}].label`);
      validatePoint(terminal.offset, `${label}.terminals[${terminalIndex}].offset`);
    }
  }
  for (const [index, item] of value.wires.entries()) {
    const label = `Провод ${index + 1}`;
    if (!isRecord(item)) throw new Error(`${label}: некорректная запись.`);
    requireFinite(item.id, `${label}.id`); requireFinite(item.typeCode, `${label}.typeCode`);
    requireString(item.kind, `${label}.kind`);
    validatePoint(item.from, `${label}.from`); validatePoint(item.to, `${label}.to`);
    requireFinite(item.thickness, `${label}.thickness`);
    if (typeof item.dot !== 'boolean') throw new Error(`${label}.dot: ожидалось логическое значение.`);
  }
  for (const key of ['title', 'author', 'entity', 'date', 'fileName', 'number'] as const) {
    requireString(value.sheet[key], `sheet.${key}`);
  }
  requireFinite(value.sheet.width, 'sheet.width'); requireFinite(value.sheet.height, 'sheet.height');
  return value as unknown as Schema;
}

export function serializeSchemaJson(schema: Schema): string {
  return `${JSON.stringify(schema, null, 2)}\n`;
}
