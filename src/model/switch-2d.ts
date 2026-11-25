/**
 * Interruptor 6019 и Seccionador 6020 2D (кнопки 33386 и 33390). Запись как у автомата 6017: всегда слоты
 * N 1 3 5 2 4 6 (7 флагов), вариант — кратная 9 часть nums[16] (cad-variants.ts).
 *  - Вариант 9: рамка 27×27 [образец inystec2.cad: nums[16] = 10]. Его ставит кнопка палитры.
 *  - Вариант 0: рамка 51×51 [образец inystec.cad: nums[16] = 4].
 * [догадка, сверить с CADe_SIMU] Клеммы по аналогии с автоматом 6017: вариант 9 — N 1 3 5 / N 2 4 6 с шагом 6
 * (как 6017 IIIN 27×30), вариант 0 — N 1 / N 2 с шагом 12 (на скриншоте по два вывода сверху и снизу).
 * Нижние клеммы на высоте рамки − 3. Внутри программы у варианта 0 свой код (60191 / 60201).
 */

import type { CadTypeInfo } from './cad-types';

export const SWITCH_2D = { INTERRUPTOR: 6019, SECCIONADOR: 6020 } as const;
export const SWITCH_2D_LARGE = { INTERRUPTOR: 60191, SECCIONADOR: 60201 } as const;

export interface Switch2dSpec {
  fileCode: number;
  /** Вариант в nums[16]. */
  param: number;
  size: { w: number; h: number };
  /** Число полюсов, шаг между ними и y нижних клемм. */
  poles: number;
  pitch: number;
  bottom: number;
  /** На сколько клемма N правее позиции записи (левого края рамки). */
  originDx: number;
  /** Сторона квадратной панели рисунка. */
  panel: number;
  labels: readonly string[];
}

const SMALL = {
  param: 9, size: { w: 27, h: 27 }, poles: 4, pitch: 6, bottom: 24, originDx: 3, panel: 24,
  labels: ['N', '1', '3', '5', 'N', '2', '4', '6'],
} as const;
const LARGE = {
  param: 0, size: { w: 51, h: 51 }, poles: 2, pitch: 12, bottom: 48, originDx: 18, panel: 47,
  labels: ['N', '1', 'N', '2'],
} as const;

export const SWITCH_2D_SPECS: Readonly<Record<number, Switch2dSpec>> = {
  [SWITCH_2D.INTERRUPTOR]: { fileCode: 6019, ...SMALL },
  [SWITCH_2D.SECCIONADOR]: { fileCode: 6020, ...SMALL },
  [SWITCH_2D_LARGE.INTERRUPTOR]: { fileCode: 6019, ...LARGE },
  [SWITCH_2D_LARGE.SECCIONADOR]: { fileCode: 6020, ...LARGE },
};

export const SWITCH_2D_CODES: readonly number[] = Object.keys(SWITCH_2D_SPECS).map(Number);

export const isSwitch2d = (code: number): boolean => SWITCH_2D_SPECS[code] !== undefined;

export const isSeccionador2d = (code: number): boolean => SWITCH_2D_SPECS[code]?.fileCode === SWITCH_2D.SECCIONADOR;

/** x полюсов от клеммы N. */
export const switch2dPoleXs = (spec: Switch2dSpec): number[] =>
  Array.from({ length: spec.poles }, (_, k) => k * spec.pitch);

const COMMANDS: Readonly<Record<number, number>> = { [SWITCH_2D.INTERRUPTOR]: 33386, [SWITCH_2D.SECCIONADOR]: 33390 };

/** Типы .cad от клеммы N (сдвиг на originDx делает realistic-2d-types.ts). */
export const SWITCH_2D_TYPES: readonly CadTypeInfo[] = SWITCH_2D_CODES.map((code): CadTypeInfo => {
  const spec = SWITCH_2D_SPECS[code]!;
  const xs = switch2dPoleXs(spec);
  const name = spec.fileCode === SWITCH_2D.SECCIONADOR ? 'Seccionador' : 'Interruptor';
  const command = COMMANDS[code];
  return {
    code,
    family: 'switch',
    label: `${name} 2D${spec.param === 0 ? ' 51×51' : ''} (-S)`,
    layout: { kind: 'points', points: [...xs.map((x) => ({ x, y: 0 })), ...xs.map((x) => ({ x, y: spec.bottom }))] },
    terminalCount: spec.labels.length,
    commandIds: command === undefined ? [] : [command],
    confidence: 'probable',
    note: `${spec.size.w}×${spec.size.h}: ${spec.labels.join(' ')}; в файле код ${spec.fileCode}, `
      + `nums[16] = ${spec.param}.`,
  };
});

export const SWITCH_2D_ORIGIN_DX: Readonly<Record<number, number>> = Object.fromEntries(
  SWITCH_2D_CODES.map((code) => [code, SWITCH_2D_SPECS[code]!.originDx]),
);

export const SWITCH_2D_LABELS: Readonly<Record<number, readonly string[]>> = Object.fromEntries(
  SWITCH_2D_CODES.map((code) => [code, SWITCH_2D_SPECS[code]!.labels]),
);
