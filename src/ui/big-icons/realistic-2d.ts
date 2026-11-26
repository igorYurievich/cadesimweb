/**
 * Крупные значки категории «Реалистичные символы 2D»: упрощённые цветные копии того, как аппарат
 * выглядит на схеме в 2D (корпус, клеммы, ручки, кнопки в своих цветах). Без подписей и мелочей.
 */
import { circle, drawShapes, rect } from './primitives';
import type { IconText, Shape } from './primitives';

export const OUTLINE = '#2b2f36';
export const BODY = '#e6e8eb';
export const DARK = '#2b2f36';
export const GREEN = '#2e9d4f';
const RED = '#d62f2f';
const BLUE = '#2f6fd6';

/** Залитая фигура цвета color. */
export const fill = (d: string, color: string): Shape => ({ d, fill: true, color });
/** Тонкий контур. */
export const line = (d: string, color = OUTLINE): Shape => ({ d, color, width: 2 });

export const draw = (shapes: readonly Shape[], texts: readonly IconText[] = []) => (): SVGSVGElement =>
  drawShapes(shapes, [], texts);

/** Корпус модульного аппарата: заливка и контур. */
export const body = (x: number, y: number, w: number, h: number, color = BODY): Shape[] =>
  [fill(rect(x, y, w, h), color), line(rect(x, y, w, h))];

/** Винты клемм — светлые кружки с контуром. */
export const screws = (xs: readonly number[], y: number): Shape[] =>
  xs.flatMap((x) => [fill(circle(x, y, 2.5), '#ffffff'), line(circle(x, y, 2.5), '#6b7280')]);

/** Двигатель: синий корпус, серый вал, светлый кожух вентилятора, белая табличка. */
function motor(leadsBelow: boolean): () => SVGSVGElement {
  const leads = leadsBelow ? [line('M22 38V46M30 38V46M38 38V46', '#6b7280')] : [];
  return draw([
    ...leads,
    fill(rect(2, 22, 10, 6), '#9aa3ad'),
    fill('M42 13H50A6 6 0 0 1 56 19V31A6 6 0 0 1 50 37H42Z', '#4a7fd6'),
    fill(rect(10, 12, 34, 26), '#2f5fb3'),
    fill(rect(10, 12, 3, 26), '#1f3f80'),
    fill(rect(16, 5, 20, 8), '#3d6cc4'),
    fill(rect(20, 20, 14, 10), '#ffffff'),
    ...(leadsBelow ? [] : [fill(rect(14, 38, 26, 3), '#1f3f80')]),
  ]);
}

/** Реле с выдержкой: серый корпус, белая шкала со стрелкой, синяя защёлка, надпись ON/OFF. */
const delayRelay = (label: string) => draw([
  ...body(8, 4, 48, 40, '#d9dbde'),
  ...screws([13, 51], 9), ...screws([13, 51], 39),
  fill(circle(32, 23, 13), '#f6f6f6'), line(circle(32, 23, 13), '#8a9099'),
  line('M32 23L24 16', DARK),
  fill(rect(53, 17, 3, 12), BLUE),
], [{ x: 32, y: 40, text: label, size: 8 }]);

