/**
 * Панель «Relés electrónicos y protecciones» CADe_SIMU 4.2: твердотельные реле и контакторы (SSR),
 * реле контроля фаз, защита от длительных перенапряжений и реле SPST / SPDT.
 *
 * Образец reles_electronicos.cad (Игорь, 27.11.2026): по одной кнопке панели, коды 1070–1075 и 9040–9045.
 * Метки клемм и рамки — из записей файла, смещения клемм сняты со скриншота образца
 * (10 px на единицу, сетка 3). Подробности в FORMATO_CAD.md §43.
 *
 * Семейство не 'coil': катушки панели выставляет engine/electronic-relays.ts (у 1072/1073 вход не на клеммах 0–1).
 */

import type { CadTypeInfo } from './cad-types';
import type { Point } from './types';

export const SSR_DC = 1070;
export const SSR_AC = 1071;
export const SSR_3PH = 1072;
export const SSR_REVERSING = 1073;
export const RELAY_SPST = 1074;
export const RELAY_SPDT = 1075;
export const PHASE_FAIL_N = 9040;
export const PHASE_FAIL = 9041;
export const PHASE_SEQUENCE_N = 9042;
export const PHASE_SEQUENCE = 9043;
export const OVERVOLTAGE_2P = 9044;
export const OVERVOLTAGE_4P = 9045;

export interface ElectronicRelaySpec {
  code: number;
  commandId: number;
  label: string;
  family: CadTypeInfo['family'];
  prefix: string;
  size: { w: number; h: number };
  labels: readonly string[];
  points: readonly Point[];
  /** Смещение подписи имени (nums[12..13] образца). */
  labelOffset: Point;
}

const p = (x: number, y: number): Point => ({ x, y });
const SSR_POINTS = [p(0, 0), p(6, 0), p(0, 12), p(6, 12)];
const PHASES_POINTS = [p(0, 0), p(6, 0), p(12, 0)];
const COIL_A1 = p(0, 0);
const COIL_A2 = p(0, 12);

