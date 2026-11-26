/**
 * Клемма 2D «Borna» 4011 (кнопка 33319 панели «Símbolos realistas — barra A»), образец borneras.cad из CADe_SIMU 4.2:
 * `4011#-X#########*0*0*0*0*0*0*0*0*x*y*0*0*-12*-3*6*15*<цвет>*0*0*1*0*0*0`. Флагов и текстов нет, рамка 6×15,
 * смещение подписи −12, −3. Три клеммы образца отличаются только nums[16]: 2 — серая (фаза), 3 — синяя (N),
 * 4 — жёлто-зелёная (PE) [скриншот пользователя]. Другие значения сохраняются как есть и рисуются серой.
 * [догадка, сверить по схеме с проводами] Позиция записи — левый край (у пилота 8101 так не оказалось, см. §25),
 * вывод по центру (+3), верхний на y = 0, нижний на высоте рамки − 3 = 12. Внутри клемма — перемычка.
 */

import type { CadTypeInfo } from './cad-types';

export const TERMINAL_2D = 4011;
export const TERMINAL_2D_COMMAND = 33319;
export const TERMINAL_2D_SIZE = { w: 6, h: 15 } as const;
export const TERMINAL_2D_LABELS: readonly string[] = ['1', '2'];
/** На сколько вывод правее позиции записи (левого края рамки). */
export const TERMINAL_2D_ORIGIN_DX = 3;
export const TERMINAL_2D_BOTTOM = TERMINAL_2D_SIZE.h - 3;

export const TERMINAL_COLOR = { phase: 2, neutral: 3, pe: 4 } as const;
export type TerminalColorName = keyof typeof TERMINAL_COLOR;

export const isTerminal2d = (code: number): boolean => code === TERMINAL_2D;

/** Значение nums[16] клеммы (params.terminalColor), по умолчанию серая (фаза). */
export const terminalColorValue = (element: { params: Record<string, unknown> }): number => {
  const value = element.params.terminalColor;
  return typeof value === 'number' && Number.isFinite(value) ? value : TERMINAL_COLOR.phase;
};

/** Имя цвета для рисунка; неизвестное значение — серая. */
export function terminalColorName(element: { params: Record<string, unknown> }): TerminalColorName {
  const value = terminalColorValue(element);
  const found = (Object.keys(TERMINAL_COLOR) as TerminalColorName[]).find((name) => TERMINAL_COLOR[name] === value);
  return found ?? 'phase';
}

/** Тип .cad от вывода (сдвиг на TERMINAL_2D_ORIGIN_DX делает realistic-2d-types.ts). */
export const TERMINAL_2D_TYPE: CadTypeInfo = {
  code: TERMINAL_2D,
  family: 'switch',
  label: 'Borna 2D (-X)',
  layout: { kind: 'points', points: [{ x: 0, y: 0 }, { x: 0, y: TERMINAL_2D_BOTTOM }] },
  terminalCount: TERMINAL_2D_LABELS.length,
  commandIds: [TERMINAL_2D_COMMAND],
  confidence: 'probable',
  note: '6×15: вывод сверху и снизу по центру, всегда соединены; цвет в nums[16]: 2 фаза, 3 N, 4 PE.',
};
