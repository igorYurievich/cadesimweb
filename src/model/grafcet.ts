import type { CadTypeInfo } from './cad-types';
import { exprOperands, parseActions, stepOperand, tryParseReceptivity } from './grafcet-expr';
import type { Schema, SchemaElement } from './types';

// ── GRAFCET (только веб: в образцах CADe_SIMU записей GRAFCET нет, коды типов свои) ─────────────────────
// Кнопки палитры — команды CADe_SIMU панели GRAFCET (33083…33095), таблица назначений — своя (34011).
// Элементы соединяются обычными проводами (или стоят вплотную: совпавшие выводы соединяются сами).
//   Этап 12×12: вход сверху (6,0), выход снизу (6,12), действия слева (0,6) и справа (12,6). Номер — имя.
//   Переход 6×6: вход (3,0), выход (3,6), условие — имя (grafcet-expr.ts).
//   Действие 24×6: выводы слева (0,3) и справа (24,3) — встаёт вплотную к этапу с любой стороны; текст — имя.
//   Разветвления / слияния «O» (одна черта) и «Y» (двойная): ряд выводов через 3 по ширине (как клеммник),
//   все выводы — один узел. Ширина меняется в свойствах.
//   Линия связи 3×12 со стрелкой: два вывода, проводит как провод (возврат к этапу).
// Логика (engine/grafcet.ts): переход срабатывает, когда активны все этапы над ним и условие истинно;
// этапы над ним гасятся, под ним — включаются. Разветвление «O» — несколько переходов под одним этапом,
// «Y» — несколько этапов под одним переходом; слияния — наоборот. Это следует из соединений, тип черты
// задаёт только рисунок, как на бумаге.

export const GRAFCET = {
  initialStep: 8201,
  step: 8202,
  transition: 8203,
  action: 8204,
  divergenceOr: 8205,
  convergenceOr: 8206,
  divergenceAnd: 8207,
  convergenceAnd: 8208,
  link: 8209,
  table: 8210,
} as const;

export const GRAFCET_TABLE_COMMAND = 34011;

export const GRAFCET_TYPES: readonly number[] = Object.values(GRAFCET);
export const isGrafcetType = (code: number): boolean => code >= GRAFCET.initialStep && code <= GRAFCET.table;
export const isGrafcetStep = (code: number): boolean => code === GRAFCET.initialStep || code === GRAFCET.step;
export const isGrafcetBar = (code: number): boolean => code >= GRAFCET.divergenceOr && code <= GRAFCET.convergenceAnd;
export const isGrafcetAndBar = (code: number): boolean =>
  code === GRAFCET.divergenceAnd || code === GRAFCET.convergenceAnd;

export const STEP_INDEX = { in: 0, out: 1, left: 2, right: 3 } as const;
export const STEP_POINTS = [{ x: 6, y: 0 }, { x: 6, y: 12 }, { x: 0, y: 6 }, { x: 12, y: 6 }];
export const TRANSITION_POINTS = [{ x: 3, y: 0 }, { x: 3, y: 6 }];
export const ACTION_POINTS = [{ x: 0, y: 3 }, { x: 24, y: 3 }];
export const LINK_POINTS = [{ x: 0, y: 0 }, { x: 0, y: 12 }];
/** Ширина черты по умолчанию: 17 выводов, 0…48 — две колонки этапов с действиями. */
export const BAR_DEFAULT_WIDTH = 51;
export const BAR_PITCH = 3;

export const GRAFCET_SIZES: Readonly<Record<number, { w: number; h: number }>> = {
  [GRAFCET.initialStep]: { w: 12, h: 12 },
  [GRAFCET.step]: { w: 12, h: 12 },
  [GRAFCET.transition]: { w: 6, h: 6 },
  [GRAFCET.action]: { w: 24, h: 6 },
  [GRAFCET.divergenceOr]: { w: BAR_DEFAULT_WIDTH, h: 3 },
  [GRAFCET.convergenceOr]: { w: BAR_DEFAULT_WIDTH, h: 3 },
  [GRAFCET.divergenceAnd]: { w: BAR_DEFAULT_WIDTH, h: 3 },
  [GRAFCET.convergenceAnd]: { w: BAR_DEFAULT_WIDTH, h: 3 },
  [GRAFCET.link]: { w: 3, h: 12 },
  [GRAFCET.table]: { w: 66, h: 14 },
};

const points = (list: readonly { x: number; y: number }[]) => ({ kind: 'points', points: list }) as const;
const BAR_LAYOUT = { kind: 'strip', pitchX: BAR_PITCH } as const;
const note = 'Только веб (GRAFCET, model/grafcet.ts).';

function cadType(
  code: number, label: string, layout: CadTypeInfo['layout'], command: number, count?: number,
): CadTypeInfo {
  return {
    code, family: 'grafcet', label, layout, ...(count === undefined ? {} : { terminalCount: count }),
    commandIds: [command], confidence: 'probable', note,
  };
}

