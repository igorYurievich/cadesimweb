import type { CadTypeInfo } from './cad-types';

// ── ПЛК Siemens S7-1200, CPU 1214C AC/DC/RLY — настоящий код CADe_SIMU 4.2 (10203) ─────────────────────────
// Запись из файлов CADe_SIMU (курс «Desafío Ladder», tests/fixtures/s7-1214): имя «PLC», подписи клемм пустые,
// рамка 165×141 со смещением (−3, −3), после чисел — IP-адрес «192.128.000.001» (хвост записи, сохраняем как есть).
// Клеммы сняты с проводов этих файлов и фото CADe_SIMU (шаг 6):
//  сверху (y = 0): L1 N ⏚ (9 15 21), L+ M — выход 24 V DC для датчиков (27 33), 1M (39), DI a .0….7 (45…87),
//    DI b .0….5 (93…123), аналоговые входы 2M 0 1 (129 135 141);
//  снизу (y = 138): релейные выходы 1L (81), DQ a .0….4 (87…111), 2L (117), .5 .6 .7 (123…135), DQ b .0 .1 (141 147).
// Питание CPU — 120/240 V AC на L1 / N. Выход Qx.y — сухой контакт реле: 1L–Q0.0…Q0.4, 2L–Q0.5…Q1.1.

export const S7_1214 = 10203;

/** Индексы клемм: 0 L1, 1 N, 2 PE, 3 L+, 4 M, 5 1M, 6…19 входы, 20…22 AI; 23 1L, 24…28 и 30…34 выходы, 29 2L. */
export const S7_1214_INDEX = {
  L1: 0, N: 1, SENSOR_PLUS: 3, SENSOR_MINUS: 4, INPUT_COMMON: 5, FIRST_INPUT: 6,
  OUTPUT_COMMON_1: 23, OUTPUT_COMMON_2: 29,
} as const;

const step = (count: number, from: number): number[] => Array.from({ length: count }, (_, k) => from + 6 * k);
const TOP_X = step(23, 9);
const BOTTOM_X = step(12, 81);

export const S7_1214_POINTS = [
  ...TOP_X.map((x) => ({ x, y: 0 })),
  ...BOTTOM_X.map((x) => ({ x, y: 138 })),
];

const dots = (count: number): string[] => Array.from({ length: count }, (_, k) => `.${k}`);

export const S7_1214_LABELS: readonly string[] = [
  'L1', 'N', 'PE', 'L+', 'M', '1M', ...dots(8), ...dots(6), '2M', '0', '1',
  '1L', ...dots(5), '2L', '.5', '.6', '.7', '.0', '.1',
];

/** Выходы реле: клемма выхода и её общий (1L или 2L), по порядку Q0.0…Q0.7, Q1.0, Q1.1. */
export const S7_1214_OUTPUT_TERMINALS: readonly { common: number; terminal: number }[] = [
  ...step(5, 0).map((_, k) => ({ common: S7_1214_INDEX.OUTPUT_COMMON_1, terminal: 24 + k })),
  ...step(5, 0).map((_, k) => ({ common: S7_1214_INDEX.OUTPUT_COMMON_2, terminal: 30 + k })),
];

export const S7_1214_SIZE = { w: 165, h: 141 } as const;

export const S7_1214_CAD_TYPE: CadTypeInfo = {
  code: S7_1214, family: 'control-unit', label: 'PLC S7-1200 (CPU 1214C AC/DC/RLY)',
  layout: { kind: 'points', points: S7_1214_POINTS }, terminalCount: S7_1214_POINTS.length,
  commandIds: [], confidence: 'probable',
  note: '165×141: сверху L1 N PE L+ M 1M I0.0…I1.5 2M AI0 AI1, снизу 1L Q0.0…Q0.4 2L Q0.5…Q1.1; хвост — IP-адрес.',
};
