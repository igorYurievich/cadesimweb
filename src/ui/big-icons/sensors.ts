/**
 * Крупные значки категории «Датчики» — по образцу кнопок CADe_SIMU: всё в рамке корпуса,
 * слева знак типа (индуктивный — брусок, ёмкостный — пластины, магнитный — скоба), в центре ромб
 * датчика, справа контакт. Фотобарьер: буквы E (излучатель) и KR (приёмник), как в оригинале.
 */
import { arrow, drawShapes, rect } from './primitives';
import type { IconText } from './primitives';

/** Корпус датчика. */
const FRAME = rect(2, 6, 60, 36);

/** Ромб датчика с вертикальной чертой по центру. */
const DIAMOND = 'M27 15L35 24L27 33L19 24ZM27 12V36';

/** Маленький контакт внутри рамки: НО — нож отклонён влево, НЗ — нож упирается в упор справа. */
const CONTACT_NO = 'M50 10V16M50 32V38M50 32L43 17';
const CONTACT_NC = 'M47 10V16H54M47 32V38M47 32L56 14';

type Kind = 'inductive' | 'capacitive' | 'magnetic';

/** Знак типа слева: [линии, заливки]. */
const MARKS: Readonly<Record<Kind, readonly [string[], string[]]>> = {
  inductive: [[], [rect(7, 15, 6, 18)]],
  capacitive: [['M10 14V34M5 21H15M5 27H15'], []],
  magnetic: [['M5 16H13V32H5'], []],
};

const proximity = (kind: Kind, open: boolean) => (): SVGSVGElement => {
  const [strokes, fills] = MARKS[kind];
  return drawShapes([FRAME, ...strokes, DIAMOND, open ? CONTACT_NO : CONTACT_NC], fills);
};

const label = (text: string, x: number): IconText => ({ x, y: 25, text, size: 16 });

/** Пластины «‡» — знак оптики у излучателя и барьера. */
const plates = (x: number): string => `M${x} 14V34M${x - 6} 21H${x + 6}M${x - 6} 27H${x + 6}`;

const receiver = (open: boolean) => (): SVGSVGElement =>
  drawShapes([FRAME, open ? CONTACT_NO : CONTACT_NC], [], [label('KR', 20)]);

export const SENSOR_BIG_ICONS: Readonly<Record<number, () => SVGSVGElement>> = {
  33032: proximity('inductive', true),
  33020: proximity('inductive', false),
  33021: proximity('capacitive', true),
  33022: proximity('capacitive', false),
  33023: proximity('magnetic', true),
  33024: proximity('magnetic', false),
  // Фотобарьер целиком: корпус с лучами «/ /» и пластинами, луч уходит и возвращается.
  33025: () => drawShapes([
    rect(2, 6, 38, 36), 'M8 32L14 16M15 32L21 16', plates(30),
    arrow(42, 16, 60, 16, 5), arrow(60, 32, 42, 32, 5),
  ]),
  // Излучатель: «E» и пластины.
  33027: () => drawShapes([FRAME, plates(44)], [], [label('E', 18)]),
  33034: receiver(true),
  33033: receiver(false),
  // Рефлекторный: корпус, луч к отражателю и обратно.
  34013: () => drawShapes([rect(2, 6, 30, 36), 'M8 32L14 16M15 32L21 16', arrow(34, 16, 52, 16, 5),
    arrow(52, 32, 34, 32, 5), 'M59 8V40']),
};
