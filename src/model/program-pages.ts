import type { Point, Schema, SchemaElement, WireSegment } from './types';

// ── Отдельные листы программы ПЛК (LOGO 10202, S7-1200 10230) ─────────────────────────────────────────
// Программа Ladder ПЛК рисуется не на основном листе, а на своём: это та же схема, только объекты лежат
// далеко справа, с x = k · PAGE_PITCH (лист k = 1, 2, …). Сети по координатам не пересекаются, поэтому движок
// считает основной лист и листы программ вместе, как одну схему: входы I с основного листа, выходы Q — обратно.
// Лист программы принадлежит ПЛК с params.programPage = k. Число листов — sheet.programPages.
//
// В .cad (у CADe_SIMU один лист) листы программ пишутся справа от рамки основного листа, полосами шириной
// W + CAD_PAGE_GAP (packProgramPagesForCad); при открытии такой файл раскладывается обратно (unpack…).

export const PAGE_PITCH = 9000;
export const CAD_PAGE_GAP = 30;

export const PLC_WITH_PROGRAM: ReadonlySet<number> = new Set([10202, 10230]);

/** Лист программы по умолчанию — того же размера, что основной лист; ширина не больше его ширины (для .cad). */
/** Шаг строк Ladder: линии-разделители на листе программы, как в LOGO!Soft; середина строки — на сетке (9, 27, …). */
export const RUNG_PITCH = 18;

export function programPageSize(
  sheet: { width: number; height: number; programPageWidth?: number; programPageHeight?: number },
): { width: number; height: number } {
  return {
    width: Math.min(sheet.width, sheet.programPageWidth ?? sheet.width),
    height: sheet.programPageHeight ?? sheet.height,
  };
}

/** Лист по координате x: 0 — основной. */
export const pageOfX = (x: number): number => Math.max(0, Math.round(x / PAGE_PITCH));
export const pageOrigin = (page: number): number => page * PAGE_PITCH;
export const pageOfElement = (element: { position: Point }): number => pageOfX(element.position.x);
export const pageOfWire = (wire: { from: Point }): number => pageOfX(wire.from.x);

export const programPageCount = (schema: Schema): number => Math.max(0, Math.floor(schema.sheet.programPages ?? 0));

/** Лист программы ПЛК, если он есть. */
export function programPageOf(schema: Schema, plc: SchemaElement): number | undefined {
  const page = Number(plc.params.programPage);
  return Number.isInteger(page) && page >= 1 && page <= programPageCount(schema) ? page : undefined;
}

/** ПЛК, которому принадлежит лист программы. */
export const programPageOwner = (schema: Schema, page: number): SchemaElement | undefined =>
  schema.elements.find((element) => PLC_WITH_PROGRAM.has(element.typeCode) && Number(element.params.programPage) === page);

/** Лист программы ПЛК: существующий или новый (следующий номер). */
export function ensureProgramPage(schema: Schema, plc: SchemaElement): number {
  const existing = programPageOf(schema, plc);
  if (existing !== undefined) return existing;
  const used = new Set(schema.elements.map((element) => Number(element.params.programPage)));
  let page = 1;
  while (page <= programPageCount(schema) && used.has(page)) page += 1;
  schema.sheet.programPages = Math.max(programPageCount(schema), page);
  plc.params.programPage = page;
  return page;
}

const bandOf = (schema: Schema): number => schema.sheet.width + CAD_PAGE_GAP;

function shiftX(elements: readonly SchemaElement[], wires: readonly WireSegment[], dx: (page: number) => number,
  pageOfElementX: (x: number) => number): void {
  for (const element of elements) {
    const d = dx(pageOfElementX(element.position.x));
    if (d) element.position = { ...element.position, x: element.position.x + d };
  }
  for (const wire of wires) {
    const d = dx(pageOfElementX(wire.from.x));
    if (d) {
      wire.from = { ...wire.from, x: wire.from.x + d };
      wire.to = { ...wire.to, x: wire.to.x + d };
    }
  }
}

