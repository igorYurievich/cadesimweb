/**
 * Крупные значки категорий «Вспомогательные контакты» и «Катушки, реле времени, сигнализация».
 */
import { circle, drawActuatedContacts, drawShapes, rect } from './primitives';
import type { Actuator, Contact } from './primitives';

type ContactSet = 'no' | 'nc' | 'nonc' | 'co';

/*
 * Контакты нарисованы как на кнопках CADe_SIMU: НО — нож «\'», НЗ — нож упирается в упор слева,
 * переключающий — нож «/» к верхнему выводу и крючок «˥» второго вывода снизу справа.
 */
function auxNo(cx: number): Contact {
  return { path: `M${cx} 4V15M${cx} 32V44M${cx} 32L${cx - 8} 14`, linkTo: cx - 4 };
}

function auxNc(cx: number): Contact {
  return { path: `M${cx} 4V14H${cx - 12}M${cx} 34V44M${cx} 34L${cx - 12} 10`, linkTo: cx - 5 };
}

function auxChangeover(cx: number): Contact {
  const path = `M${cx + 4} 4V12M${cx - 6} 32V44M${cx - 6} 32L${cx + 4} 12M${cx + 3} 31H${cx + 10}V44`;
  return { path, linkTo: cx - 2 };
}

/** Контакты без привода — по центру, с приводом — правее. */
function contacts(kind: ContactSet, shifted: boolean): Contact[] {
  const d = shifted ? 8 : 0;
  switch (kind) {
    case 'no': return [auxNo(34 + d)];
    case 'nc': return [auxNc(38 + d)];
    case 'co': return [auxChangeover(31 + d)];
    case 'nonc': return [auxNc(32 + d), auxNo(50 + d)];
  }
}

/** Привод выдержки — маленький «парашют»: на включение «∈», на отключение «∋», оба — «⊖». */
const DELAY_ON: Actuator = { path: 'M16 18A6 6 0 1 0 16 30M4 24H16', linkFrom: 16 };
const DELAY_OFF: Actuator = { path: 'M4 18A6 6 0 1 1 4 30M4 24H16', linkFrom: 16 };
const DELAY_BOTH: Actuator = { path: `${circle(10, 24, 6)}M4 24H16`, linkFrom: 16 };

/** Без привода: у пары НЗ+НО — штриховая связь между ножами. */
const plain = (kind: ContactSet) => (): SVGSVGElement => {
  const set = contacts(kind, false);
  if (set.length < 2) return drawShapes(set.map((contact) => contact.path));
  return drawActuatedContacts({ path: '', linkFrom: set[0]?.linkTo ?? 0 }, set);
};
const delayed = (actuator: Actuator, kind: ContactSet) => (): SVGSVGElement =>
  drawActuatedContacts(actuator, contacts(kind, true));

const AUX_CONTACT_BIG_ICONS: Readonly<Record<number, () => SVGSVGElement>> = {
  32937: plain('no'),
  32938: plain('nc'),
  32939: plain('nonc'),
  32940: plain('co'),
  32933: delayed(DELAY_ON, 'no'),
  32934: delayed(DELAY_ON, 'nc'),
  32935: delayed(DELAY_ON, 'nonc'),
  32936: delayed(DELAY_ON, 'co'),
  32941: delayed(DELAY_OFF, 'no'),
  32942: delayed(DELAY_OFF, 'nc'),
  32943: delayed(DELAY_OFF, 'nonc'),
  32944: delayed(DELAY_OFF, 'co'),
  32945: delayed(DELAY_BOTH, 'no'),
  32946: delayed(DELAY_BOTH, 'nc'),
  32947: delayed(DELAY_BOTH, 'nonc'),
  32948: delayed(DELAY_BOTH, 'co'),
};

/** Катушка реле времени: катушка и квадрат слева; заливка/крест — вид выдержки. */
function timerCoil(mark: 'on' | 'off' | 'both'): () => SVGSVGElement {
  const side = rect(10, 14, 16, 20);
  const strokes = [rect(26, 14, 26, 20), 'M39 2V14M39 34V46', side];
  if (mark !== 'on') strokes.push('M10 14L26 34M26 14L10 34');
  const fills = mark === 'on' ? [side] : mark === 'both' ? ['M10 14L26 34H10Z'] : [];
  return () => drawShapes(strokes, fills);
}

