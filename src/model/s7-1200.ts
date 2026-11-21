import type { CadTypeInfo } from './cad-types';

// ── ПЛК Siemens S7-1200, CPU 1215C DC/DC/DC (кнопка палитры 33240 «PLC S7-1200») ───────────────────────
// По фото пользователя. Своего образца .cad с S7-1200 нет, поэтому код типа свой (10230, только веб): запись
// CADe_SIMU для этой кнопки не разгадана, при чтении такого файла элемент будет неизвестным.
// Клеммы как у настоящего 1215C (без аналоговых AI / AQ): сверху питание L+ M, общий входов 1M, входы DI a
// I0.0…I0.7 и DI b I1.0…I1.5; снизу питание выходов 4L+ 4M, выходы DQ a Q0.0…Q0.7 и DQ b Q1.0 Q1.1.
// Входы — «+24 V относительно 1M», выходы — транзисторные: Qx соединяется с 4L+, пока операнд Qx включён.
// Программа — Ladder на листе (шины «+» / «−», контакты I0.0…, катушки Q0.0…), как у LOGO.

export const S7_1200 = 10230;
export const S7_1200_COMMAND = 33240;

export const S7_INPUTS: readonly string[] = [
  ...Array.from({ length: 8 }, (_, k) => `I0.${k}`), ...Array.from({ length: 6 }, (_, k) => `I1.${k}`),
];
export const S7_OUTPUTS: readonly string[] = [
  ...Array.from({ length: 8 }, (_, k) => `Q0.${k}`), 'Q1.0', 'Q1.1',
];

/** Индексы клемм: 0 L+, 1 M, 2 1M, 3…16 входы; 17 4L+, 18 4M, 19…28 выходы. */
export const S7_INDEX = {
  L: 0, M: 1, INPUT_COMMON: 2, FIRST_INPUT: 3, OUTPUT_SUPPLY: 17, OUTPUT_COMMON: 18, FIRST_OUTPUT: 19,
} as const;

export const S7_LABELS: readonly string[] = [
  'L+', 'M', '1M', ...S7_INPUTS.map((name) => `.${name.slice(3)}`),
  '4L+', '4M', ...S7_OUTPUTS.map((name) => `.${name.slice(3)}`),
];

/** Шаг клемм 6; между группами промежуток в одну клетку, как пустые места на клеммниках CPU. */
const step = (count: number, from: number): number[] => Array.from({ length: count }, (_, k) => from + 6 * k);
const TOP_X = [9, 15, 27, ...step(8, 39), ...step(6, 93)];
const BOTTOM_X = [9, 15, ...step(8, 27), 81, 87];

export const S7_POINTS = [
  ...TOP_X.map((x) => ({ x, y: 0 })),
  ...BOTTOM_X.map((x) => ({ x, y: 102 })),
];

export const S7_SIZE = { w: 141, h: 105 } as const;

export const S7_1200_CAD_TYPE: CadTypeInfo = {
  code: S7_1200, family: 'control-unit', label: 'PLC S7-1200 (CPU 1215C DC/DC/DC)',
  layout: { kind: 'points', points: S7_POINTS }, terminalCount: S7_POINTS.length,
  commandIds: [S7_1200_COMMAND], confidence: 'probable',
  note: 'Только веб: 141×105, сверху L+ M 1M I0.0…I1.5, снизу 4L+ 4M Q0.0…Q1.1; программа — Ladder на листе.',
};