export const ELECTRONIC_RELAY_SPECS: readonly ElectronicRelaySpec[] = [
  {
    code: SSR_DC, commandId: 33258, label: 'Relé estado sólido SSR DC', family: 'control-unit', prefix: '-K',
    size: { w: 15, h: 15 }, labels: ['A1', 'A2', '1', '2'], points: SSR_POINTS, labelOffset: p(-12, -3),
  },
  {
    code: SSR_AC, commandId: 33259, label: 'Relé estado sólido SSR AC', family: 'control-unit', prefix: '-K',
    size: { w: 15, h: 15 }, labels: ['A1', 'A2', '1', '2'], points: SSR_POINTS, labelOffset: p(-12, -3),
  },
  {
    code: SSR_3PH, commandId: 33260, label: 'Contactor de estado sólido', family: 'control-unit', prefix: '-K',
    size: { w: 27, h: 15 }, labels: ['1', '3', '5', '2', '4', '6', 'A1', 'A2'],
    points: [p(0, 0), p(6, 0), p(12, 0), p(0, 12), p(6, 12), p(12, 12), p(18, 0), p(18, 12)],
    labelOffset: p(-12, -3),
  },
  {
    code: SSR_REVERSING, commandId: 33261, label: 'Contactor inversor de estado sólido', family: 'control-unit',
    prefix: '-K', size: { w: 33, h: 15 }, labels: ['1', '3', '5', '2', '4', '6', 'A1', 'A2', 'A3'],
    points: [p(0, 0), p(6, 0), p(12, 0), p(0, 12), p(6, 12), p(12, 12), p(18, 0), p(18, 12), p(24, 0)],
    labelOffset: p(-12, -3),
  },
  {
    code: PHASE_FAIL_N, commandId: 33266, label: 'Relé de falta de fase + N', family: 'control-unit', prefix: '-K',
    size: { w: 18, h: 15 }, labels: ['L1', 'L2', 'L3', 'N'], points: [...PHASES_POINTS, p(0, 12)],
    labelOffset: p(-15, -3),
  },
  {
    code: PHASE_FAIL, commandId: 33267, label: 'Relé de falta de fase', family: 'control-unit', prefix: '-K',
    size: { w: 18, h: 15 }, labels: ['L1', 'L2', 'L3'], points: PHASES_POINTS, labelOffset: p(-15, -3),
  },
  {
    // В образце у «+ N» три флага клемм, а снизу нарисован вывод без метки: в CADe_SIMU он не клемма.
    code: PHASE_SEQUENCE_N, commandId: 33271, label: 'Relé de secuencia de fase + N', family: 'control-unit',
    prefix: '-K', size: { w: 18, h: 15 }, labels: ['L1', 'L2', 'L3'], points: PHASES_POINTS, labelOffset: p(-15, -3),
  },
  {
    code: PHASE_SEQUENCE, commandId: 33269, label: 'Relé de secuencia de fase', family: 'control-unit', prefix: '-K',
    size: { w: 18, h: 15 }, labels: ['L1', 'L2', 'L3'], points: PHASES_POINTS, labelOffset: p(-15, -3),
  },
  {
    code: OVERVOLTAGE_2P, commandId: 33344, label: 'Protección contra sobretensiones permanentes II',
    family: 'protection', prefix: '-F', size: { w: 18, h: 15 }, labels: ['1', '3', '2', '4', 'A1', 'A2'],
    points: [p(0, 0), p(6, 0), p(0, 12), p(6, 12), p(12, 0), p(12, 12)], labelOffset: p(-15, -3),
  },
  {
    // Клеммы A1/A2 трёх катушек U лежат в хвосте записи (cad-tail-terminals.ts).
    code: OVERVOLTAGE_4P, commandId: 33345, label: 'Protección contra sobretensiones permanentes IV',
    family: 'protection', prefix: '-F', size: { w: 40, h: 15 },
    labels: ['1', '3', '5', '7', '2', '4', '6', '8', 'A1', 'A2', 'A1', 'A2', 'A1', 'A2'],
    points: [
      p(0, 0), p(6, 0), p(12, 0), p(18, 0), p(0, 12), p(6, 12), p(12, 12), p(18, 12),
      p(24, 0), p(24, 12), p(30, 0), p(30, 12), p(36, 0), p(36, 12),
    ],
    labelOffset: p(-15, -3),
  },
  {
    code: RELAY_SPST, commandId: 33372, label: 'Relé SPST', family: 'relay-coil', prefix: '-K',
    size: { w: 15, h: 15 }, labels: ['A1', 'A2', '13', '14'], points: [COIL_A1, COIL_A2, p(9, 0), p(9, 12)],
    labelOffset: p(-15, -3),
  },
  {
    code: RELAY_SPDT, commandId: 33373, label: 'Relé SPDT', family: 'relay-coil', prefix: '-K',
    size: { w: 21, h: 15 }, labels: ['A1', 'A2', '12', '11', '14'],
    points: [COIL_A1, COIL_A2, p(9, 0), p(12, 12), p(15, 0)], labelOffset: p(-15, -3),
  },
];

export const ELECTRONIC_RELAY_CODES: readonly number[] = ELECTRONIC_RELAY_SPECS.map((spec) => spec.code);

const BY_CODE = new Map(ELECTRONIC_RELAY_SPECS.map((spec) => [spec.code, spec] as const));

export function electronicRelaySpec(code: number): ElectronicRelaySpec | undefined {
  return BY_CODE.get(code);
}

export function isElectronicRelay(code: number): boolean {
  return BY_CODE.has(code);
}

/** Строки таблицы типов .cad (cad-types.ts). */
export const ELECTRONIC_RELAY_CAD_TYPES: readonly CadTypeInfo[] = ELECTRONIC_RELAY_SPECS.map((spec) => ({
  code: spec.code,
  family: spec.family,
  label: spec.label,
  layout: { kind: 'points', points: spec.points },
  terminalCount: spec.labels.length,
  commandIds: [spec.commandId],
  confidence: 'confirmed',
  note: 'Образец reles_electronicos.cad; смещения клемм сняты со скриншота (FORMATO_CAD §43).',
}));
