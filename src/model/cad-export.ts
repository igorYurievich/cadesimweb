import { importCad } from './cad-import';
import { CAD_NUM_FIELDS, CAD_TEXT_FIELDS, serializeCad } from './cad-format';
import type { CadFooter, CadRecord } from './cad-format';
import type { Schema, SchemaElement, WireSegment } from './types';

function emptyRecord(id: number, type: number): CadRecord {
  return { id, type, texts: Array(CAD_TEXT_FIELDS).fill(''), nums: Array(CAD_NUM_FIELDS).fill(0) };
}

function elementRecord(element: SchemaElement): CadRecord {
  const record = element.raw
    ? { id: element.id, type: element.typeCode, texts: [...element.raw.texts], nums: [...element.raw.nums] }
    : emptyRecord(element.id, element.typeCode);
  record.texts.length = CAD_TEXT_FIELDS;
  record.nums.length = CAD_NUM_FIELDS;
  record.texts[0] = element.name;
  record.texts[1] = element.func;
  record.nums[8] = element.position.x;
  record.nums[9] = element.position.y;
  record.nums[12] = element.labelOffset.x;
  record.nums[13] = element.labelOffset.y;
  record.nums[14] = element.size.w;
  record.nums[15] = element.size.h;
  record.nums[17] = element.rotation;

  let slots = record.nums.slice(0, 8).flatMap((flag, index) => flag !== 0 ? [index] : []);
  if (!element.raw || slots.length !== element.terminals.length) {
    record.nums.fill(0, 0, 8);
    slots = element.terminals.map((_, index) => index);
    for (const slot of slots) record.nums[slot] = 1;
  }
  element.terminals.forEach((terminal, index) => { record.texts[2 + (slots[index] ?? index)] = terminal.label; });

  const parameterStart = 2 + element.terminals.length;
  if (element.typeCode === 9008 && element.params.color !== undefined) {
    record.texts[parameterStart] = String(element.params.color);
  }
  if (element.typeCode === 9004) {
    if (element.params.scale !== undefined) record.texts[parameterStart] = String(element.params.scale);
    if (element.params.time !== undefined) record.texts[parameterStart + 1] = String(element.params.time);
  }
  return record;
}

function wireRecord(wire: WireSegment): CadRecord {
  const record = wire.raw
    ? { id: wire.id, type: wire.typeCode, texts: [...wire.raw.texts], nums: [...wire.raw.nums] }
    : emptyRecord(wire.id, wire.typeCode);
  record.texts.length = CAD_TEXT_FIELDS;
  record.nums.length = CAD_NUM_FIELDS;
  record.nums[8] = wire.from.x;
  record.nums[9] = wire.from.y;
  record.nums[10] = wire.to.x;
  record.nums[11] = wire.to.y;
  record.nums[14] = wire.kind === 'junction' && wire.dot ? 1 : 0;
  record.nums[18] = wire.thickness;
  return record;
}

function footerFor(schema: Schema): CadFooter {
  const footer = schema.sheet.cadFooter
    ? { settings: [...schema.sheet.cadFooter.settings], fields: [...schema.sheet.cadFooter.fields] }
    : { settings: [1, 1, 1, 2, 3, 0, 1, 0, 0, schema.sheet.width, schema.sheet.height], fields: Array(10).fill('') as string[] };
  while (footer.fields.length < 10) footer.fields.push('');
  if (footer.settings.length < 2) footer.settings.push(schema.sheet.width, schema.sheet.height);
  footer.settings[footer.settings.length - 2] = schema.sheet.width;
  footer.settings[footer.settings.length - 1] = schema.sheet.height;
  const authorParts = schema.sheet.author.trim().split(/\s+/).filter(Boolean);
  footer.fields[0] = schema.sheet.drawnDate ?? footer.fields[0] ?? '';
  footer.fields[1] = authorParts[0] ?? '';
  footer.fields[2] = schema.sheet.checkedDate ?? footer.fields[2] ?? '';
  footer.fields[3] = authorParts.slice(1).join(' ');
  footer.fields[4] = schema.sheet.entity;
  footer.fields[5] = schema.sheet.title;
  footer.fields[6] = schema.sheet.date;
  footer.fields[7] = schema.sheet.number;
  footer.fields[8] = schema.sheet.total ?? '';
  footer.fields[9] = schema.sheet.fileName;
  return footer;
}

