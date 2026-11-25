/**
 * Типы, у которых в файле один код, а вариант записан в поле nums[16] (автомат 6017 и дифавтомат 6018 2D;
 * Interruptor 6019 и Seccionador 6020 2D с той же записью).
 * Внутри программы у варианта свой код; здесь перевод в обе стороны и метки клемм записи.
 */

import { AUTOMATIC_2D, DIFFERENTIAL_2D } from './realistic-2d-types';
import { SWITCH_2D_CODES, SWITCH_2D_SPECS } from './switch-2d';

export interface CadVariant {
  /** Код в файле .cad. */
  fileCode: number;
  /** Значение nums[16]. */
  param: number;
}

/** Слоты записи у 6017/6018 в образце одинаковы для всех вариантов: N 1 3 5 2 4 6 (7 флагов). */
export const VARIANT_RECORD_LABELS: readonly string[] = ['N', '1', '3', '5', '2', '4', '6'];

export const CAD_VARIANTS: Readonly<Record<number, CadVariant>> = {
  [AUTOMATIC_2D.IN]: { fileCode: 6017, param: 0 },
  [AUTOMATIC_2D.IIN]: { fileCode: 6017, param: 18 },
  [AUTOMATIC_2D.IIIN]: { fileCode: 6017, param: 9 },
  [DIFFERENTIAL_2D.IN]: { fileCode: 6018, param: 0 },
  [DIFFERENTIAL_2D.IIIN]: { fileCode: 6018, param: 9 },
  // Interruptor и Seccionador 2D: запись того же вида, варианты 9 (27×27) и 0 (51×51), switch-2d.ts.
  ...Object.fromEntries(SWITCH_2D_CODES.map((code) => {
    const { fileCode, param } = SWITCH_2D_SPECS[code]!;
    return [code, { fileCode, param }];
  })),
};

/**
 * nums[16] = вариант (0, 9, 18) + ещё одно число 0..8, оно есть у всех элементов [Actividad 1.7: у 6017 IIN там 20,
 * у 6018 IN — 2, у контакторов 2, у мотора 4]. Вариант — кратная 9 часть, остаток при записи сохраняется.
 */
export const VARIANT_STEP = 9;

/** Внутренний код по коду файла и nums[16]; неизвестный вариант — базовый код. */
export function internalVariantCode(fileCode: number, param: number): number {
  const variantParam = param - (((param % VARIANT_STEP) + VARIANT_STEP) % VARIANT_STEP);
  for (const [code, variant] of Object.entries(CAD_VARIANTS)) {
    if (variant.fileCode === fileCode && variant.param === variantParam) return Number(code);
  }
  return fileCode;
}

const VARIANT_FILE_CODES: ReadonlySet<number> = new Set(Object.values(CAD_VARIANTS).map((variant) => variant.fileCode));

export const isVariantFileCode = (code: number): boolean => VARIANT_FILE_CODES.has(code);
