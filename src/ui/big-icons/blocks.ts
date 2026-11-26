/**
 * Крупные значки категорий Ladder и GRAFCET (модули ПЛК — в plc-2d.ts).
 * Здесь буквы допустимы: у блоков ПЛК они и есть смысл (TON, S, R), поэтому они крупные и жирные.
 */
import { arrow, drawShapes, rect } from './primitives';
import type { IconText } from './primitives';

/** Контакт Ladder: две вертикальные черты с выводами. */
const LADDER_CONTACT = 'M2 24H22M22 10V38M42 10V38M42 24H62';
/** Катушка Ladder: две скобки. */
const LADDER_COIL = 'M2 24H18M24 10A18 18 0 0 0 24 38M40 10A18 18 0 0 1 40 38M46 24H62';

const contact = (strokes: readonly string[] = [], texts: readonly IconText[] = []) => (): SVGSVGElement =>
  drawShapes([LADDER_CONTACT, ...strokes], [], texts);
const coil = (letter?: string) => (): SVGSVGElement =>
  drawShapes([LADDER_COIL], [], letter ? [{ x: 32, y: 25, text: letter, size: 18 }] : []);

/** Функциональный блок: рамка и крупная надпись (или рисунок вместо неё). */
const block = (label: string, size = 15, strokes: readonly string[] = []) => (): SVGSVGElement =>
  drawShapes([rect(10, 6, 44, 36), ...strokes], [], label ? [{ x: 32, y: 24, text: label, size }] : []);

const SQUARE_WAVE = 'M16 32H22V16H30V32H38V16H46V32H50';

const LADDER_BIG_ICONS: Readonly<Record<number, () => SVGSVGElement>> = {
  33062: contact(),
  33063: contact(['M24 38L40 10']),
  33065: contact([arrow(32, 34, 32, 14, 5)]),
  33066: contact([arrow(32, 14, 32, 34, 5)]),
  33291: contact([], [{ x: 32, y: 25, text: '1', size: 18 }]),
  33067: coil(),
  33069: coil('S'),
  33070: coil('R'),
  33100: block('SR', 18),
  33111: block('1/2', 16),
  33099: block('TON'),
  33300: block('TP'),
  33112: block('TOF'),
  33114: block('', 15, [SQUARE_WAVE]),
  33226: () => drawShapes([SQUARE_WAVE, arrow(50, 32, 60, 32, 4)]),
  33097: block('CTU'),
  33277: block('CTUD', 13),
};

/** Этап GRAFCET: квадрат с выводами сверху и снизу. */
const STEP = `${rect(18, 8, 28, 28)}M32 2V8M32 36V46`;

/** Разветвление/слияние: одна линия — «ИЛИ», двойная — «И». */
function branch(split: boolean, and: boolean): () => SVGSVGElement {
  const bar = and ? 'M8 20H56M8 28H56' : 'M8 24H56';
  const ends = split ? 'M32 2V20M14 28V46M50 28V46' : 'M14 2V20M50 2V20M32 28V46';
  const orEnds = split ? 'M32 2V24M14 24V46M50 24V46' : 'M14 2V24M50 24V46M32 24V46';
  return () => drawShapes([bar, and ? ends : orEnds]);
}

const GRAFCET_BIG_ICONS: Readonly<Record<number, () => SVGSVGElement>> = {
  33088: () => drawShapes([STEP, rect(23, 13, 18, 18)]),
  33083: () => drawShapes([STEP]),
  33084: () => drawShapes(['M32 2V46'], [rect(18, 21, 28, 6)]),
  33085: () => drawShapes([rect(4, 12, 22, 24), 'M26 24H34', rect(34, 12, 26, 24)]),
  33094: branch(true, false),
  33095: branch(false, false),
  33086: branch(true, true),
  33093: branch(false, true),
  33092: () => drawShapes(['M32 46V6', arrow(32, 30, 32, 18, 7)]),
  34011: () => drawShapes([rect(6, 6, 52, 36), 'M6 18H58M6 30H58M24 6V42']),
};

export const BLOCK_BIG_ICONS: Readonly<Record<number, () => SVGSVGElement>> = {
  ...LADDER_BIG_ICONS,
  ...GRAFCET_BIG_ICONS,
};
