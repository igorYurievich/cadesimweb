import type { CadTypeInfo } from './cad-types';
import type { CadRecord } from './cad-format';
import type { SchemaElement } from './types';

// ── Остальные элементы Ladder (образец ladder.cad, по одной кнопке панели «Ladder») ──────────────────
// Контакты 15×9 с выводами (0, 0) и (12, 0): фронт нарастания 10052, фронт спада 10053, First Scan 10076
// (имя «FIRST», функция «SCAN», nums[20] = 1). Катушки 15×9: Set 10061, Reset 10062.
// Функциональные блоки (входы слева на x = 0 с шагом 6, выход справа на x = 15; корпус x 3…12, y −3…h−6):
//   10064 Biestable 21×15: S (0,0) R (0,6) → Q (15,6);          texts: S R Q
//   10065 Divisor binario 21×15: IN (0,0) → Q (15,6);           texts: S R Q
//   10066 / 10081 / 10067 / 10068 — таймеры TON / TP / TOF / intermitente 21×15: IN (0,0) → Q (15,6);
//         texts: IN Q <шкала> <время>
//   10069 Generador de impulsos 21×15: IN → Q; texts: IN Q <шкала> <время вкл.> <шкала> <время выкл.>
//   10063 Contador 21×21: R (0,0) C (0,6) D (0,12) → Q (15,12); texts: R C D Q <PV> <0>, nums[0] = 1
//   10075 Contador ascendente-descendente 21×33: CU (0,0) CD (0,6) R (0,12) LD (0,18) → Q (15,24);
//         texts: + - R Q <PV> <0> L
// Клеммы сняты со скриншота пользователя (5 px на единицу, по выводам). Шкала времени в образцах всегда 0,
// время считаем в секундах (как у таймеров 9004, cad-delay-blocks.ts).

export const LADDER_RISE = 10052;
export const LADDER_FALL = 10053;
export const LADDER_FIRST_SCAN = 10076;
export const LADDER_SET = 10061;
export const LADDER_RESET = 10062;

/** Контакты и катушки Ladder из этого образца (рисунок как у NA / NC и катушки). */
export const LADDER_EXTRA = [LADDER_RISE, LADDER_FALL, LADDER_FIRST_SCAN, LADDER_SET, LADDER_RESET];

export const PLC_BLOCK = {
  bistable: 10064, divider: 10065, ton: 10066, tp: 10081, tof: 10067, blink: 10068, pulse: 10069,
  counter: 10063, updown: 10075,
} as const;

export const PLC_TIMER_TYPES: ReadonlySet<number> = new Set([10066, 10081, 10067, 10068, 10069]);
export const PLC_COUNTER_TYPES: ReadonlySet<number> = new Set([10063, 10075]);
// Множество, а не Object.values на каждый вызов: проверка идёт для каждого элемента в каждом кадре.
const PLC_BLOCK_CODES: ReadonlySet<number> = new Set(Object.values(PLC_BLOCK));
export const isPlcBlock = (typeCode: number): boolean => PLC_BLOCK_CODES.has(typeCode);

interface BlockSpec { inputs: number; output: number; h: number; texts: (e: SchemaElement) => string[] }

const time = (e: SchemaElement, key: 'time' | 'time2'): string => String(e.params[key] ?? 1);
const scale = (e: SchemaElement, key: 'scale' | 'scale2'): string => String(e.params[key] ?? 0);
const timer: BlockSpec = { inputs: 1, output: 6, h: 15, texts: (e) => ['IN', 'Q', scale(e, 'scale'), time(e, 'time')] };

/** Входы (по порядку клемм), смещение выхода по y, высота рамки и тексты записи после имени и функции. */
export const BLOCK_SPECS: Readonly<Record<number, BlockSpec>> = {
  10064: { inputs: 2, output: 6, h: 15, texts: () => ['S', 'R', 'Q'] },
  10065: { inputs: 1, output: 6, h: 15, texts: () => ['S', 'R', 'Q'] },
  10066: timer, 10081: timer, 10067: timer, 10068: timer,
  10069: {
    inputs: 1, output: 6, h: 15,
    texts: (e) => ['IN', 'Q', scale(e, 'scale'), time(e, 'time'), scale(e, 'scale2'), time(e, 'time2')],
  },
  10063: { inputs: 3, output: 12, h: 21, texts: (e) => ['R', 'C', 'D', 'Q', String(e.params.preset ?? 0), '0'] },
  10075: { inputs: 4, output: 24, h: 33, texts: (e) => ['+', '-', 'R', 'Q', String(e.params.preset ?? 0), '0', 'L'] },
};