export const REALISTIC_2D_BIG_ICONS: Readonly<Record<number, () => SVGSVGElement>> = {
  33311: motor(false),
  33393: motor(true),
  // Автомат: светлый корпус, зелёная полоса, два белых рычажка, чёрная полоса.
  33352: draw([
    ...body(20, 2, 24, 44), ...screws([26, 38], 7), ...screws([26, 38], 41),
    fill(rect(21, 13, 22, 3), GREEN),
    fill(rect(25, 19, 5, 9), '#ffffff'), line(rect(25, 19, 5, 9)),
    fill(rect(34, 19, 5, 9), '#ffffff'), line(rect(34, 19, 5, 9)),
    fill(rect(21, 30, 22, 4), DARK),
  ]),
  // УЗО: тёмная полоса с кнопкой теста слева, зелёная полоса.
  33354: draw([
    ...body(18, 2, 28, 44), ...screws([25, 39], 7), ...screws([25, 39], 41),
    fill(rect(20, 15, 7, 19), DARK), fill(rect(21, 17, 5, 4), '#ffffff'),
    fill(rect(30, 15, 14, 3), GREEN), fill(rect(31, 22, 6, 3), '#9aa3ad'),
  ]),
  // Мотор-автомат: тёмные полосы клемм, красная и чёрная кнопки.
  33339: draw([
    ...body(16, 4, 32, 40, '#eef0ea'),
    fill(rect(16, 4, 32, 6), DARK), fill(rect(16, 38, 32, 6), DARK),
    ...screws([24, 32, 40], 7), ...screws([24, 32, 40], 41),
    fill(rect(22, 15, 8, 13), RED), fill(rect(34, 15, 8, 13), '#1d1f22'),
    fill(rect(20, 32, 24, 2), GREEN),
  ]),
  // Тепловое реле: три вывода вверх, синяя и красная кнопки, тёмный низ с винтами.
  33340: draw([
    line('M22 2V10M32 2V10M42 2V10', '#6b7280'),
    ...body(10, 10, 44, 28, '#eceeea'),
    fill(rect(14, 13, 26, 2), GREEN),
    fill(rect(46, 13, 5, 5), BLUE), fill(rect(46, 21, 5, 5), RED),
    fill(rect(10, 31, 44, 8), '#4a4f57'), ...screws([20, 28, 36, 44], 35),
  ]),
  // Выключатель: серая панель, чёрная ручка с красным флажком.
  33386: draw([
    ...body(12, 2, 40, 44, '#c9ccd1'),
    fill(circle(32, 24, 12), '#1d1f22'), fill(rect(15, 21, 34, 6), '#1d1f22'),
    fill(rect(13, 21, 4, 6), RED),
  ]),
  // Разъединитель: жёлтая панель, красная круглая рукоятка.
  33390: draw([
    fill(rect(10, 2, 44, 44), '#f2d21b'),
    fill(circle(32, 24, 18), RED), line(circle(32, 24, 18), '#a51d1d'),
    fill(rect(14, 21, 36, 6), '#b51f1f'),
  ]),
  // Контактор: тёмные полосы клемм сверху и снизу, окошко, зелёная полоса.
  33338: draw([
    ...body(16, 2, 32, 44, '#eceeea'),
    fill(rect(16, 6, 32, 6), DARK), fill(rect(16, 36, 32, 6), DARK),
    ...screws([24, 32, 40], 9), ...screws([24, 32, 40], 39),
    fill(rect(20, 17, 13, 9), '#ffffff'), line(rect(20, 17, 13, 9), '#8a9099'),
    fill(rect(36, 17, 8, 2), GREEN),
  ]),
  // Вспомогательные контакты: бежевая приставка, тёмные винты, синяя защёлка.
  33380: draw([
    ...body(8, 8, 48, 32, '#ece6d3'),
    ...[16, 26, 36, 46].flatMap((x) => [fill(circle(x, 15, 3), '#4a463b'), fill(circle(x, 33, 3), '#4a463b')]),
    fill(rect(20, 21, 16, 6), '#ffffff'), fill(rect(44, 20, 5, 8), '#2f4ea8'),
  ]),
  33381: delayRelay('ON'),
  33382: delayRelay('OFF'),
  // Автомат лестничного освещения: модуль с регулятором времени.
  34002: draw([
    ...body(18, 2, 28, 44), ...screws([25, 39], 7), ...screws([25, 39], 41),
    fill(circle(32, 25, 8), '#f6f6f6'), line(circle(32, 25, 8), '#8a9099'), line('M32 25L36 20', DARK),
  ]),
  // Преобразователи частоты: тёмный корпус, зелёный экран, ручка; однофазный — уже.
  34009: draw([
    ...body(12, 2, 40, 44, '#3a3f46'), fill(rect(18, 8, 28, 12), '#9fd3a0'),
    fill(circle(32, 33, 6), '#c9ccd1'),
  ]),
  34010: draw([
    ...body(18, 2, 28, 44, '#3a3f46'), fill(rect(22, 8, 20, 10), '#9fd3a0'),
    fill(circle(32, 32, 5), '#c9ccd1'),
  ]),
  // Кнопка: чёрный корпус, винты по углам, серое кольцо и тёмная головка.
  33317: draw([
    fill(rect(14, 4, 36, 40), '#26282b'),
    ...screws([20, 44], 10), ...screws([20, 44], 38),
    fill(circle(32, 24, 12), '#c9ccd1'), fill(circle(32, 24, 9), '#26282b'),
  ]),
  // Сигнальная лампа: зелёный круг с тёмным ободом, выводы сверху и снизу.
  33318: draw([
    line('M32 2V9M32 39V46', '#6b7280'),
    fill(circle(32, 24, 15), '#14904a'), { d: circle(32, 24, 15), color: '#1d1f22', width: 3 },
  ]),
  // Клемма: узкий серый корпус, оранжевые зажимы, винты, тёмная середина.
  33319: draw([
    ...body(26, 2, 12, 44, '#c9ccd1'),
    fill(rect(28, 4, 8, 4), '#e0a020'), fill(rect(28, 40, 8, 4), '#e0a020'),
    ...screws([32], 14), ...screws([32], 34), fill(rect(28, 21, 8, 6), '#333333'),
  ]),
};
