/**
 * Крупные значки категорий «Двигатели» и «Силовая электроника».
 * Двигатель — круг с буквой M; число выводов показывает фазы, как на кнопках CADe_SIMU.
 */
import { arrow, circle, drawShapes, rect } from './primitives';
import type { IconText } from './primitives';

/** Двигатель как на кнопках CADe_SIMU: круг с буквой M, выводы доходят до окружности. */
const R = 13;
const CY = 24;
const MOTOR = `${circle(32, CY, R)}M26 30V18L32 25L38 18V30`;

/** Выводы сверху (до окружности) и снизу (от окружности) в заданных x. */
function leads(top: readonly number[], bottom: readonly number[] = []): string {
  const edge = (x: number): number => Math.round(Math.sqrt(R * R - (x - 32) ** 2) * 10) / 10;
  return top.map((x) => `M${x} 2V${CY - edge(x)}`).join('')
    + bottom.map((x) => `M${x} ${CY + edge(x)}V46`).join('');
}

/** Конденсатор под двигателем слева (две пластины поперёк вывода). */
const CAPACITOR = 'M14 30V35M8 35H20M8 39H20M14 39V44M14 30H20';

/** Красная пометка слева сверху: «D» — Даландер, «II» — две скорости. */
const RED = '#d62f2f';
const mark = (text: string) => [{ x: 13, y: 8, text, size: 13, color: RED }];

const THREE = [24, 32, 40];

const motor = (top: readonly number[], bottom: readonly number[] = [], extra: readonly string[] = [],
  texts: readonly IconText[] = []) => (): SVGSVGElement => drawShapes([MOTOR, leads(top, bottom), ...extra], [], texts);

const MOTOR_BIG_ICONS: Readonly<Record<number, () => SVGSVGElement>> = {
  32828: motor(THREE),
  32829: motor(THREE, THREE),
  32830: motor([27, 37]),
  33103: motor([27, 37], [], [CAPACITOR]),
  // Трёхфазный в однофазном режиме: три вывода и знак «III» справа.
  33237: motor(THREE, [], ['M48 3V11M53 3V11M58 3V11M46 3H60']),
  32831: motor(THREE, THREE, [], mark('D')),
  32994: motor(THREE, THREE, [], mark('II')),
};

/** Обмотка из трёх витков по вертикали. */
function winding(x: number): string {
  return `M${x} 4V10A4 4 0 0 1 ${x} 18A4 4 0 0 1 ${x} 26A4 4 0 0 1 ${x} 34V44`;
}

/** Преобразователь частоты: «~» на входе, «~» на выходе; выводы — фазы входа и выхода. */
function drive(inputs: readonly number[]): () => SVGSVGElement {
  return () => drawShapes([
    rect(12, 10, 40, 28),
    'M12 38L52 10',
    'M16 20C19 14 22 14 25 20S31 26 34 20',
    'M31 30C34 24 37 24 40 30S46 36 49 30',
    inputs.map((x) => `M${x} 2V10`).join(''),
    'M24 38V46M32 38V46M40 38V46',
  ]);
}

const ELECTRONICS_BIG_ICONS: Readonly<Record<number, () => SVGSVGElement>> = {
  33002: () => drawShapes([rect(14, 17, 36, 14), 'M2 24H14M50 24H62']),
  33003: () => drawShapes([16, 32, 48].map((x) => `${rect(x - 4, 12, 8, 24)}M${x} 2V12M${x} 36V46`)),
  33004: () => drawShapes([winding(16), winding(32), winding(48), arrow(6, 42, 58, 6)]),
  33006: drive([27, 37]),
  33007: drive([24, 32, 40]),
  // Пульт преобразователя: экран, ручка задания и две кнопки.
  33011: () => drawShapes([rect(6, 6, 52, 36), rect(12, 12, 24, 10), circle(45, 31, 6)], [
    rect(13, 28, 8, 7), rect(25, 28, 8, 7),
  ]),
};

export const MACHINE_BIG_ICONS: Readonly<Record<number, () => SVGSVGElement>> = {
  ...MOTOR_BIG_ICONS,
  ...ELECTRONICS_BIG_ICONS,
};