/** Параметры блока из текстов записи (texts[2…] после имени и функции). */
export function plcBlockParams(typeCode: number, texts: readonly string[]): Record<string, number> {
  const n = (index: number, fallback: number): number => {
    const value = Number(texts[index]);
    return texts[index] !== undefined && texts[index] !== '' && Number.isFinite(value) ? value : fallback;
  };
  if (PLC_TIMER_TYPES.has(typeCode)) {
    const params: Record<string, number> = { scale: n(4, 0), time: n(5, 1) };
    if (typeCode === PLC_BLOCK.pulse) Object.assign(params, { scale2: n(6, 0), time2: n(7, 1) });
    return params;
  }
  if (PLC_COUNTER_TYPES.has(typeCode)) return { preset: n(6, 0) };
  return {};
}

const blockPoints = (spec: BlockSpec) => [
  ...Array.from({ length: spec.inputs }, (_, k) => ({ x: 0, y: 6 * k })), { x: 15, y: spec.output },
];

const LABELS: Readonly<Record<number, string>> = {
  10052: 'Ladder: flanco ascendente', 10053: 'Ladder: flanco descendente', 10076: 'Ladder: First Scan',
  10061: 'Ladder: Set', 10062: 'Ladder: Reset', 10064: 'Ladder: biestable', 10065: 'Ladder: divisor binario',
  10066: 'Ladder: temporizador conexión', 10081: 'Ladder: temporizador pulso conexión',
  10067: 'Ladder: temporizador desconexión', 10068: 'Ladder: temporizador intermitente',
  10069: 'Ladder: generador de impulsos', 10063: 'Ladder: contador', 10075: 'Ladder: contador ascendente-descendente',
};
const COMMANDS: Readonly<Record<number, number>> = {
  10052: 33065, 10053: 33066, 10076: 33291, 10061: 33069, 10062: 33070, 10064: 33100, 10065: 33111,
  10066: 33099, 10081: 33300, 10067: 33112, 10068: 33114, 10069: 33226, 10063: 33097, 10075: 33277,
};
const TWO_POINTS = { kind: 'points', points: [{ x: 0, y: 0 }, { x: 12, y: 0 }] } as const;

type Family = CadTypeInfo['family'];
const info = (code: number, family: Family, layout: CadTypeInfo['layout'], count: number): CadTypeInfo => ({
  code, family, label: LABELS[code] ?? String(code), layout, terminalCount: count,
  commandIds: [COMMANDS[code] ?? 0].filter((id) => id !== 0), confidence: 'probable',
  note: 'Образец ladder.cad, клеммы сняты со скриншота (plc-blocks.ts).',
});

export const PLC_BLOCK_TYPES: readonly CadTypeInfo[] = [
  ...[LADDER_RISE, LADDER_FALL, LADDER_FIRST_SCAN].map((code) => info(code, 'aux-contact', TWO_POINTS, 2)),
  ...[LADDER_SET, LADDER_RESET].map((code) => info(code, 'plc-coil', TWO_POINTS, 2)),
  ...Object.entries(BLOCK_SPECS).map(([code, spec]) =>
    info(Number(code), 'plc-block', { kind: 'points', points: blockPoints(spec) }, spec.inputs + 1)),
];

/** Метки клемм (пустые: подписи рисует символ) для типов без флагов в записи. */
export const PLC_BLOCK_LABELS: Readonly<Record<number, readonly string[]>> = Object.fromEntries(
  PLC_BLOCK_TYPES.map((type) => [type.code, Array.from({ length: type.terminalCount ?? 0 }, () => '')]),
);

/** Размер рамки при размещении. */
export const plcBlockSize = (typeCode: number): { w: number; h: number } =>
  BLOCK_SPECS[typeCode] ? { w: 21, h: BLOCK_SPECS[typeCode].h } : { w: 15, h: 9 };

/** Тексты и признаки записи блока Ladder при сохранении (тексты после имени и функции уже очищены). */
export function writePlcBlockRecord(record: CadRecord, element: SchemaElement, created: boolean, shift: number): void {
  const spec = BLOCK_SPECS[element.typeCode];
  spec?.texts(element).forEach((value, index) => { record.texts[2 + index] = value; });
  // Флаг nums[0] у счётчика стоит в образце (смысл неизвестен), флаги перед этим очищены — ставим всегда.
  if (element.typeCode === PLC_BLOCK.counter) record.nums[0] = 1;
  if (created && element.typeCode === LADDER_FIRST_SCAN) record.nums[20 + shift] = 1;
}
