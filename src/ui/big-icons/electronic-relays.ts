/**
 * Крупные значки категории «Relés electrónicos y protecciones» (model/electronic-relays.ts).
 * SSR — корпус с надписью SSR и знаком «=» или «~»; реле фаз — корпус с крупной буквой F или S;
 * защита от перенапряжений — ножи с залитым квадратом расцепителя и катушка U; реле SPST / SPDT —
 * катушка и контакт.
 */
import { WIRE_N, contactChangeover, contactNo, drawShapes, rect } from './primitives';
import type { IconText, Shape } from './primitives';

const leads = (xs: readonly number[], top: boolean): string =>
  xs.map((x) => (top ? `M${x} 2V12` : `M${x} 36V46`)).join('');

/** Корпус 8…56 × 12…36 с выводами и надписью. */
function boxed(
  top: readonly number[], bottom: readonly number[], texts: readonly IconText[], extra: Shape[] = [],
): () => SVGSVGElement {
  return (): SVGSVGElement => drawShapes(
    [rect(6, 12, 52, 24), leads(top, true), leads(bottom, false), ...extra],
    [],
    texts,
  );
}

const SSR_TEXT: IconText = { x: 32, y: 19, text: 'SSR', size: 12 };
const SSR_SINGLE = boxed([20, 44], [20, 44], [SSR_TEXT, { x: 32, y: 30, text: '=', size: 14 }]);
const SSR_AC = boxed([20, 44], [20, 44], [SSR_TEXT], ['M26 31C29 27 34 35 38 30']);
const SSR_THREE = boxed([14, 26, 38, 50], [14, 26, 38, 50], [{ x: 32, y: 24, text: 'SSR', size: 13 }]);

/** Реле фаз: три вывода сверху, у «+ N» синий вывод снизу. */
const phaseRelay = (letter: 'F' | 'S', neutral: boolean) => boxed(
  [18, 32, 46], [],
  [{ x: 32, y: 24, text: letter, size: 20 }],
  neutral ? [{ d: 'M18 36V46', color: WIRE_N }] : [],
);

/** Нож с залитым квадратом расцепителя (последний полюс без него) и катушка U справа. */
function overvoltage(poles: readonly number[], coilX: number, coilW: number) {
  return (): SVGSVGElement => {
    const shapes: Shape[] = poles.flatMap((cx, index) => {
      const blade = `M${cx} 2V13M${cx} 35V46M${cx} 35L${cx - 7} 13`;
      return index < poles.length - 1 ? [blade, { d: `M${cx - 12} 14l6 -3l3 6l-6 3z`, fill: true }] : [blade];
    });
    const mid = coilX + coilW / 2;
    shapes.push(rect(coilX, 16, coilW, 16), `M${mid} 2V16M${mid} 32V46`);
    return drawShapes(shapes, [], [{ x: mid, y: 24, text: 'U', size: 12 }]);
  };
}

/** Катушка слева и контакт справа. */
const smallRelay = (changeover: boolean) => (): SVGSVGElement => {
  const contact = changeover ? contactChangeover(50) : contactNo(48);
  return drawShapes([rect(6, 14, 22, 20), 'M17 2V14M17 34V46', contact.path]);
};

export const ELECTRONIC_RELAY_BIG_ICONS: Readonly<Record<number, () => SVGSVGElement>> = {
  33258: SSR_SINGLE,
  33259: SSR_AC,
  33260: SSR_THREE,
  // Реверсивный: двусторонняя стрелка под надписью, пятый вывод A3 сверху.
  33261: boxed(
    [12, 23, 34, 45, 56], [12, 23, 34, 45],
    [{ x: 32, y: 20, text: 'SSR', size: 12 }],
    ['M22 30H42M22 30l4 -3M22 30l4 3M42 30l-4 -3M42 30l-4 3'],
  ),
  33266: phaseRelay('F', true),
  33267: phaseRelay('F', false),
  33271: phaseRelay('S', true),
  33269: phaseRelay('S', false),
  33344: overvoltage([18, 33], 42, 18),
  33345: overvoltage([11, 22, 33, 44], 49, 13),
  33372: smallRelay(false),
  33373: smallRelay(true),
};
