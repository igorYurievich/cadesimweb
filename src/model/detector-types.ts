/**
 * Детекторы панели «Detectores / sensores»: индуктивные, ёмкостные, магнитные и приёмник барьера.
 *
 * Коды типов взяты из образца detectores.cad (CADe_SIMU): у каждого датчика блок из шести кодов, вариант
 * подключения = база + смещение: 3 провода +1, 2 провода сбоку +3, 3 провода сбоку +4 [проверено по образцу].
 * Обычные 2 провода в образце нет, для них взято смещение 0 [вывод]. Смещения клемм сняты со скриншота.
 * Излучатель барьера в образце не встречался, его код условный (15007).
 */

import type { CadTypeInfo } from './cad-types';
import type { Point, Size } from './types';

export type DetectorKind = 'inductive' | 'capacitive' | 'magnetic' | 'receiver';
export type DetectorWiring = '2' | '3' | '2-side' | '3-side';

export const DETECTOR_WIRINGS: readonly DetectorWiring[] = ['2', '3', '2-side', '3-side'];

export interface DetectorSpec {
  code: number;
  base: number;
  commandId: number;
  kind: DetectorKind;
  nc: boolean;
  wiring: DetectorWiring;
}

/** Излучатель барьера: два вывода питания как у 2-проводного датчика, без контакта. */
export const EMITTER_TYPE = 15007;

const WIRING_OFFSET: Readonly<Record<DetectorWiring, number>> = { '2': 0, '3': 1, '2-side': 3, '3-side': 4 };

const BASES: ReadonlyArray<{ base: number; commandId: number; kind: DetectorKind; nc: boolean; label: string }> = [
  { base: 7500, commandId: 33032, kind: 'inductive', nc: false, label: 'Det. inductivo NA' },
  { base: 7520, commandId: 33020, kind: 'inductive', nc: true, label: 'Det. inductivo NC' },
  { base: 7506, commandId: 33021, kind: 'capacitive', nc: false, label: 'Det. capacitivo NA' },
  { base: 7526, commandId: 33022, kind: 'capacitive', nc: true, label: 'Det. capacitivo NC' },
  { base: 7512, commandId: 33023, kind: 'magnetic', nc: false, label: 'Det. magnético NA' },
  { base: 7532, commandId: 33024, kind: 'magnetic', nc: true, label: 'Det. magnético NC' },
  { base: 7553, commandId: 33034, kind: 'receiver', nc: false, label: 'Barrera foto. receptor NA' },
  { base: 7559, commandId: 33033, kind: 'receiver', nc: true, label: 'Barrera foto. receptor NC' },
];

/**
 * Клеммы по варианту в порядке флагов записи. Сверху/снизу: + (или 1) над корпусом, − (или 2) под ним,
 * S справа. Сбоку: выводы справа от корпуса (корпус от x = −15 до −3), сверху вниз + S −.
 */
export const DETECTOR_POINTS: Readonly<Record<DetectorWiring, readonly Point[]>> = {
  '2': [{ x: 0, y: 0 }, { x: 0, y: 12 }],
  '3': [{ x: 0, y: 0 }, { x: 0, y: 12 }, { x: 9, y: 6 }],
  '2-side': [{ x: 3, y: 0 }, { x: 3, y: 6 }],
  '3-side': [{ x: 3, y: 0 }, { x: 3, y: 6 }, { x: 3, y: 3 }],
};

export const DETECTOR_LABELS: Readonly<Record<DetectorWiring, readonly string[]>> = {
  '2': ['1', '2'],
  '3': ['+', '-', 'S'],
  '2-side': ['1', '2'],
  '3-side': ['+', '-', 'S'],
};

/** Рамка записи .cad: у вариантов сверху/снизу 15×15, у боковых 9×9 (как в образце). */
export const DETECTOR_FRAMES: Readonly<Record<DetectorWiring, Size>> = {
  '2': { w: 15, h: 15 },
  '3': { w: 15, h: 15 },
  '2-side': { w: 9, h: 9 },
  '3-side': { w: 9, h: 9 },
};

const SPECS = new Map<number, DetectorSpec>(
  BASES.flatMap((item) => DETECTOR_WIRINGS.map((wiring): [number, DetectorSpec] => {
    const code = item.base + WIRING_OFFSET[wiring];
    return [code, { code, base: item.base, commandId: item.commandId, kind: item.kind, nc: item.nc, wiring }];
  })),
);

export function detectorSpec(code: number): DetectorSpec | undefined {
  return SPECS.get(code);
}

/** Все коды датчиков с контактом (все варианты подключения). */
export const DETECTOR_CODES: readonly number[] = [...SPECS.keys()];

/** Код того же датчика с другим вариантом подключения. */
export function detectorVariant(code: number, wiring: DetectorWiring): number | undefined {
  const spec = SPECS.get(code);
  return spec ? spec.base + WIRING_OFFSET[wiring] : undefined;
}

const WIRING_NOTES: Readonly<Record<DetectorWiring, string>> = {
  '2': '2 провода: 1 сверху, 2 снизу, контакт 1-2.',
  '3': '3 провода: + сверху, − снизу, выход S справа; питание +/−, контакт + → S.',
  '2-side': '2 провода сбоку: 1 и 2 справа от корпуса, контакт 1-2.',
  '3-side': '3 провода сбоку: + S − справа от корпуса; контакт + → S.',
};

export const DETECTOR_CAD_TYPES: readonly CadTypeInfo[] = [
  ...BASES.flatMap((item) => DETECTOR_WIRINGS.map((wiring): CadTypeInfo => ({
    code: item.base + WIRING_OFFSET[wiring],
    family: 'detector',
    label: `${item.label} (-B)`,
    layout: { kind: 'points', points: DETECTOR_POINTS[wiring] },
    terminalCount: DETECTOR_POINTS[wiring].length,
    // Кнопка палитры ставит вариант «2 провода» (команда принадлежит одному типу); остальные — в свойствах.
    // 'probable' и у проверенных образцом вариантов: «confirmed» требует своей команды каталога.
    commandIds: wiring === '2' ? [item.commandId] : [],
    confidence: 'probable',
    note: WIRING_NOTES[wiring],
  }))),
  {
    code: EMITTER_TYPE,
    family: 'detector',
    label: 'Barrera foto. emisor (-B)',
    layout: { kind: 'points', points: DETECTOR_POINTS['2'] },
    terminalCount: 2,
    commandIds: [33027],
    confidence: 'probable',
    note: 'Нагрузка 1-2, луч справа. В образце не встречался, код условный.',
  },
];
