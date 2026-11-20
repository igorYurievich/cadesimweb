import { PUSHBUTTON_2D } from './realistic-2d-types';

/**
 * Цвет кнопки 2D (8100) — поле nums[16] записи. В образцах [Actividad 1.7, MT_ET]: у «стоп» (-S1, НЗ в цепи)
 * там 6, у «пуск» (-S2, -S3) — 3, у только что поставленной кнопки [2d-simbolos.cad] — 0. Отсюда: 6 — красная,
 * 3 — зелёная, 0 — по умолчанию (рисуем чёрной). Другие значения сохраняются как есть и рисуются чёрной.
 */
export const BUTTON_COLOR = { black: 0, green: 3, red: 6 } as const;

export type ButtonColorName = keyof typeof BUTTON_COLOR;

/** Значение nums[16] кнопки (params.buttonColor), по умолчанию 0. */
export const buttonColorValue = (element: { params: Record<string, unknown> }): number => {
  const value = element.params.buttonColor;
  return typeof value === 'number' && Number.isFinite(value) ? value : BUTTON_COLOR.black;
};

/** Имя цвета для рисунка; неизвестное значение — чёрная. */
export function buttonColorName(element: { params: Record<string, unknown> }): ButtonColorName {
  const value = buttonColorValue(element);
  const found = (Object.keys(BUTTON_COLOR) as ButtonColorName[]).find((name) => BUTTON_COLOR[name] === value);
  return found ?? 'black';
}

export const isPushbutton2d = (typeCode: number): boolean => typeCode === PUSHBUTTON_2D;
