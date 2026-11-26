/**
 * Детали крупных значков палитры. Значок — не уменьшенный символ схемы, а упрощённая картинка:
 * толстые линии, без подписей и мелких выводов. Похожие элементы собираются из одних и тех же
 * деталей (привод + контакт), поэтому базовых рисунков немного. Поле 64×48, цвет — currentColor.
 */

/** Привод слева (x 2…18): кнопка, грибок, фиксация, ролик, тепловой. До `linkFrom` идёт штриховая связь. */
export interface Actuator {
  path: string;
  /** Залитые части (шляпка грибка). */
  fill?: string;
  /** Откуда по оси y = 24 начинается механическая связь к контакту. */
  linkFrom: number;
}

export const ACTUATORS = {
  push: { path: 'M5 11V37M5 11H12M5 37H12', linkFrom: 5 },
  mushroom: { path: '', fill: 'M17 9A15 15 0 0 0 17 39Z', linkFrom: 17 },
  latch: { path: 'M4 37L8 11H16', linkFrom: 6 },
  roller: { path: 'M10 18A6 6 0 1 0 10 30A6 6 0 1 0 10 18', linkFrom: 16 },
  thermal: { path: 'M2 32V16H9V32H16V24', linkFrom: 16 },
} as const satisfies Record<string, Actuator>;

/** Контакт с центром по x = cx: рисунок и точка, где его подвижная часть пересекает связь (y = 24). */
export interface Contact {
  path: string;
  linkTo: number;
}

/** Замыкающий (НО): нож отклонён влево, цепь разомкнута. */
export function contactNo(cx: number): Contact {
  return { path: `M${cx} 3V14M${cx} 34V45M${cx} 34L${cx - 10} 15`, linkTo: cx - 5 };
}

/** Размыкающий (НЗ): нож упирается в упор справа, цепь замкнута. */
export function contactNc(cx: number): Contact {
  return { path: `M${cx} 3V14H${cx + 8}M${cx} 34V45M${cx} 34L${cx + 11} 11`, linkTo: cx + 5 };
}

/** Переключающий: размыкающий контакт и рядом слева свободный вывод замыкающей стороны. */
export function contactChangeover(cx: number): Contact {
  const nc = contactNc(cx);
  return { path: `M${cx - 12} 3V16${nc.path}`, linkTo: nc.linkTo };
}

/** Переключатель на 2 или 3 положения: нож в среднем положении между выводами. */
export function contactSelector(cx: number, ways: 2 | 3): Contact {
  const tops = ways === 2 ? [cx - 11, cx + 11] : [cx - 13, cx, cx + 13];
  const blade = ways === 2 ? `M${cx} 34V17` : `M${cx} 34L${cx - 13} 15`;
  const terminals = tops.map((x) => `M${x} 3V${ways === 3 && x === cx ? 11 : 13}`).join('');
  return { path: `${terminals}M${cx} 34V45${blade}`, linkTo: ways === 2 ? cx : cx - 6 };
}

/** Перекрёстный переключатель: два ножа крест-накрест. */
export function contactCross(cx: number): Contact {
  const l = cx - 9;
  const r = cx + 9;
  return { path: `M${l} 3V14M${r} 3V14M${l} 34V45M${r} 34V45M${l} 34L${r} 14M${r} 34L${l} 14`, linkTo: cx };
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgPath(d: string, attrs: Readonly<Record<string, string>> = {}): SVGPathElement {
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', d);
  for (const [name, value] of Object.entries(attrs)) path.setAttribute(name, value);
  return path;
}

/** Пустой крупный значок: толстая линия цвета текста, скруглённые концы. */
export function createBigIconSvg(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 64 48');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '3');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.classList.add('palette-symbol', 'palette-big-icon');
  return svg;
}

/** Привод + связь + один или два контакта. */
export function drawActuatedContacts(actuator: Actuator, contacts: readonly Contact[]): SVGSVGElement {
  const svg = createBigIconSvg();
  const linkTo = Math.max(...contacts.map((contact) => contact.linkTo));
  if (linkTo - actuator.linkFrom > 4) {
    svg.append(svgPath(`M${actuator.linkFrom} 24H${linkTo}`, { 'stroke-dasharray': '1 8' }));
  }
  if (actuator.path) svg.append(svgPath(actuator.path));
  if (actuator.fill) svg.append(svgPath(actuator.fill, { fill: 'currentColor', stroke: 'none' }));
  for (const contact of contacts) svg.append(svgPath(contact.path));
  return svg;
}

/** Линия значка: строка — обычная толстая линия; объект — с заливкой, своим цветом или штрихом. */
export type Shape = string | { d: string; fill?: boolean; color?: string; dash?: boolean; width?: number };

/** Крупная надпись внутри значка (только для блоков, где буквы и есть смысл: TON, S, R…). */
export interface IconText { x: number; y: number; text: string; size?: number; color?: string }

/** Цвета проводников, как на настоящих проводах: нейтраль синяя, защитный — зелёный. */
export const WIRE_N = '#2f80ed';
export const WIRE_PE = '#2e9d4f';

function shapePath(shape: Shape): SVGPathElement {
  if (typeof shape === 'string') return svgPath(shape);
  const color = shape.color ?? 'currentColor';
  const attrs: Record<string, string> = shape.fill ? { fill: color, stroke: 'none' } : { stroke: color };
  if (shape.dash) attrs['stroke-dasharray'] = '1 8';
  if (shape.width) attrs['stroke-width'] = String(shape.width);
  return svgPath(shape.d, attrs);
}

/** Значок из готовых линий, залитых фигур и крупных надписей (для элементов без привода). */
export function drawShapes(
  strokes: readonly Shape[],
  fills: readonly string[] = [],
  texts: readonly IconText[] = [],
): SVGSVGElement {
  const svg = createBigIconSvg();
  for (const shape of strokes) svg.append(shapePath(shape));
  for (const d of fills) svg.append(svgPath(d, { fill: 'currentColor', stroke: 'none' }));
  for (const item of texts) {
    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', String(item.x));
    text.setAttribute('y', String(item.y));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'central');
    text.setAttribute('font-size', String(item.size ?? 16));
    text.setAttribute('font-weight', '800');
    text.setAttribute('font-family', 'system-ui, Arial, sans-serif');
    text.setAttribute('fill', item.color ?? 'currentColor');
    text.setAttribute('stroke', 'none');
    text.textContent = item.text;
    svg.append(text);
  }
  return svg;
}

/** Окружность как путь (для drawShapes). */
export function circle(cx: number, cy: number, r: number): string {
  return `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}`;
}

/** Прямоугольник как путь. */
export function rect(x: number, y: number, w: number, h: number): string {
  return `M${x} ${y}h${w}v${h}h${-w}z`;
}

/** Стрелка от (x1, y1) к (x2, y2) с наконечником. */
export function arrow(x1: number, y1: number, x2: number, y2: number, head = 6): string {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const bx = x2 - ux * head;
  const by = y2 - uy * head;
  const r = (v: number): number => Math.round(v * 10) / 10;
  return `M${x1} ${y1}L${x2} ${y2}M${r(bx - uy * head)} ${r(by + ux * head)}L${x2} ${y2}`
    + `L${r(bx + uy * head)} ${r(by - ux * head)}`;
}
