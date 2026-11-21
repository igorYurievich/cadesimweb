/**
 * Преобразователь частоты (variador de velocidad c.a.) — только веб-логика поверх символов CADe_SIMU.
 *  - Силовая часть: 1054 «Variador c.a. II» (вход L1 N, однофазная сеть) и 1055 «Variador c.a. III» (вход L1 L2 L3);
 *    выход U V W на двигатель.
 *  - Управление: 1056 «Control Variador c.a.» с тем же именем (-G1 ↔ -G1): входы I1…I4, внутренние «+» 24 V и 0V,
 *    реле RA–RC (замкнуто, пока привод выдаёт частоту).
 *      I1 — пуск вперёд, I2 — пуск назад (оба сразу — стоп);
 *      I3 / I4 / I3+I4 — фиксированные частоты 1, 2, 3; без них — консигна AI («потенциометр»).
 *    Вход активен, когда на нём «+»: перемычка или контакт от «+» самого блока, либо внешний источник 24 V.
 *  - Частота разгоняется и тормозится по рампам; двигатель на выходе крутится со скоростью, пропорциональной частоте.
 * Настройки — в params блока управления; фиксированные частоты и рампы пишутся в хвост записи .cad (§35 FORMATO).
 */

import type { CadTypeInfo } from './cad-types';
import type { Schema, SchemaElement } from './types';

export const VFD_DRIVE_II = 1054;
export const VFD_DRIVE_III = 1055;
export const VFD_CONTROL = 1056;
/**
 * Преобразователь частоты 2D (только веб, кнопка 34009): трёхфазный, силовая часть и управление в одном корпусе,
 * со своей панелью — RUN / STOP, ▲ / ▼ и ручка задания частоты работают в симуляции.
 */
export const VFD_2D = 10240;
export const VFD_2D_COMMAND = 34009;
/**
 * Преобразователь частоты 2D с однофазным входом (только веб, кнопка 34010): вход L N 230 V, выход U V W 3×230 V.
 * Панель как у 2D: RUN, STOP/RESET, ▲ / ▼, ручка, плюс REV/JOG — направление при пуске с панели.
 */
export const VFD_2D_1PH = 10241;
export const VFD_2D_1PH_COMMAND = 34010;
/** Преобразователи 2D (силовая часть и управление в одном корпусе, своя панель). */
export const isVfd2d = (type: number): boolean => type === VFD_2D || type === VFD_2D_1PH;
export const isVfdDrive = (type: number): boolean => type === VFD_DRIVE_II || type === VFD_DRIVE_III || isVfd2d(type);
/** Блок, у которого есть входы управления: 1056 или сам 2D-преобразователь. */
export const isVfdControl = (type: number): boolean => type === VFD_CONTROL || isVfd2d(type);

/** Клеммы силовой части: входы питания и выход U V W. */
export const VFD_POWER_INDEX: Readonly<Record<number, { inputs: readonly number[]; outputs: readonly [number, number, number] }>> = {
  [VFD_DRIVE_II]: { inputs: [0, 1], outputs: [3, 4, 5] },
  [VFD_DRIVE_III]: { inputs: [0, 1, 2], outputs: [4, 5, 6] },
  [VFD_2D]: { inputs: [0, 1, 2], outputs: [4, 5, 6] },
  [VFD_2D_1PH]: { inputs: [0, 1], outputs: [3, 4, 5] },
};

/** Клеммы входов и реле блока управления (порядок клемм элемента). */
export interface VfdControlIndex {
  RA: number; RC: number; I1: number; I2: number; I3: number; I4: number; PLUS: readonly number[]; ZERO: number;
}
/** 1056: RA RC I1 I2 I3 I4 + / R+ R- + AI 0V AO. */
export const VFD_CONTROL_INDEX: VfdControlIndex = { RA: 0, RC: 1, I1: 2, I2: 3, I3: 4, I4: 5, PLUS: [6, 9], ZERO: 11 };

/**
 * 2D: сверху R S T PE, снизу U V W PE, справа реле TA TC, «+24» V, входы X1…X4 и общий COM (0 V).
 * X1 — вперёд, X2 — назад, X3 / X4 / X3+X4 — фиксированные частоты (как I1…I4 у 1056).
 */
