import type { CadTypeInfo } from './cad-types';
import { PLC_BLOCK_LABELS, PLC_BLOCK_TYPES } from './plc-blocks';
import { DM8_LABELS, DM8_POINTS, LOGO_DM8 } from './plc-modules';

// ── LOGO! и элементы Ladder (панели «Entrada/Salida, PLC» и «Ladder») ─────────────────────────────
// Образец CADe_S1.cad (пуск/реверс мотора через LOGO): запись `*14*10202#LOGO#…*18*66*…*87*105*3*…#192.128.0.1`
// — флагов и меток клемм нет, после записи стоит IP-адрес модуля. Клеммы сняты по проводам образца
// и скриншоту пользователя (5 px на единицу): сверху P1 P2 I1…I8 на y = 0, снизу пары Q1…Q4 на y = 102.
// Ladder: контакты 10050 (NA) и 10051 (NC), катушка 10060 («Asignar») — 15×9, выводы (0, 0) и (12, 0),
// имя элемента — операнд (I1, Q2, M1…), подписи над символом (смещение −3, −9).

export const LOGO_TYPE = 10202;
export const LADDER_NO = 10050;
export const LADDER_NC = 10051;
export const LADDER_COIL = 10060;

/** IP-адрес из образца: CADe_SIMU пишет его после записи модуля. */
export const LOGO_DEFAULT_IP = '192.128.0.1';

export const LOGO_INPUTS = ['I1', 'I2', 'I3', 'I4', 'I5', 'I6', 'I7', 'I8'] as const;
export const LOGO_OUTPUTS = ['Q1', 'Q2', 'Q3', 'Q4'] as const;

/** Индексы клемм: 0 P1 (L), 1 P2 (N), 2…9 I1…I8, затем выходы парами 1-2: Q1 10-11 … Q4 16-17. */
export const LOGO_POWER = { L: 0, N: 1 } as const;
export const logoInputIndex = (k: number): number => 2 + k;
export const logoOutputPair = (k: number): [number, number] => [10 + 2 * k, 11 + 2 * k];

const INPUT_X = [24, 30, 36, 42, 54, 60, 66, 72];
const OUTPUT_X = [12, 30, 48, 66];
const LOGO_POINTS = [
  { x: 12, y: 0 }, { x: 18, y: 0 },
  ...INPUT_X.map((x) => ({ x, y: 0 })),
  ...OUTPUT_X.flatMap((x) => [{ x, y: 102 }, { x: x + 6, y: 102 }]),
];

export const LOGO_LABELS: readonly string[] = [
  'P1', 'P2', ...LOGO_INPUTS, ...LOGO_OUTPUTS.flatMap((q) => [`${q}.1`, `${q}.2`]),
];
const LADDER_LABELS: readonly string[] = ['', ''];
const LADDER_POINTS = { kind: 'points', points: [{ x: 0, y: 0 }, { x: 12, y: 0 }] } as const;

/** Клеммы без флагов в записи: постоянные метки по типу. */
export const PLC_FIXED_LABELS: Readonly<Record<number, readonly string[]>> = {
  [LOGO_TYPE]: LOGO_LABELS, [LOGO_DM8]: DM8_LABELS,
  [LADDER_NO]: LADDER_LABELS, [LADDER_NC]: LADDER_LABELS, [LADDER_COIL]: LADDER_LABELS,
  ...PLC_BLOCK_LABELS,
};

export const isPlcFixedType = (typeCode: number): boolean => typeCode in PLC_FIXED_LABELS;
export const isLadderType = (typeCode: number): boolean =>
  typeCode !== LOGO_TYPE && typeCode !== LOGO_DM8 && typeCode in PLC_FIXED_LABELS;

export const PLC_TYPES: readonly CadTypeInfo[] = [
  {
    code: LOGO_DM8, family: 'plc', label: 'LOGO! DM8 4DI/4DO (LOGO)',
    layout: { kind: 'points', points: DM8_POINTS }, terminalCount: DM8_POINTS.length,
    commandIds: [33336], confidence: 'probable',
    note: 'Расширение 54×105: P1 P2 I1…I4 сверху, Q1…Q4 снизу; адреса продолжают базовый LOGO (plc-modules.ts).',
  },
  // Провода образца: в расчёте как провод фазы (WIRE_KIND в cad-types.ts).
  {
    code: 4018, family: 'wire', label: 'Cable positivo', layout: { kind: 'none' }, commandIds: [33035],
    confidence: 'probable', note: 'Шина «+» Ladder в CADe_S1.cad.',
  },
  {
    code: 4019, family: 'wire', label: 'Cable color', layout: { kind: 'none' }, commandIds: [33229],
    confidence: 'probable', note: 'Все провода CADe_S1.cad.',
  },
  {
    code: LOGO_TYPE, family: 'plc', label: 'LOGO! 8DI/4DO (LOGO)',
    layout: { kind: 'points', points: LOGO_POINTS }, terminalCount: LOGO_POINTS.length,
    commandIds: [33238], confidence: 'probable',
    note: '87×105: P1 P2 I1…I8 сверху, выходы Q1…Q4 (контакты 1-2) снизу; клеммы сняты по проводам CADe_S1.cad.',
  },
  {
    code: LADDER_NO, family: 'aux-contact', label: 'Ladder: contacto NA', layout: LADDER_POINTS, terminalCount: 2,
    commandIds: [33062], confidence: 'probable', note: '15×9: замкнут, пока операнд (имя: I1, Q1, M1…) включён.',
  },
  {
    code: LADDER_NC, family: 'aux-contact', label: 'Ladder: contacto NC', layout: LADDER_POINTS, terminalCount: 2,
    commandIds: [33063], confidence: 'probable', note: '15×9: разомкнут, пока операнд включён.',
  },
  {
    code: LADDER_COIL, family: 'coil', label: 'Ladder: asignar (bobina)', layout: LADDER_POINTS, terminalCount: 2,
    commandIds: [33067], confidence: 'probable', note: '15×9: включает операнд (Q1, M1…), когда до неё дошла шина.',
  },
  ...PLC_BLOCK_TYPES,
];
