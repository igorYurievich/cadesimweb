import { detectorSpec } from './detector-types';
import { packProgramPagesForCad } from './program-pages';
import { importCad } from './cad-import';
import { LOGO_DEFAULT_IP, LOGO_TYPE, isPlcFixedType } from './plc-types';
import { writePlcBlockRecord } from './plc-blocks';
import { DM8_DEFAULT_TAIL, LOGO_DM8, logoSupply, plcAddresses, type ModuleAddress } from './plc-modules';
import { buttonColorValue, isPushbutton2d } from './pushbutton-2d';
import { STAIR_TIMER_2D, stairTimerFileParam } from './stair-timer';
import { CAD_NUM_FIELDS, CAD_TEXT_FIELDS, flagCountOf, serializeCad } from './cad-format';
import type { CadFooter, CadRecord } from './cad-format';
import type { Schema, SchemaElement, WireSegment } from './types';
import { TAIL_TERMINALS, buildTail } from './cad-tail-terminals';
import { VFD_CONTROL, isVfd2d, vfdSettings, vfdTailWithSettings } from './vfd';
import { CAD_VARIANTS, VARIANT_RECORD_LABELS, VARIANT_STEP } from './cad-variants';
import { writeTextFrame } from './cad-text';
import { isGrafcetType } from './grafcet';
import { writeDelayBlockRecord } from './cad-delay-blocks';
import { AUX_BLOCK_2D, MOTOR_2D_FILE_PARAM, isDelayBlock2d } from './realistic-2d-types';

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
  [LOGO_TYPE]: LOGO_DEFAULT_IP,
  [LOGO_DM8]: DM8_DEFAULT_TAIL,
};

/** Слоты флагов клемм у новых элементов, если они идут не подряд с нуля: у 1066/1067 слот 3 (I4) пуст, выходы Q1..Q4 лежат в слотах 4..7 (как в образце). */
const SLOT_MAP: Readonly<Record<number, readonly number[]>> = {
  1066: [0, 1, 2, 4, 5, 6, 7],
  1067: [0, 1, 2, 4, 5, 6, 7],
};

/** Типы, у которых клеммы не помещаются в одну запись: сколько клемм в основной, остальные идут записью-продолжением -1 (как в образце). */
const SPLIT_AT: Readonly<Record<number, number>> = { 1056: 7 };
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
 * Лишние слоты флагов новой записи сверх восьми. У символов 2D с хвостом их нет: клеммы после восьмой
 * пишутся в хвост, а запись остаётся стандартной (8 флагов, 23 числа), как в образцах.
 */
function newRecordExtraFlags(element: SchemaElement): number {
  if (TAIL_TERMINALS[element.typeCode] || isGrafcetType(element.typeCode)) return 0;
  return Math.max(0, Math.min(element.terminals.length, SPLIT_AT[element.typeCode] ?? Infinity) - 8);
}