export const VFD_2D_LABELS: readonly string[] = ['R', 'S', 'T', 'PE', 'U', 'V', 'W', 'PE', 'TA', 'TC', '+24', 'X1', 'X2', 'X3', 'X4', 'COM'];
export const VFD_2D_INDEX: VfdControlIndex = { RA: 8, RC: 9, I1: 11, I2: 12, I3: 13, I4: 14, PLUS: [10], ZERO: 15 };
export const VFD_2D_SIZE = { w: 48, h: 90 } as const;
export const VFD_2D_POINTS = [
  { x: 6, y: 0 }, { x: 12, y: 0 }, { x: 18, y: 0 }, { x: 30, y: 0 },
  { x: 6, y: 90 }, { x: 12, y: 90 }, { x: 18, y: 90 }, { x: 30, y: 90 },
  { x: 45, y: 18 }, { x: 45, y: 24 }, { x: 45, y: 36 }, { x: 45, y: 42 }, { x: 45, y: 48 }, { x: 45, y: 54 },
  { x: 45, y: 60 }, { x: 45, y: 66 },
];
export const VFD_2D_CAD_TYPE: CadTypeInfo = {
  code: VFD_2D, family: 'drive', label: 'Variador de frecuencia 2D (-G)',
  layout: { kind: 'points', points: VFD_2D_POINTS }, terminalCount: VFD_2D_POINTS.length,
  commandIds: [VFD_2D_COMMAND], confidence: 'probable',
  note: 'Только веб: 48×90, сверху R S T PE, снизу U V W PE, справа TA TC +24 X1…X4 COM; панель RUN/STOP/▲/▼ и ручка.',
};

/** Однофазный 2D: сверху L N PE, снизу U V W PE, справа те же TA TC +24 X1…X4 COM. */
export const VFD_2D_1PH_LABELS: readonly string[] = ['L', 'N', 'PE', 'U', 'V', 'W', 'PE', 'TA', 'TC', '+24', 'X1', 'X2', 'X3', 'X4', 'COM'];
export const VFD_2D_1PH_INDEX: VfdControlIndex = { RA: 7, RC: 8, I1: 10, I2: 11, I3: 12, I4: 13, PLUS: [9], ZERO: 14 };
export const VFD_2D_1PH_POINTS = [
  { x: 6, y: 0 }, { x: 12, y: 0 }, { x: 30, y: 0 },
  { x: 6, y: 90 }, { x: 12, y: 90 }, { x: 18, y: 90 }, { x: 30, y: 90 },
  ...VFD_2D_POINTS.slice(8),
];
export const VFD_2D_1PH_CAD_TYPE: CadTypeInfo = {
  code: VFD_2D_1PH, family: 'drive', label: 'Variador de frecuencia monofásico 2D (-G)',
  layout: { kind: 'points', points: VFD_2D_1PH_POINTS }, terminalCount: VFD_2D_1PH_POINTS.length,
  commandIds: [VFD_2D_1PH_COMMAND], confidence: 'probable',
  note: 'Только веб: 48×90, сверху L N PE (1×230 V), снизу U V W PE (3×230 V), справа TA TC +24 X1…X4 COM; REV/JOG на панели.',
};

export const vfdControlIndex = (control: SchemaElement): VfdControlIndex =>
  control.typeCode === VFD_2D ? VFD_2D_INDEX : control.typeCode === VFD_2D_1PH ? VFD_2D_1PH_INDEX : VFD_CONTROL_INDEX;

export interface VfdSettings {
  /** Консигна AI (потенциометр), Гц: частота без фиксированных скоростей. */
  aiHz: number;
  /** Фиксированные частоты: I3, I4, I3+I4, Гц. */
  preset1: number;
  preset2: number;
  preset3: number;
  /** Время разгона 0 → 50 Гц и торможения 50 → 0 Гц, с. */
  rampUp: number;
  rampDown: number;
}

export const VFD_NOMINAL_HZ = 50;
export const VFD_MAX_HZ = 100;
export const VFD_DEFAULTS: Readonly<VfdSettings> = { aiHz: 50, preset1: 10, preset2: 25, preset3: 50, rampUp: 5, rampDown: 5 };