/** Катушка с отсеком слева (как у реле времени), внутри отсека — свой знак. */
function sideCoil(mark: string): () => SVGSVGElement {
  return () => drawShapes([rect(10, 14, 16, 20), rect(26, 14, 26, 20), 'M39 2V14M39 34V46', mark]);
}

/** Катушка шире обычной: выводы сверху и снизу по x, внутри — знак. */
const wideCoil = (tops: readonly number[], bottom: number, mark: string) => (): SVGSVGElement =>
  drawShapes([rect(10, 14, 44, 20), tops.map((x) => `M${x} 2V14`).join('') + `M${bottom} 34V46`, mark]);

const LAMP = `${circle(32, 24, 13)}M22.8 14.8L41.2 33.2M41.2 14.8L22.8 33.2M32 2V11M32 37V46`;

/** Динамик: корпус-рупор. */
const SPEAKER = 'M10 18H20L34 8V40L20 30H10Z';

const COIL_BIG_ICONS: Readonly<Record<number, () => SVGSVGElement>> = {
  32949: () => drawShapes([rect(18, 14, 28, 20), 'M32 2V14M32 34V46']),
  // Бистабильная: два вывода A1 B1 сверху, A2 снизу, внутри две косые черты.
  32956: wideCoil([22, 42], 32, 'M24 30L30 18M34 30L40 18'),
  // Импульсное реле: в отсеке стрелка «<».
  32964: sideCoil('M22 18L14 24L22 30M14 24H24'),
  // Электроклапан: косая черта в катушке и клапан справа.
  32951: () => drawShapes([rect(10, 14, 28, 20), 'M24 2V14M24 34V46M18 32L30 16M38 24H44', 'M44 16H58L44 32H58Z']),
  32952: timerCoil('on'),
  32953: timerCoil('off'),
  32954: timerCoil('both'),
  // Реле-прерыватель: в отсеке меандр; генератор импульсов: один импульс «⊓».
  32955: sideCoil('M12 30V20H18V30H24V20'),
  33223: sideCoil('M12 30H15V19H21V30H24'),
  // Реле времени по часам: циферблат со стрелками.
  33098: () => drawShapes([rect(14, 14, 36, 20), 'M32 2V14M32 34V46', `${circle(32, 24, 7)}M32 19V24H36`]),
  // Счётчик импульсов: выводы A1 C D R сверху, A2 снизу, в левом отсеке круг.
  33236: wideCoil([14, 30, 40, 50], 30, `M24 14V34${circle(17, 24, 5)}`),
  32957: () => drawShapes([LAMP]),
  // Мигающая: та же лампа и лучи по углам.
  32958: () => drawShapes([LAMP, 'M10 6L15 11M54 6L49 11M10 42L15 37M54 42L49 37']),
  // Звонок: купол и язычок.
  32961: () => drawShapes(['M18 32A14 14 0 0 1 46 32Z', 'M32 2V18'], [circle(32, 39, 4)]),
  // Зуммер: полукруг плоской стороной вверх.
  32962: () => drawShapes(['M18 18H46A14 14 0 0 1 18 18Z', 'M25 2V18M39 2V18']),
  // Сирена: маячок с лучами.
  32960: () => drawShapes(['M20 36A12 12 0 0 1 44 36', rect(14, 36, 36, 6), 'M32 4V12M14 12L19 17M50 12L45 17']),
  // Звуковой сигнал: рупор и звуковые волны.
  32959: () => drawShapes([SPEAKER, 'M42 16A10 10 0 0 1 42 32M49 10A18 18 0 0 1 49 38']),
};

export const CONTACT_COIL_BIG_ICONS: Readonly<Record<number, () => SVGSVGElement>> = {
  ...AUX_CONTACT_BIG_ICONS,
  ...COIL_BIG_ICONS,
};
