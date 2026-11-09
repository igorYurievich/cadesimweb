import { importCad } from './cad-import';
import { CAD_NUM_FIELDS, CAD_TEXT_FIELDS, flagCountOf, serializeCad } from './cad-format';
import type { CadFooter, CadRecord } from './cad-format';
import type { Schema, SchemaElement, WireSegment } from './types';

function emptyRecord(id: number, type: number, extraFlags = 0): CadRecord {
  return { id, type, texts: Array(CAD_TEXT_FIELDS + extraFlags).fill(''), nums: Array(CAD_NUM_FIELDS + extraFlags).fill(0) };
}

/**
 * Текст после закрывающего «#» у новых элементов (без исходной записи): так записан в образце potencias_electronicas.cad.
 * Смысл строки не разгадан [вывод: параметры внутреннего рисунка], поэтому берём её как в образце.
 */
const DEFAULT_TAILS: Readonly<Record<number, string>> = {
  1062: '000/030/000/400',
  1063: '000/030/000/400',
  1056: '1-0-0-001-200-010-025-050-05-05-00-0',
  1061: '0-050-230-0050-2000-05-05',
  1065: 'L+-1-L--1-1',
  1066: 'L+-1-L--1-1',
  1067: 'L+-1-L--1-1',
};

/** Слоты флагов клемм у новых элементов, если они идут не подряд с нуля: у 1066/1067 слот 3 (I4) пуст, выходы Q1..Q4 лежат в слотах 4..7 (как в образце). */
const SLOT_MAP: Readonly<Record<number, readonly number[]>> = {
  1066: [0, 1, 2, 4, 5, 6, 7],
  1067: [0, 1, 2, 4, 5, 6, 7],
};

/** Типы, у которых клеммы не помещаются в одну запись: сколько клемм в основной, остальные идут записью-продолжением -1 (как в образце). */
const SPLIT_AT: Readonly<Record<number, number>> = { 1056: 7 };
const THERMAL_REFERENCE_TYPES = new Set([6007, 8016, 8017, 8018, 8019]);

/** Дополняет запись до минимума полей; лишние поля (11-е текстовое, 24-е число у 1052) остаются как есть. */
function padRecord(record: CadRecord): void {
  while (record.texts.length < CAD_TEXT_FIELDS) record.texts.push('');
  while (record.nums.length < CAD_NUM_FIELDS) record.nums.push(0);
}

/** Сдвиг индексов после флагов: у записи с лишними флагами x, y, размер лежат правее. */
const shiftOf = (record: CadRecord): number => record.nums.length - CAD_NUM_FIELDS;

function slotsOf(record: Pick<CadRecord, 'nums'>): number[] {
  const count = flagCountOf(record);
  return record.nums.slice(0, count).flatMap((flag, index) => flag !== 0 ? [index] : []);
}

/**
 * Thermal relays and their auxiliary contacts use a leading dash in CADe_SIMU
 * 4.2 reference names (for example, -FG1). The web editor keeps the short
 * visible name (FG1), so add the legacy prefix to the serialized record only.
 */
function cadReferenceName(element: SchemaElement): string {
  if (THERMAL_REFERENCE_TYPES.has(element.typeCode) && element.name !== '' && !element.name.startsWith('-')) {
    return `-${element.name}`;
  }
  return element.name;
}