export const GRAFCET_CAD_TYPES: readonly CadTypeInfo[] = [
  cadType(GRAFCET.initialStep, 'Etapa inicial', points(STEP_POINTS), 33088, 4),
  cadType(GRAFCET.step, 'Etapa', points(STEP_POINTS), 33083, 4),
  cadType(GRAFCET.transition, 'Transición', points(TRANSITION_POINTS), 33084, 2),
  cadType(GRAFCET.action, 'Acción', points(ACTION_POINTS), 33085, 2),
  cadType(GRAFCET.divergenceOr, 'Divergencia en "O"', BAR_LAYOUT, 33094),
  cadType(GRAFCET.convergenceOr, 'Convergencia en "O"', BAR_LAYOUT, 33095),
  cadType(GRAFCET.divergenceAnd, 'Divergencia en "Y"', BAR_LAYOUT, 33086),
  cadType(GRAFCET.convergenceAnd, 'Convergencia en "Y"', BAR_LAYOUT, 33093),
  cadType(GRAFCET.link, 'Línea enlace', points(LINK_POINTS), 33092, 2),
  cadType(GRAFCET.table, 'Tabla de asignaciones', { kind: 'none' }, GRAFCET_TABLE_COMMAND, 0),
];

// ── Таблица назначений ───────────────────────────────────────────────────────────────────────────────
// Строки хранятся в «Función» (texts[1] в .cad): «I:S1=Pulsador marcha;Q:H1=Lámpara verde».
// I — операнд условий (вход), Q — операнд действий (выход).

export type TableKind = 'I' | 'Q';
export interface TableRow { kind: TableKind; name: string; text: string }

const clean = (value: string): string => value.replace(/[;=#*$&]/g, ' ').replace(/\s+/g, ' ').trim();

export function decodeTableRows(func: string): TableRow[] {
  const rows: TableRow[] = [];
  for (const part of func.split(';')) {
    const match = /^([IQ]):([^=]+)=(.*)$/.exec(part.trim());
    if (match) rows.push({ kind: match[1] as TableKind, name: match[2]!.trim(), text: match[3]!.trim() });
  }
  return rows;
}

export const encodeTableRows = (rows: readonly TableRow[]): string =>
  rows.map((row) => `${row.kind}:${clean(row.name)}=${clean(row.text)}`).join(';');

/** Строк в таблице: заголовок, «Entradas», «Salidas» и сами строки (шаг ROW_H). */
export const TABLE_ROW_H = 4.5;
export function tableHeight(rows: readonly TableRow[]): number {
  const inputs = rows.filter((row) => row.kind === 'I').length;
  const outputs = rows.length - inputs;
  const lines = 1 + (inputs ? inputs + 1 : 0) + (outputs ? outputs + 1 : 0) + (rows.length ? 0 : 1);
  return Math.ceil((lines * TABLE_ROW_H + 1) / 3) * 3;
}

const byName = (a: string, b: string): number => a.localeCompare(b, undefined, { numeric: true });

/** Операнды GRAFCET схемы: входы (условия) и выходы (действия), без X<n>, времени и констант. */
export function grafcetOperands(schema: Schema): { inputs: string[]; outputs: string[] } {
  const inputs = new Set<string>();
  const outputs = new Set<string>();
  for (const element of schema.elements) {
    if (element.typeCode === GRAFCET.transition) {
      for (const name of exprOperands(tryParseReceptivity(element.name))) if (!stepOperand(name)) inputs.add(name);
    }
    if (element.typeCode === GRAFCET.action) for (const action of parseActions(element.name)) outputs.add(action.name);
  }
  for (const name of outputs) inputs.delete(name);
  return { inputs: [...inputs].sort(byName), outputs: [...outputs].sort(byName) };
}

/**
 * Строки таблицы по текущему GRAFCET: все его операнды (описания сохраняются), плюс строки с описанием,
 * чьих операндов в схеме уже нет — чтобы текст не терялся.
 */
export function mergeTableRows(schema: Schema, current: readonly TableRow[]): TableRow[] {
  const { inputs, outputs } = grafcetOperands(schema);
  const text = new Map(current.map((row) => [row.name, row.text] as const));
  const rows: TableRow[] = [
    ...inputs.map((name) => ({ kind: 'I' as const, name, text: text.get(name) ?? '' })),
    ...outputs.map((name) => ({ kind: 'Q' as const, name, text: text.get(name) ?? '' })),
  ];
  for (const row of current) if (row.text && !rows.some((item) => item.name === row.name)) rows.push({ ...row });
  return rows;
}

/** Следующий номер этапа: больше всех номеров на листе. */
export function nextStepNumber(schema: Schema): string {
  const numbers = schema.elements.filter((element) => isGrafcetStep(element.typeCode))
    .map((element) => Number.parseInt(element.name, 10)).filter(Number.isFinite);
  return String(numbers.length ? Math.max(...numbers) + 1 : 1);
}

/** Поля нового элемента GRAFCET: номер этапа, пустые условие и действие, строки таблицы. */
export function grafcetPlacedFields(typeCode: number, schema: Schema): Partial<SchemaElement> {
  if (isGrafcetStep(typeCode)) return { name: nextStepNumber(schema), func: '' };
  if (typeCode === GRAFCET.table) {
    const rows = mergeTableRows(schema, []);
    const size = { w: GRAFCET_SIZES[GRAFCET.table]!.w, h: tableHeight(rows) };
    return { name: '', func: encodeTableRows(rows), size };
  }
  return { name: '', func: '' };
}