/** Хвост записи 1056 в образце CADe_SIMU: «1-0-0-001-200-010-025-050-05-05-00-0». Поля 5–7 — частоты, 8–9 — рампы. */
export const VFD_CONTROL_TAIL = '1-0-0-001-200-010-025-050-05-05-00-0';
const TAIL_FIELDS: ReadonlyArray<[keyof VfdSettings, number, number]> = [
  ['preset1', 5, 3], ['preset2', 6, 3], ['preset3', 7, 3], ['rampUp', 8, 2], ['rampDown', 9, 2],
];

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const numberOr = (value: unknown, fallback: number): number => {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  return Number.isFinite(n) ? n : fallback;
};

/** Поле 10 хвоста у 2D-преобразователя (только веб, 3 цифры) — задание частоты с панели / ручки, Гц. */
const AI_FIELD: [keyof VfdSettings, number, number] = ['aiHz', 10, 3];

/** Значения из хвоста записи .cad (то, что CADe_SIMU записал в файл), без params. withAi — у 2D (поле 10). */
export function vfdSettingsFromTail(tail: string | undefined, withAi = false): Partial<VfdSettings> {
  if (!tail) return {};
  const parts = tail.split('-');
  const result: Partial<VfdSettings> = {};
  for (const [key, index] of withAi ? [...TAIL_FIELDS, AI_FIELD] : TAIL_FIELDS) {
    const n = Number(parts[index]);
    if (parts[index] !== undefined && /^\d+$/.test(parts[index] as string) && Number.isFinite(n)) result[key] = n;
  }
  return result;
}

/** Хвост записи с настройками блока: неизвестные поля образца не трогаем. */
export function vfdTailWithSettings(tail: string | undefined, settings: VfdSettings, withAi = false): string {
  const parts = (tail && tail.split('-').length >= 10 ? tail : VFD_CONTROL_TAIL).split('-');
  for (const [key, index, width] of withAi ? [...TAIL_FIELDS, AI_FIELD] : TAIL_FIELDS) {
    parts[index] = String(Math.round(clamp(settings[key], 0, width === 3 ? 999 : 99))).padStart(width, '0');
  }
  return parts.join('-');
}

/** Настройки блока управления: params → хвост записи .cad → значения по умолчанию. */
export function vfdSettings(control: SchemaElement | undefined): VfdSettings {
  const fromTail = vfdSettingsFromTail(control?.raw?.tail, isVfd2d(control?.typeCode ?? 0));
  const p = control?.params ?? {};
  const pick = (key: keyof VfdSettings, max: number): number =>
    clamp(numberOr(p[`vfd_${key}`], fromTail[key] ?? VFD_DEFAULTS[key]), 0, max);
  return {
    aiHz: pick('aiHz', VFD_MAX_HZ),
    preset1: pick('preset1', VFD_MAX_HZ),
    preset2: pick('preset2', VFD_MAX_HZ),
    preset3: pick('preset3', VFD_MAX_HZ),
    rampUp: pick('rampUp', 99),
    rampDown: pick('rampDown', 99),
  };
}

const sameName = (a: SchemaElement, b: SchemaElement): boolean => {
  const name = a.name.trim().toLocaleUpperCase();
  return name !== '' && name === b.name.trim().toLocaleUpperCase();
};

/** Блок управления привода: 1056 с тем же именем. */
export const vfdControlFor = (schema: Schema, drive: SchemaElement): SchemaElement | undefined =>
  isVfd2d(drive.typeCode) ? drive
    : schema.elements.find((candidate) => candidate.typeCode === VFD_CONTROL && sameName(candidate, drive));

/** Силовая часть блока управления: 1054/1055 с тем же именем. */
export const vfdDriveFor = (schema: Schema, control: SchemaElement): SchemaElement | undefined =>
  isVfd2d(control.typeCode) ? control
    : schema.elements.find((candidate) => (candidate.typeCode === VFD_DRIVE_II || candidate.typeCode === VFD_DRIVE_III)
      && sameName(candidate, control));

/** Операнды привода в карте катушек релейного цикла: питание, команды вперёд/назад, выбор частот. */
export type VfdSignal = 'ON' | 'F' | 'R' | 'P1' | 'P2';
export const vfdKey = (drive: SchemaElement, signal: VfdSignal): string => `@VFD${drive.id}:${signal}`;
export const VFD_SIGNALS: readonly VfdSignal[] = ['ON', 'F', 'R', 'P1', 'P2'];