/** Копия схемы для .cad: листы программ — полосами справа от рамки основного листа. */
export function packProgramPagesForCad(schema: Schema): Schema {
  if (!programPageCount(schema)) return schema;
  const copy: Schema = structuredClone(schema);
  const band = bandOf(copy);
  shiftX(copy.elements, copy.wires, (page) => page * (band - PAGE_PITCH), pageOfX);
  return copy;
}

/**
 * Открытый .cad: объекты в полосах справа от рамки (если на листе есть ПЛК) — обратно на листы программ;
 * листы по порядку достаются ПЛК без листа (по id).
 */
export function unpackProgramPagesFromCad(schema: Schema): void {
  const plcs = schema.elements.filter((element) => PLC_WITH_PROGRAM.has(element.typeCode)).sort((a, b) => a.id - b.id);
  if (!plcs.length) return;
  const band = bandOf(schema);
  const bandOfX = (x: number): number => Math.max(0, Math.floor(x / band));
  const pages = Math.max(0, ...schema.elements.map((e) => bandOfX(e.position.x)), ...schema.wires.map((w) => bandOfX(w.from.x)));
  if (!pages) return;
  // Раскладываем, только если файл явно записан полосами (как пишет packProgramPagesForCad): ни одна точка
  // не лежит в промежутке между полосами и каждый объект целиком в своей полосе. Иначе это обычная схема
  // CADe_SIMU, которая просто вылезла за рамку (CADe_S1.cad), — её не трогаем.
  const inGap = (x: number): boolean => x - bandOfX(x) * band > schema.sheet.width;
  const sameBand = (xs: number[]): boolean => xs.every((x) => !inGap(x) && bandOfX(x) === bandOfX(xs[0] ?? 0));
  const clean = schema.elements.every((e) => sameBand([e.position.x, ...e.terminals.map((t) => e.position.x + t.offset.x)]))
    && schema.wires.every((w) => sameBand([w.from.x, w.to.x]));
  if (!clean) return;
  shiftX(schema.elements, schema.wires, (page) => page * (PAGE_PITCH - band), bandOfX);
  schema.sheet.programPages = pages;
  const free = plcs.filter((plc) => programPageOf(schema, plc) === undefined);
  for (let page = 1; page <= pages; page += 1) {
    if (programPageOwner(schema, page)) continue;
    const plc = free.shift();
    if (plc) plc.params.programPage = page;
  }
}

/**
 * Лист программы не меньше своего содержимого: если объекты вылезают за лист (схема, сохранённая до уменьшения
 * листа по умолчанию, или открытая из .cad), лист увеличивается под них. Только растёт; true — размер изменён.
 */
export function growProgramPagesToContent(schema: Schema): boolean {
  if (!programPageCount(schema)) return false;
  const size = programPageSize(schema.sheet);
  let width = size.width;
  let height = size.height;
  const fit = (page: number, x: number, y: number): void => {
    if (page < 1) return;
    width = Math.max(width, Math.ceil((x - pageOrigin(page) + 6) / 3) * 3);
    height = Math.max(height, Math.ceil((y + 6) / 3) * 3);
  };
  for (const element of schema.elements) {
    const page = pageOfElement(element);
    fit(page, element.position.x + element.size.w, element.position.y + element.size.h);
    for (const terminal of element.terminals) fit(page, element.position.x + terminal.offset.x, element.position.y + terminal.offset.y);
  }
  for (const wire of schema.wires) {
    const page = pageOfWire(wire);
    fit(page, Math.max(wire.from.x, wire.to.x), Math.max(wire.from.y, wire.to.y));
  }
  width = Math.min(width, schema.sheet.width);
  if (width === size.width && height === size.height) return false;
  schema.sheet.programPageWidth = width;
  schema.sheet.programPageHeight = height;
  return true;
}