/** Записи элемента: основная и (если были) продолжения типа -1, как в исходном файле. */
function elementRecords(element: SchemaElement, allocId: () => number): CadRecord[] {
  const raw = element.raw;
  const record: CadRecord = raw
    ? { id: element.id, type: element.typeCode, texts: [...raw.texts], nums: [...raw.nums], ...(raw.tail !== undefined ? { tail: raw.tail } : {}) }
    : emptyRecord(element.id, element.typeCode, Math.max(0, Math.min(element.terminals.length, SPLIT_AT[element.typeCode] ?? Infinity) - 8));
  if (!raw && DEFAULT_TAILS[element.typeCode] !== undefined) record.tail = DEFAULT_TAILS[element.typeCode] as string;
  padRecord(record);
  const o = shiftOf(record);
  record.texts[0] = cadReferenceName(element);
  record.texts[1] = element.func;
  record.nums[8 + o] = element.position.x;
  record.nums[9 + o] = element.position.y;
  // CADe_SIMU 4.2 places the 6007 reference label at (-15, -3). The web
  // editor's midpoint default (+10.5, -3) shifts the legacy hit target to the
  // right of the drawn relay, so normalize this offset in exported CAD files.
  record.nums[12 + o] = element.typeCode === 6007 ? -15 : element.labelOffset.x;
  record.nums[13 + o] = element.typeCode === 6007 ? -3 : element.labelOffset.y;
  if (element.typeCode !== 8) {
    record.nums[14 + o] = element.size.w;
    record.nums[15 + o] = element.size.h;
  }
  record.nums[17 + o] = element.rotation;
  // CADe_SIMU 4.2 marks electrical elements with nums[19] = 1. In particular,
  // its native 6007 thermal-relay records use this flag; without it the symbol
  // imports as a passive graphic even when its type and terminals are correct.
  if (THERMAL_REFERENCE_TYPES.has(element.typeCode)) record.nums[19 + o] = 1;

  const continuations: CadRecord[] = (raw?.continuations ?? []).map((c) => ({
    id: c.id, type: c.type, texts: [...c.texts], nums: [...c.nums], ...(c.tail !== undefined ? { tail: c.tail } : {}),
  }));
  continuations.forEach(padRecord);
  const groups = [record, ...continuations];
  const slotGroups = groups.map(slotsOf);
  const total = slotGroups.reduce((sum, slots) => sum + slots.length, 0);
  if (!raw || total !== element.terminals.length) {
    // Число клемм изменилось: флаги пишем заново подряд, продолжения отбрасываем (клемм у них больше нет).
    record.nums.fill(0, 0, flagCountOf(record));
    const sequential = element.terminals.slice(0, Math.min(flagCountOf(record), SPLIT_AT[element.typeCode] ?? Infinity)).map((_, index) => index);
    const slots = !raw && SLOT_MAP[element.typeCode]?.length === element.terminals.length ? [...(SLOT_MAP[element.typeCode] ?? [])] : sequential;
    for (const slot of slots) record.nums[slot] = 1;
    element.terminals.slice(0, slots.length).forEach((terminal, index) => { record.texts[2 + (slots[index] ?? index)] = terminal.label; });
    continuations.length = 0;
    const split = SPLIT_AT[element.typeCode];
    if (!raw && split !== undefined && element.terminals.length > split) {
      const rest = element.terminals.slice(split);
      const extra = emptyRecord(allocId(), -1);
      rest.slice(0, flagCountOf(extra)).forEach((terminal, index) => { extra.nums[index] = 1; extra.texts[2 + index] = terminal.label; });
      for (let i = 8; i < extra.nums.length; i += 1) extra.nums[i] = record.nums[i + o] ?? 0;
      continuations.push(extra);
    }
  } else {
    let index = 0;
    groups.forEach((group, g) => {
      for (const slot of slotGroups[g] ?? []) {
        group.texts[2 + slot] = element.terminals[index]?.label ?? '';
        index += 1;
      }
    });
  }

  // Продолжение стоит в том же месте и той же рамки, что и сам элемент: двигаем вместе с ним.
  for (const c of continuations) {
    const co = shiftOf(c);
    c.nums[8 + co] = element.position.x;
    c.nums[9 + co] = element.position.y;
    c.nums[14 + co] = element.size.w;
    c.nums[15 + co] = element.size.h;
  }

  const parameterStart = 2 + element.terminals.length;
  if ((element.typeCode === 9008 || element.typeCode === 9009) && element.params.color !== undefined) {
    record.texts[parameterStart] = String(element.params.color);
  }
  if (element.typeCode === 9004 || element.typeCode === 9005 || element.typeCode === 9006) {
    if (element.params.scale !== undefined) record.texts[parameterStart] = String(element.params.scale);
    if (element.params.time !== undefined) record.texts[parameterStart + 1] = String(element.params.time);
  }
  return [record, ...continuations];
}

function wireRecord(wire: WireSegment): CadRecord {
  const record = wire.raw
    ? { id: wire.id, type: wire.typeCode, texts: [...wire.raw.texts], nums: [...wire.raw.nums], ...(wire.raw.tail !== undefined ? { tail: wire.raw.tail } : {}) }
    : emptyRecord(wire.id, wire.typeCode);
  padRecord(record);
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
function legacyFramePlacement(schema: Schema): { offsetY: number } {
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
  if (!Number.isFinite(minY) || !Number.isFinite(maxY)) return { offsetY: 0 };

  // The old editor reserves about 24 CAD units above and below its drawing frame.
  // Give top labels a small clearance too; enlarge the page if that is needed.
  const top = 30;
  const offsetY = minY < top ? top - minY : maxY > schema.sheet.height - 24 ? schema.sheet.height - 24 - maxY : 0;
  return { offsetY };
}

/** Convert the editor model to .cad and verify it by importing the result back. */
export function exportCad(schema: Schema): string {
  const placement = legacyFramePlacement(schema);
  // Свободные id для новых записей-продолжений (-1): у каждой записи файла свой id.
  let nextId = 1 + Math.max(
    0,
    ...schema.elements.flatMap((element) => [element.id, ...(element.raw?.continuations ?? []).map((c) => c.id)]),
    ...schema.wires.map((wire) => wire.id),
  );
  const allocId = (): number => nextId++;
  const records = [
    ...schema.elements.flatMap((element) => elementRecords(element, allocId)),
    ...schema.wires.map(wireRecord),
  ];
  for (const record of records) {
    if (record.texts.some((value) => value.includes('#') || value.includes('*')) || (record.tail ?? '').match(/[#*$]/)) {
      throw new Error(`Объект ${record.id}: символы # и * нельзя записать в текстовые поля .cad.`);
    }
    if (record.nums.some((value) => !Number.isFinite(value))) {
      throw new Error(`Объект ${record.id}: .cad не поддерживает бесконечные и пустые числовые значения.`);
    }
    if (placement.offsetY && record.type !== 20000) {
      const o = shiftOf(record);
      record.nums[9 + o] = (record.nums[9 + o] ?? 0) + placement.offsetY;
      if ([4000, 4001, 4009, 4010].includes(record.type)) record.nums[11 + o] = (record.nums[11 + o] ?? 0) + placement.offsetY;
    }
  }
  const footer = footerFor(schema);
  const text = serializeCad({ records, footer });
  const restored = importCad(text);
  if (restored.warnings.some((warning) => ['bad-record', 'missing-footer', 'bad-footer'].includes(warning.code))) {
    throw new Error('Проверка .cad после экспорта не прошла: файл не удалось прочитать обратно.');
  }
  if (restored.schema.elements.length !== schema.elements.length || restored.schema.wires.length !== schema.wires.length) {
    throw new Error('Проверка .cad после экспорта не прошла: количество объектов изменилось.');
  }
  if (restored.schema.sheet.width !== schema.sheet.width || restored.schema.sheet.height !== schema.sheet.height) {
    throw new Error('Проверка .cad после экспорта не прошла: размер листа изменился.');
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