/** CADe SIMU's printable frame starts inside the sheet area, unlike the web canvas. */
function legacyFramePlacement(schema: Schema): { offsetY: number; height: number } {
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  const include = (y: number): void => { minY = Math.min(minY, y); maxY = Math.max(maxY, y); };
  for (const element of schema.elements) {
    if (element.typeCode === 20000) continue;
    include(element.position.y);
    include(element.position.y + element.size.h);
    include(element.position.y + Math.min(0, element.labelOffset.y));
    for (const terminal of element.terminals) include(element.position.y + terminal.offset.y);
  }
  for (const wire of schema.wires) { include(wire.from.y); include(wire.to.y); }
  if (!Number.isFinite(minY) || !Number.isFinite(maxY)) return { offsetY: 0, height: schema.sheet.height };

  // The old editor reserves about 24 CAD units above and below its drawing frame.
  // Give top labels a small clearance too; enlarge the page if that is needed.
  const top = 30;
  const offsetY = minY < top ? top - minY : maxY > schema.sheet.height - 24 ? schema.sheet.height - 24 - maxY : 0;
  const requiredHeight = Math.max(schema.sheet.height, maxY + offsetY + 24);
  return { offsetY, height: Math.ceil(requiredHeight / 3) * 3 };
}

/** Convert the editor model to .cad and verify it by importing the result back. */
export function exportCad(schema: Schema): string {
  const placement = legacyFramePlacement(schema);
  const records = [
    ...schema.elements.map(elementRecord),
    ...schema.wires.map(wireRecord),
  ];
  for (const record of records) {
    if (record.texts.some((value) => value.includes('#') || value.includes('*'))) {
      throw new Error(`Объект ${record.id}: символы # и * нельзя записать в текстовые поля .cad.`);
    }
    if (record.nums.some((value) => !Number.isFinite(value))) {
      throw new Error(`Объект ${record.id}: .cad не поддерживает бесконечные и пустые числовые значения.`);
    }
    if (placement.offsetY && record.type !== 20000) {
      record.nums[9] = (record.nums[9] ?? 0) + placement.offsetY;
      if ([4000, 4001, 4009, 4010].includes(record.type)) record.nums[11] = (record.nums[11] ?? 0) + placement.offsetY;
    }
  }
  const footer = footerFor(schema);
  footer.settings[footer.settings.length - 1] = placement.height;
  const text = serializeCad({ records, footer });
  const restored = importCad(text);
  if (restored.warnings.some((warning) => ['bad-record', 'missing-footer', 'bad-footer'].includes(warning.code))) {
    throw new Error('Проверка .cad после экспорта не прошла: файл не удалось прочитать обратно.');
  }
  if (restored.schema.elements.length !== schema.elements.length || restored.schema.wires.length !== schema.wires.length) {
    throw new Error('Проверка .cad после экспорта не прошла: количество объектов изменилось.');
  }
  const elementsById = new Map(restored.schema.elements.map((element) => [element.id, element]));
  for (const element of schema.elements) {
    if (element.typeCode === 20000) continue;
    const imported = elementsById.get(element.id);
    if (!imported || imported.position.y !== element.position.y + placement.offsetY) {
      throw new Error(`Проверка .cad после экспорта не прошла: координата элемента ${element.id} изменилась.`);
    }
  }
  const wiresById = new Map(restored.schema.wires.map((wire) => [wire.id, wire]));
  for (const wire of schema.wires) {
    const imported = wiresById.get(wire.id);
    if (!imported || imported.from.y !== wire.from.y + placement.offsetY || imported.to.y !== wire.to.y + placement.offsetY) {
      throw new Error(`Проверка .cad после экспорта не прошла: координаты провода ${wire.id} изменились.`);
    }
  }
  return text;
}