/** Записи элемента: основная и (если были) продолжения типа -1, как в исходном файле. */
function elementRecords(
  element: SchemaElement, allocId: () => number, addresses = new Map<number, ModuleAddress>(),
): CadRecord[] {
  const raw = element.raw;
  const record: CadRecord = raw
    ? { id: element.id, type: element.typeCode, texts: [...raw.texts], nums: [...raw.nums], ...(raw.tail !== undefined ? { tail: raw.tail } : {}) }
    : emptyRecord(element.id, element.typeCode, newRecordExtraFlags(element));
  if (!raw && DEFAULT_TAILS[element.typeCode] !== undefined) record.tail = DEFAULT_TAILS[element.typeCode] as string;
  // Блок управления преобразователя: фиксированные частоты и рампы — в полях хвоста (model/vfd.ts, §35 FORMATO).
  if (element.typeCode === VFD_CONTROL) record.tail = vfdTailWithSettings(record.tail, vfdSettings(element));
  if (isVfd2d(element.typeCode)) record.tail = vfdTailWithSettings(record.tail, vfdSettings(element), true);
  padRecord(record);
  const o = shiftOf(record);
  record.texts[0] = element.name;
  record.texts[1] = element.func;
  record.nums[8 + o] = element.position.x;
  record.nums[9 + o] = element.position.y;
  record.nums[12 + o] = element.labelOffset.x;
  record.nums[13 + o] = element.labelOffset.y;
  // Текст (тип 8): рамка x1 y1 x2 y2, текст — после записи, поля « 0» как в образцах CADe_SIMU.
  if (element.typeCode === 8) writeTextFrame(record, element, o, !raw);
  else [record.nums[14 + o], record.nums[15 + o]] = [element.size.w, element.size.h];
  record.nums[17 + o] = element.rotation;
  // Мотор 2D — обычный 1000/1001 с nums[16] = 1 (realistic-2d-types.ts).
  if (element.params.motor2d === true) record.nums[16 + o] = MOTOR_2D_FILE_PARAM;
  // Цвет кнопки 2D — nums[16] (pushbutton-2d.ts).
  if (isPushbutton2d(element.typeCode)) record.nums[16 + o] = buttonColorValue(element);
  // Минутник (только веб): выдержка и подключение кнопок — nums[16] (stair-timer.ts).
  if (element.typeCode === STAIR_TIMER_2D) record.nums[16 + o] = stairTimerFileParam(element);
  const continuations: CadRecord[] = (raw?.continuations ?? []).map((c) => ({
    id: c.id, type: c.type, texts: [...c.texts], nums: [...c.nums], ...(c.tail !== undefined ? { tail: c.tail } : {}),
  }));
  continuations.forEach(padRecord);
  const groups = [record, ...continuations];
  const slotGroups = groups.map(slotsOf);
  const total = slotGroups.reduce((sum, slots) => sum + slots.length, 0);
  const tailSpec = TAIL_TERMINALS[element.typeCode];
  const variant = CAD_VARIANTS[element.typeCode];
  if (variant) {
    // Автомат/дифавтомат 2D: код файла, вариант в nums[16], слоты N 1 3 5 2 4 6 как в образце (cad-variants.ts).
    record.type = variant.fileCode;
    // Остаток от деления на 9 — не вариант, а другой признак записи: сохраняем его (cad-variants.ts).
    record.nums[16 + o] = variant.param + ((record.nums[16 + o] ?? 0) % VARIANT_STEP);
    record.nums.fill(0, 0, flagCountOf(record));
    VARIANT_RECORD_LABELS.forEach((label, index) => {
      record.nums[index] = 1;
      record.texts[2 + index] = label;
    });
    record.texts[2 + VARIANT_RECORD_LABELS.length] = '';
    continuations.length = 0;
  } else if (isGrafcetType(element.typeCode)) {
    // GRAFCET (только веб): флагов и меток нет, выводы задаёт тип и ширина рамки (model/grafcet.ts).
    record.nums.fill(0, 0, flagCountOf(record));
    for (let i = 2; i < record.texts.length; i += 1) record.texts[i] = '';
    continuations.length = 0;
  } else if (isDelayBlock2d(element.typeCode)) {
    // Блоки с выдержкой 2D: флагов клемм нет, выдержка в texts[5] (cad-delay-blocks.ts).
    writeDelayBlockRecord(record, element, !raw);
    continuations.length = 0;
  } else if (element.typeCode === AUX_BLOCK_2D || isPlcFixedType(element.typeCode)) {
    // Блок контактов 2D, LOGO и Ladder: в записи образца ни флагов, ни меток — клеммы постоянные.
    record.nums.fill(0, 0, flagCountOf(record));
    for (let i = 2; i < record.texts.length; i += 1) record.texts[i] = '';
    // Блоки Ladder: подписи входов и параметры в текстах, флаг nums[0] у счётчика,
    // nums[20] у First Scan (plc-blocks.ts).
    writePlcBlockRecord(record, element, !raw, o);
    // DM8: номера первого входа и выхода по соседству с базовым LOGO (plc-modules.ts).
    const address = element.typeCode === LOGO_DM8
      ? addresses.get(element.id) : undefined;
    if (address) [record.texts[2], record.texts[3]] = [String(address.firstInput), String(address.firstOutput)];
    // Питание LOGO / DM8 (24 или 230 V, только веб-версия): последнее текстовое поле записи (plc-modules.ts).
    // Пишется, только если питание выбрано в свойствах: файлы CADe_SIMU сохраняются без изменений.
    if ((element.typeCode === LOGO_TYPE || element.typeCode === LOGO_DM8) && element.params.supply !== undefined) {
      record.texts[record.texts.length - 1] = `${logoSupply(element)}V`;
    }
    continuations.length = 0;
  } else if (tailSpec) {
    // Символы 2D: первые 8 клемм в слотах записи, клеммы с номера start — парами в хвосте (cad-tail-terminals.ts).
    record.nums.fill(0, 0, flagCountOf(record));
    element.terminals.slice(0, 8).forEach((terminal, index) => {
      record.nums[index] = 1;
      record.texts[2 + index] = terminal.label;
    });
    record.tail = buildTail(element.terminals.slice(tailSpec.start).map((terminal) => terminal.label), tailSpec.pairs);
    continuations.length = 0;
  } else if (!raw || total !== element.terminals.length) {
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
  // Цвет лампы: 9008 / 9009 — как в CADe_SIMU; пилот 2D 8101 — тем же полем (кодировка CADe_SIMU у него не известна).
  if ([9008, 9009, 8101].includes(element.typeCode) && element.params.color !== undefined) {
    record.texts[parameterStart] = String(element.params.color);
  }
  // «Botón pulsador» 8023 (клемм нет): цвет «rrggbb» (без «#», он в .cad служебный) в первом поле после имени
  // и функции (только веб-версия).
  if (element.typeCode === 8023 && typeof element.params.buttonColor === 'string') {
    record.texts[parameterStart] = element.params.buttonColor.replace(/^#/, '');
  }
  // Приёмник фотобарьера: имя привязанного излучателя в первом поле после меток клемм (только веб, photo-beam.ts).
  if (detectorSpec(element.typeCode)?.kind === 'receiver' && parameterStart < record.texts.length) {
    record.texts[parameterStart] = typeof element.params.emitter === 'string' ? element.params.emitter.replace(/[#\r\n]/g, '').trim() : '';
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
export function exportCad(original: Schema): string {
  // Листы программ ПЛК — справа от рамки основного листа (program-pages.ts); проверка ниже — по исходной схеме,
  // потому что при чтении файла листы раскладываются обратно.
  const schema = packProgramPagesForCad(original);
  const placement = legacyFramePlacement(schema);
  // Свободные id для новых записей-продолжений (-1): у каждой записи файла свой id.
  let nextId = 1 + Math.max(
    0,
    ...schema.elements.flatMap((element) => [element.id, ...(element.raw?.continuations ?? []).map((c) => c.id)]),
    ...schema.wires.map((wire) => wire.id),
  );
  const allocId = (): number => nextId++;
  const addresses = plcAddresses(schema);
  const records = [
    ...schema.elements.flatMap((element) => elementRecords(element, allocId, addresses)),
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
      if ([8, 4000, 4001, 4009, 4010, 4018, 4019].includes(record.type)) record.nums[11 + o] = (record.nums[11 + o] ?? 0) + placement.offsetY;
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
