/**
 * Импорт .cad в модель схемы (Schema).
 * Поля записи (индексы в CadRecord.nums), выведенные из образцов:
 *   0..7   флаги клемм (1 = клемма есть), метки клемм в texts[2..9]
 *   8, 9   x, y позиции; у провода это начало (x1, y1)
 *   10, 11 у провода конец (x2, y2); у элементов обычно 0, 0 (смысл ненулевых значений неизвестен)
 *   12, 13 смещение подписи; у точки соединения тоже
 *   14, 15 ширина и высота рамки символа
 *   17     поворот 0..3
 *   18     толщина линии провода 1..4 (у точки соединения 0)
 *   21, 22 номера сетей, записанные программой при последней симуляции (кэш, мог устареть)
 * texts: [0] имя, [1] функция, [2..] метки клемм, затем параметры элемента.
 */

import { parseCad } from './cad-format';
import type { CadFooter, CadRecord, CadWarning } from './cad-format';
import { getCadType, isKnownCadType, isWireType, wireKindOf } from './cad-types';
import { buildTerminals } from './geometry';
import type { Rotation, Schema, SchemaElement, SheetInfo, WireSegment } from './types';
import { createEmptySchema } from './types';

export interface ImportResult {
  schema: Schema;
  /** Предупреждения чтения файла и импорта. */
  warnings: CadWarning[];
  /** Коды типов, которых нет в таблице cad-types.ts (клеммы для них расставлены по умолчанию). */
  unknownTypes: number[];
}

const FLAG_COUNT = 8;

function num(r: CadRecord, i: number): number {
  return r.nums[i] ?? 0;
}

function toRotation(n: number): Rotation {
  const k = ((Math.round(n) % 4) + 4) % 4;
  return k as Rotation;
}

function terminalCount(r: CadRecord): number {
  let n = 0;
  for (let i = 0; i < FLAG_COUNT; i += 1) if (num(r, i) !== 0) n += 1;
  return n;
}

function toWire(r: CadRecord, kind: NonNullable<ReturnType<typeof wireKindOf>>): WireSegment {
  return {
    id: r.id,
    typeCode: r.type,
    kind,
    from: { x: num(r, 8), y: num(r, 9) },
    to: { x: num(r, 10), y: num(r, 11) },
    thickness: num(r, 18),
    dot: kind === 'junction' && num(r, 14) > 0,
    raw: { texts: [...r.texts], nums: [...r.nums] },
  };
}

function toElement(r: CadRecord): SchemaElement {
  const info = getCadType(r.type);
  const size = { w: num(r, 14), h: num(r, 15) };
  const rotation = toRotation(num(r, 17));
  const count = terminalCount(r);
  // Метка клеммы лежит в текстовом поле того же номера, что и её флаг: флаг i → texts[2 + i].
  // Обычно флаги идут подряд с нуля, но у счётчика 9016 флаги 0..3 и 6, а между метками стоят параметры.
  const slots: number[] = [];
  for (let i = 0; i < FLAG_COUNT; i += 1) if (num(r, i) !== 0) slots.push(i);
  const labels = slots.map((i) => r.texts[2 + i] ?? '');
  const terminals = buildTerminals(info, count, size, rotation, labels);

  // Всё остальное в текстовых полях после имени и функции (кроме меток клемм) считаем параметрами.
  const labelFields = new Set(slots.map((i) => 2 + i));
  const extra = r.texts.filter((t, i) => i >= 2 && !labelFields.has(i) && t !== '');
  const params: SchemaElement['params'] = {};
  if (info.family === 'lamp' && extra[0] !== undefined) params.color = Number(extra[0]);
  if (info.code === 9004) {
    // Порядок и смысл (шкала, значение) подтверждены только по двум образцам: 0/5 и 0/10.
    if (extra[0] !== undefined) params.scale = Number(extra[0]);
    if (extra[1] !== undefined) params.time = Number(extra[1]);
  }
  if (extra.length > 0) params.extra = extra.join('#');

  return {
    id: r.id,
    typeCode: r.type,
    name: r.texts[0] ?? '',
    func: r.texts[1] ?? '',
    position: { x: num(r, 8), y: num(r, 9) },
    rotation,
    size,
    labelOffset: { x: num(r, 12), y: num(r, 13) },
    terminals,
    params,
    raw: { texts: [...r.texts], nums: [...r.nums] },
  };
}

/** Штамп: в подвале 10 текстовых полей с пробелами-заполнителями. */
function toSheet(footer: CadFooter | null): SheetInfo {
  const sheet = createEmptySchema().sheet;
  if (!footer) return { ...sheet, author: '' };
  const f = footer.fields.map((s) => s.trim());
  const [width, height] = footer.settings.slice(-2);
  return {
    // Поля штампа 1 и 3: имя и фамилия, как они записаны в образцах (IGOR, LIPSKIY).
    author: [f[1], f[3]].filter(Boolean).join(' '),
    entity: f[4] ?? '',
    title: f[5] ?? '',
    date: f[6] ?? '',
    number: f[7] ?? '',
    total: f[8] ?? '',
    drawnDate: f[0] ?? '',
    checkedDate: f[2] ?? '',
    fileName: f[9] ?? '',
    width: width ?? sheet.width,
    height: height ?? sheet.height,
    cadFooter: { settings: [...footer.settings], fields: [...footer.fields] },
  };
}

export function importCad(text: string): ImportResult {
  const file = parseCad(text);
  const warnings = [...file.warnings];
  const elements: SchemaElement[] = [];
  const wires: WireSegment[] = [];
  const unknown = new Set<number>();

  // CADe_SIMU иногда пишет одинаковый id у разных объектов (после копирования). Состояния движка
  // (лампы, контакты, моторы) хранятся по id, поэтому дубли получают новые уникальные номера.
  const usedIds = new Set<number>();
  let nextId = Math.max(0, ...file.records.map((record) => record.id)) + 1;
  const records = file.records.map((record) => {
    if (!usedIds.has(record.id)) {
      usedIds.add(record.id);
      return record;
    }
    const id = nextId;
    nextId += 1;
    usedIds.add(id);
    return { ...record, id };
  });

  for (const r of records) {
    const kind = isWireType(r.type) ? wireKindOf(r.type) : undefined;
    if (kind) {
      wires.push(toWire(r, kind));
      continue;
    }
    if (!isKnownCadType(r.type)) unknown.add(r.type);
    elements.push(toElement(r));
  }

  const schema: Schema = {
    formatVersion: 1,
    elements,
    wires,
    sheet: toSheet(file.footer),
  };
  return { schema, warnings, unknownTypes: [...unknown].sort((a, b) => a - b) };
}

