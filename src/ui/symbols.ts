import { getCadType } from '@model/cad-types';
import { buildTerminals, rotateOffset, unrotatedSize } from '@model/geometry';
import type { SchemaElement } from '@model/types';

/**
 * Символы элементов в стиле CADe_SIMU (IEC 60617).
 *
 * Геометрия сверена с эталонными скриншотами assets/reference: шаг клемм 6, расстояние между
 * рядами клемм R = h − 3 (обычно 12). Контакт занимает зону 0..12: верхний вывод до y = 3,
 * лопасть между y = 3 и y = 9, нижний вывод от y = 9. Контакты рисуются в двух положениях
 * (`.blade-open` / `.blade-closed`), переключает их CSS по классам состояния симуляции.
 * Цвет линий берётся из `currentColor` группы: серый в покое, красный под напряжением.
 */

const NS = 'http://www.w3.org/2000/svg';
const INK = 'currentColor';
const NAME_COLOR = '#111418';
const STRIP_COLORS: Record<string, string> = { L: '#7a1313', L1: '#7a1313', L2: '#7a1313', L3: '#7a1313', N: '#1530ff', PE: '#0a8a1c' };

type Attrs = Record<string, string | number>;

function shape<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Attrs = {}): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  return el;
}

function group(className: string, ...children: Element[]): SVGGElement {
  const g = shape('g', { class: className });
  g.append(...children);
  return g;
}

/** Линия символа: тонкая, цвет из currentColor, не масштабируется вместе с листом. */
function path(d: string, width = 0.8, extra: Attrs = {}): SVGPathElement {
  return shape('path', { d, fill: 'none', stroke: INK, 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke', ...extra });
}

function dashed(d: string, dash = '1.5 1.2', width = 0.7): SVGPathElement {
  return path(d, width, { 'stroke-dasharray': dash, 'stroke-linecap': 'butt' });
}

function rect(x: number, y: number, w: number, h: number, extra: Attrs = {}): SVGRectElement {
  return shape('rect', { x, y, width: w, height: h, fill: '#fff', stroke: INK, 'stroke-width': 0.8, 'vector-effect': 'non-scaling-stroke', ...extra });
}

function circle(cx: number, cy: number, r: number, extra: Attrs = {}): SVGCircleElement {
  return shape('circle', { cx, cy, r, fill: '#fff', stroke: INK, 'stroke-width': 0.8, 'vector-effect': 'non-scaling-stroke', ...extra });
}

function label(value: string, x: number, y: number, opts: { size?: number; anchor?: 'start' | 'middle' | 'end'; fill?: string; halo?: boolean; upright?: number } = {}): SVGTextElement {
  const { size = 2.9, anchor = 'start', fill = INK, halo = false, upright = 0 } = opts;
  const el = shape('text', {
    x, y, fill, 'font-size': size, 'font-weight': 700, 'font-family': 'Arial, Helvetica, sans-serif', 'text-anchor': anchor, 'dominant-baseline': 'central',
  });
  if (halo) {
    el.setAttribute('paint-order', 'stroke');
    el.setAttribute('stroke', '#fff');
    el.setAttribute('stroke-width', '0.7');
    el.setAttribute('stroke-linejoin', 'round');
    el.setAttribute('vector-effect', 'non-scaling-stroke');
  }
  if (upright) el.setAttribute('transform', `rotate(${-upright} ${x} ${y})`);
  el.textContent = value;
  return el;
}

// ── Контакты ────────────────────────────────────────────────────────────────

/** Высота рабочей зоны контакта: выводы до 3 и от 9, лопасть между ними. */
const ZONE = 12;
const G = 3;

type Control = 'engine' | 'open' | 'trip' | 'aux' | 'pressed';

interface ContactOptions {
  /** NO: в покое разомкнут; NC: в покое замкнут. */
  nc?: boolean;
  /** Что переключает положение: результат движка, ручное размыкание/срабатывание защиты, тепловое реле или нажатие кнопки (многоконтактные кнопки). */
  control?: Control;
  /** Метка расцепителя (чёрная точка на лопасти) у автоматов. */
  blob?: boolean;
}

/** Один полюс контакта в колонке x. Два положения лопасти лежат в отдельных группах. */
function contactColumn(x: number, _rowGap: number, opts: ContactOptions = {}): SVGGElement {
  const { nc = false, control = 'engine', blob = false } = opts;
  const bottom = ZONE - G;
  const stubs = path(`M ${x} 0 V ${G} M ${x} ${bottom} V ${ZONE}`);
  const open = group('blade-open');
  const closed = group('blade-closed');
  if (!nc) {
    open.append(path(`M ${x - 3} ${G} L ${x} ${bottom}`));
    closed.append(path(`M ${x} ${G} H ${x - 1} L ${x} ${bottom}`));
    if (blob) {
      open.append(circle(x - 2.1, G + 1.2, 0.75, { fill: INK, 'stroke-width': 0.2 }));
      closed.append(circle(x - 0.85, G + 1.7, 0.75, { fill: INK, 'stroke-width': 0.2 }));
    }
  } else {
    open.append(path(`M ${x} ${G} H ${x + 3} L ${x + 1.9} ${bottom - 1.6}`));
    closed.append(path(`M ${x} ${G} H ${x + 3} L ${x} ${bottom}`));
  }
  const col = group(`contact by-${control}${nc ? ' rest-closed' : ''}${!nc && control === 'open' ? ' rest-closed' : ''}`, stubs, open, closed);
  return col;
}

/** Колонки полюсов: x-координаты клемм верхнего ряда (или всех клемм, если ряд один). */
function columns(element: SchemaElement): number[] {
  return [...new Set(element.terminals.map((t) => t.offset.x))].sort((a, b) => a - b);
}

function rowGapOf(element: SchemaElement): number {
  return Math.max(0, ...element.terminals.map((t) => t.offset.y));
}

/** Пунктирная механическая связь между полюсами на уровне середины контакта. */
function linkBar(xs: number[], y = ZONE / 2): SVGPathElement {
  const first = xs[0] ?? 0;
  const last = xs[xs.length - 1] ?? 0;
  return dashed(`M ${first + 0.8} ${y} H ${last + 3.2}`, '2.2 1.7');
}

/** Толкатель кнопки: скоба слева и пунктир к середине контакта (to — x конца пунктира, если он не у лопасти колонки x). */
function pushActuator(x: number, nc: boolean, to = nc ? x + 1.5 : x - 1.5): SVGGElement {
  return group('actuator', dashed(`M ${x - 6} 6 H ${to}`, '1.5 1.1'), path(`M ${x - 4.7} 4.5 H ${x - 6} V 7.5 H ${x - 4.7}`));
}

/** Привод «грибок» (seta): полукруглая головка выпуклой стороной влево, короткий шток и пунктир к середине контакта. */
function setaActuator(x: number, nc: boolean, to = nc ? x + 1.5 : x - 1.5): SVGGElement {
  return group('actuator',
    dashed(`M ${x - 4} 6 H ${to}`, '1.5 1.1'),
    path(`M ${x - 5} 3.6 V 8.4 M ${x - 5} 3.6 A 2.4 2.4 0 0 0 ${x - 5} 8.4 M ${x - 5} 6 H ${x - 4}`),
  );
}

/** Круг-индикатор «Botón pulsador» 8023 (рамка 6×6): зелёный диск и тонкое кольцо вокруг. Цвет не зависит от состояния. */
function drawIndicator(g: SVGGElement): void {
  g.append(circle(3, 3, 3.3, { fill: '#fff', stroke: '#6b7280', 'stroke-width': 0.6 }));
  g.append(circle(3, 3, 2.5, { fill: '#0a8a1c', stroke: 'none' }));
}

/** Кнопка НО+НЗ (8002 плоская, 8006 грибок): НЗ колонка слева, НО справа, общий толкатель и пунктирная связь между колонками. */
function drawPushPair(g: SVGGElement, element: SchemaElement, mushroom: boolean): void {
  const xs = columns(element);
  const rowGap = rowGapOf(element);
  const nc = xs[0] ?? 0;
  const no = xs[1] ?? nc + 9;
  g.append(contactColumn(nc, rowGap, { nc: true, control: 'pressed' }));
  g.append(contactColumn(no, rowGap, { control: 'pressed' }));
  g.append(dashed(`M ${nc + 1.5} 6 H ${no - 1.5}`, '1.5 1.1'));
  g.append((mushroom ? setaActuator : pushActuator)(nc, true));
}

/** Кнопка CON 8003: общий вывод сверху, НЗ и НО снизу, толкатель слева с пунктиром к середине лопасти. */
function drawPushChangeover(g: SVGGElement, element: SchemaElement): void {
  const top = element.terminals[0]?.offset.x ?? 3;
  const nc = element.terminals[1]?.offset.x ?? 0;
  const no = element.terminals[2]?.offset.x ?? 6;
  g.append(conColumn(top, nc, no, 'pressed'));
  const left = Math.min(top, nc, no);
  g.append(pushActuator(left, true, (top + nc) / 2));
}

/** Привод конечного выключателя: пунктир к контакту и ролик на конце. */
export function limitActuator(x: number, nc: boolean): SVGGElement {
  const midX = nc ? x + 1.5 : x - 1.5;
  return group('actuator', dashed(`M ${x - 5} 6 H ${midX}`, '1.5 1.1'), circle(x - 6.4, 6, 1.4, { 'stroke-width': 0.8 }), path(`M ${x - 6.4} 4.6 V 3.2`, 0.7));
}

/** Привод ручного выключателя (Interruptor): скоба слева, «V» и линия к середине лопасти первого полюса. */
function switchActuator(x: number): SVGGElement {
  return group('actuator',
    path(`M ${x - 9} 4 V 8 M ${x - 9} 6 H ${x - 7}`),
    path(`M ${x - 7} 6 L ${x - 5.2} 9 L ${x - 3.4} 6 H ${x - 1.5}`),
  );
}

/** Знак функции контактора (дуга слева от вывода, «d»): Contactor III 2008. */
function contactorMark(x: number): SVGPathElement {
  return path(`M ${x} 1 A 1 1 0 0 0 ${x} ${G}`);
}

/** Блокировка двух контакторов: имена с подчёркиванием, между ними треугольник вершиной вниз. */
function drawInterlock(g: SVGGElement, element: SchemaElement, rotation: number): void {
  const mid = 1.5;
  g.append(path(`M 1.3 ${mid} H 9.2 M 14.8 ${mid} H 22.7`));
  g.append(path(`M 10.2 ${mid - 1.9} H 13.8 L 12 ${mid + 1.8} Z`, 0.8));
  g.append(label(element.name, 1.3, mid - 1.6, { size: 2.6, upright: rotation }));
  g.append(label(element.func, 17.6, mid - 1.6, { size: 2.6, upright: rotation }));
}

/** Аппараты с блоком расцепителей под полюсами. */
const TRIP_BLOCK_TYPES: ReadonlySet<number> = new Set([6008, 6009, 6010, 6011, 6012]);
/** Аппараты, у которых последний полюс — нейтраль (без расцепителя и без точки на лопасти). */
const NEUTRAL_POLE_TYPES: ReadonlySet<number> = new Set([6001, 6004, 6005, 6006, 6011, 6012]);

// ── Двигатель ───────────────────────────────────────────────────────────────

/**
 * Параметры символов двигателей с окружностью радиуса 9 (панель «Motores»).
 * top: индексы верхних выводов, идущих к окружности; pe: индекс вывода PE; cy: центр окружности по y.
 */
interface MotorSpec {
  top: readonly number[];
  pe: number;
  cy: number;
  phase: '1' | '3';
  /** Подпись слева сверху: Dah, I-II. */
  tag?: string;
  /** Двойная окружность (ротор с кольцами). */
  wound?: boolean;
  /** Конденсатор: на верхних выводах V1–W1 (1010) или на нижнем выводе U2 (1008). */
  capacitor?: 'top' | 'bottom';
}

const MOTOR_R = 9;
const MOTOR_SPECS: Readonly<Record<number, MotorSpec>> = {
  1000: { top: [0, 1, 2], pe: 3, cy: 12, phase: '3' },
  1001: { top: [0, 1, 2], pe: 3, cy: 12, phase: '3' },
  1002: { top: [0, 1], pe: 2, cy: 12, phase: '1' },
  1008: { top: [0, 1], pe: 2, cy: 13.5, phase: '1', capacitor: 'bottom' },
  1010: { top: [0, 1, 2], pe: 3, cy: 15, phase: '3', capacitor: 'top' },
  1003: { top: [0, 1, 2], pe: 3, cy: 12, phase: '3', tag: 'Dah' },
  1005: { top: [0, 1, 2], pe: 3, cy: 12, phase: '3', tag: 'I-II' },
  1004: { top: [0, 1, 2], pe: 3, cy: 12, phase: '3', wound: true },
};

const inkFill = (d: string): SVGPathElement => shape('path', { d, fill: INK, stroke: INK, 'stroke-width': 0.3, 'vector-effect': 'non-scaling-stroke' });

/** Стрелка вращения: видна только когда двигатель работает (см. CSS), крутится вокруг центра дуги. s = радиус окружности / 9. */
function motorRotor(cx: number, cy: number, s: number): SVGGElement {
  const acy = cy - 0.6 * s;
  const rotor = group('motor-rotor');
  rotor.append(shape('circle', { cx, cy: acy, r: 5.6 * s, fill: 'none', stroke: 'none' }));
  rotor.append(path(`M ${cx - 4.8 * s} ${acy - 2.5 * s} A ${5.4 * s} ${5.4 * s} 0 0 1 ${cx + 4.7 * s} ${acy - 2.6 * s}`, 0.8));
  rotor.append(inkFill(`M ${cx + 5.3 * s} ${acy - 1.2 * s} L ${cx + 3.5 * s} ${acy - 3.6 * s} L ${cx + 6.2 * s} ${acy - 3.9 * s} Z`));
  return rotor;
}

/** Конденсатор на горизонтальном участке между x1 и x2 на высоте y (обкладки вертикальные). */
function capacitorH(x1: number, x2: number, y: number): SVGPathElement {
  const mid = (x1 + x2) / 2;
  return path(`M ${x1} ${y} H ${mid - 1} M ${mid - 1} ${y - 1.6} V ${y + 1.6} M ${mid + 1} ${y - 1.6} V ${y + 1.6} M ${mid + 1} ${y} H ${x2}`);
}

function drawMotor(g: SVGGElement, element: SchemaElement): void {
  const spec = MOTOR_SPECS[element.typeCode] ?? MOTOR_SPECS[1000] as MotorSpec;
  const at = (index: number): { x: number; y: number } => element.terminals[index]?.offset ?? { x: 0, y: 0 };
  const topXs = spec.top.map((index) => at(index).x);
  const cx = ((topXs[0] ?? 0) + (topXs[topXs.length - 1] ?? 0)) / 2;
  const cy = spec.cy;
  const r = MOTOR_R;
  const rimDy = (x: number): number => Math.sqrt(Math.max(0, r * r - (x - cx) ** 2));
  const body = group('motor-body');
  body.append(circle(cx, cy, r, { 'stroke-width': 0.9 }));
  if (spec.wound) body.append(circle(cx, cy, r - 1.8, { 'stroke-width': 0.7, fill: 'none' }));
  // Верхние выводы: вертикальная линия до окружности (у 1010 между V1 и W1 стоит конденсатор).
  for (const index of spec.top) {
    const x = at(index).x;
    g.append(path(`M ${x} 0 V ${cy - rimDy(x)}`));
  }
  if (spec.capacitor === 'top') {
    const [, v1, w1] = spec.top.map((index) => at(index).x);
    if (v1 !== undefined && w1 !== undefined) g.append(capacitorH(v1, w1, 4.8));
  }
  // Нижние выводы (1001, 1003–1005 и 1008): линии от клеммы к окружности; на выводе U2 мотора 1008 стоит конденсатор.
  element.terminals.forEach((terminal, index) => {
    if (spec.top.includes(index) || index === spec.pe || terminal.offset.y <= 0) return;
    const x = terminal.offset.x;
    const rim = cy + rimDy(x);
    if (spec.capacitor === 'bottom' && x === topXs[0]) {
      const y = terminal.offset.y;
      const plates = (rim + y) / 2;
      g.append(path(`M ${x} ${y} V ${plates + 1} M ${x - 2.4} ${plates + 1} H ${x + 2.4} M ${x - 2.4} ${plates - 1} H ${x + 2.4} M ${x} ${plates - 1} V ${rim}`));
    } else {
      g.append(path(`M ${x} ${terminal.offset.y} V ${rim}`));
    }
  });
  const pe = element.terminals[spec.pe]?.offset;
  if (pe) {
    const edge = cx + r;
    g.append(path(`M ${pe.x} 0 V ${cy} H ${edge + 1.5}`));
    body.append(path(`M ${edge + 0.5} ${cy - 2.4} Q ${edge + 1.9} ${cy} ${edge + 0.5} ${cy + 2.4}`, 0.8));
    body.append(path(`M ${edge + 1.4} ${cy - 1.8} Q ${edge + 2.4} ${cy} ${edge + 1.4} ${cy + 1.8}`, 0.5));
  }
  body.append(motorRotor(cx, cy, 1));
  body.append(label('M', cx, cy - 2.4, { size: 3.8, anchor: 'middle', fill: '#222' }));
  body.append(label(spec.phase, cx - 3.4, cy + 2, { size: 3.4, anchor: 'middle', fill: '#222' }));
  body.append(path(`M ${cx + 1.4} ${cy + 2.3} q 0.9 -1.7 1.8 0 t 1.8 0`, 0.7));
  if (spec.tag) body.append(label(spec.tag, -9, 1.5, { size: 2.7, anchor: 'middle', fill: '#222' }));
  g.append(body);
}

/** Двигатели постоянного тока: 1006 с постоянным магнитом (сверху «магнит»), 1007 с независимым возбуждением (обмотка F1–F2 над якорем). */
function drawDcMotor(g: SVGGElement, element: SchemaElement): void {
  const independent = element.typeCode === 1007;
  const cx = 9;
  const cy = independent ? -3 : 0;
  const r = 6;
  const body = group('motor-body');
  body.append(circle(cx, cy, r, { 'stroke-width': 0.9 }));
  // Якорь: выводы A1 и A2 к щёткам (чёрные прямоугольники по бокам окружности).
  g.append(path(`M 0 ${cy} H 1.4 M ${cx + r + 1.6} ${cy} H 18`));
  for (const x of [cx - r - 1.6, cx + r]) {
    body.append(shape('rect', { x, y: cy - 1.7, width: 1.6, height: 3.4, fill: INK, stroke: INK, 'stroke-width': 0.3, 'vector-effect': 'non-scaling-stroke' }));
  }
  body.append(motorRotor(cx, cy - 0.4, r / MOTOR_R));
  body.append(label('M', cx, cy - 1.6, { size: 3.4, anchor: 'middle', fill: '#222' }));
  // Знак постоянного тока: сплошная и пунктирная линии.
  body.append(path(`M ${cx - 2.4} ${cy + 1.5} H ${cx + 2.4}`, 0.7));
  body.append(dashed(`M ${cx - 2.4} ${cy + 2.7} H ${cx + 2.4}`, '1 0.8', 0.6));
  if (independent) {
    // Обмотка возбуждения F1–F2: линия с чёрным прямоугольником посередине.
    g.append(path(`M 0 -12 H 5 M 13 -12 H 18`));
    body.append(shape('rect', { x: 5, y: -12.8, width: 8, height: 1.6, fill: INK, stroke: INK, 'stroke-width': 0.3, 'vector-effect': 'non-scaling-stroke' }));
  } else {
    // Постоянный магнит: две ножки к окружности и жирная перекладина над ними.
    g.append(path(`M ${cx - 3.2} ${cy - 8.4} V ${cy - 5.1} M ${cx + 3.2} ${cy - 8.4} V ${cy - 5.1}`));
    body.append(shape('rect', { x: cx - 3.8, y: cy - 10, width: 7.6, height: 1.6, fill: INK, stroke: INK, 'stroke-width': 0.3, 'vector-effect': 'non-scaling-stroke' }));
  }
  g.append(body);
}

/** Шаговые двигатели 1011 (униполярный: обмотки со средней точкой 1-5-3 и 2-6-4) и 1012 (биполярный: обмотки 1-2 и 3-4). Только символ. */
function drawStepper(g: SVGGElement, element: SchemaElement): void {
  const unipolar = element.typeCode === 1011;
  const cx = 9;
  const cy = 3;
  const r = 5;
  const body = group('motor-body');
  body.append(circle(cx, cy, r, { 'stroke-width': 0.9 }));
  // Левая обмотка: выводы слева (x = −3) и четыре витка радиуса 1,5 вдоль x = 0; у униполярного вывод 5 посередине.
  g.append(path(`M -3 0 H 0 M -3 12 H 0${unipolar ? ' M -3 6 H 0' : ''}`));
  g.append(path(`M 0 0${' a 1.5 1.5 0 0 1 0 3'.repeat(4)}`));
  // Нижняя обмотка: четыре витка по y = 15 (вывод 6 посередине у униполярного).
  g.append(path(`M 0 15${' a 1.5 1.5 0 0 1 3 0'.repeat(4)}`));
  body.append(motorRotor(cx, cy, r / MOTOR_R));
  body.append(label('M', cx, cy - 1.2, { size: 3, anchor: 'middle', fill: '#222' }));
  body.append(path(`M ${cx - 2.8} ${cy + 3} H ${cx - 1.2} V ${cy + 1.4} H ${cx + 1.2} V ${cy + 3} H ${cx + 2.8}`, 0.6));
  g.append(body);
}

/** Тормоз 1009: три вывода и трапеция. Только символ. */
function drawBrake(g: SVGGElement, element: SchemaElement): void {
  for (const terminal of element.terminals) g.append(path(`M ${terminal.offset.x} 0 V 3`));
  g.append(path('M -2 3 H 14 L 17.5 9 H -5.5 Z', 0.9, { fill: '#fff' }));
}

// ── Защита ──────────────────────────────────────────────────────────────────

/** Автомат: полюса с лопастью и точкой расцепителя; последний полюс у 2P и 4P аппаратов — нейтраль без точки. */
function drawBreakerPoles(g: SVGGElement, element: SchemaElement): void {
  const xs = columns(element);
  const rowGap = rowGapOf(element);
  const hasNeutral = NEUTRAL_POLE_TYPES.has(element.typeCode);
  xs.forEach((x, i) => {
    g.append(contactColumn(x, rowGap, { control: 'open', blob: !(hasNeutral && i === xs.length - 1) }));
    if (rowGap > ZONE && !TRIP_BLOCK_TYPES.has(element.typeCode)) g.append(path(`M ${x} ${ZONE} V ${rowGap}`));
  });
  g.append(linkBar(xs));
}

/** Блок расцепителей под полюсами 6008–6012: рамка, «крюк» теплового и «▷» электромагнитного, символ УЗО слева. */
function drawTripBlock(g: SVGGElement, element: SchemaElement): void {
  const xs = columns(element);
  const rowGap = rowGapOf(element);
  const top = rowGap - 8.5;
  const cells = NEUTRAL_POLE_TYPES.has(element.typeCode) ? xs.slice(0, -1) : xs;
  const left = (cells[0] ?? 0) - 3;
  const right = (cells[cells.length - 1] ?? 0) + 3;
  g.append(rect(left, top, right - left, 5.5, { fill: 'none' }));
  g.append(path(`M ${left} ${top + 3} H ${right}`, 0.7));
  for (const x of cells.slice(0, -1)) g.append(path(`M ${x + 3} ${top} V ${top + 5.5}`, 0.7));
  for (const x of cells) {
    g.append(path(`M ${x} ${top} V ${top + 0.9} H ${x + 2.4} V ${top + 2.2} H ${x} V ${top + 3}`, 0.8));
    g.append(path(`M ${x - 1.2} ${top + 3.7} V ${top + 4.9} M ${x - 0.1} ${top + 3.7} L ${x + 1.7} ${top + 4.3} L ${x - 0.1} ${top + 4.9} Z`, 0.55));
  }
  // Лишние отрезки вывода внутри рамки: вывод проходит сквозь крюк.
  for (const x of cells) g.append(path(`M ${x} ${ZONE} V ${top} M ${x} ${top + 3} V ${rowGap}`));
  for (const x of xs) if (!cells.includes(x)) g.append(path(`M ${x} ${ZONE} V ${rowGap}`));
  // Символ дифференциальной защиты.
  const x0 = (cells[0] ?? 0) - 10;
  g.append(path(`M ${x0} 3.2 V 7 M ${x0} 5.1 H ${x0 + 1.8}`, 0.8));
  g.append(rect(x0 + 1.8, 2.9, 4.4, 4.4, { fill: 'none' }));
  g.append(path(`M ${x0 + 4} 2.9 V 7.3 M ${x0 + 1.8} 5.1 H ${x0 + 6.2} M ${x0 + 6.2} 5.1 H ${left}`, 0.7));
  g.append(dashed(`M ${x0 + 4} 7.3 V ${top + 4.3}`));
  g.append(dashed(`M ${x0 + 4} ${top + 1.5} H ${left}`));
  g.append(dashed(`M ${x0 + 4} ${top + 4.3} H ${left}`));
}

/** Дифференциальный расцепитель: символ УЗО слева, капсула вокруг полюсов, пунктирная связь. */
function drawDifferentialBlock(g: SVGGElement, element: SchemaElement): void {
  const xs = columns(element);
  const first = xs[0] ?? 0;
  const last = xs[xs.length - 1] ?? first;
  const left = first - 1.8;
  const x0 = first - 10;
  g.append(shape('rect', { x: left, y: 12, width: last + 1.8 - left, height: 3, rx: 1.5, fill: '#fff', stroke: INK, 'stroke-width': 0.8, 'vector-effect': 'non-scaling-stroke' }));
  for (const x of xs) g.append(path(`M ${x} 12 V 15`));
  g.append(path(`M ${x0} 3.2 V 7 M ${x0} 5.1 H ${x0 + 1.8}`, 0.8));
  g.append(rect(x0 + 1.8, 2.9, 4.4, 4.4, { fill: 'none' }));
  g.append(path(`M ${x0 + 4} 2.9 V 7.3 M ${x0 + 1.8} 5.1 H ${x0 + 6.2} M ${x0 + 6.2} 5.1 H ${first - 3}`, 0.7));
  g.append(dashed(`M ${x0 + 4} 7.3 V 13.5 H ${left}`));
}

/** Ограничитель перенапряжения: пунктирная рамка, у каждой линии встречные стрелки, общая шина и вывод PE слева снизу. */
function drawSurgeLimiter(g: SVGGElement, element: SchemaElement): void {
  const xs = columns(element);
  const first = xs[0] ?? 0;
  const last = xs[xs.length - 1] ?? first;
  const bus = 14.3;
  g.append(dashed(`M ${first - 3} 3 H ${last + 3} V 15 H ${first - 3} Z`, '2 1.4'));
  const arrow = (d: string): SVGPathElement => shape('path', { d, fill: INK, stroke: INK, 'stroke-width': 0.4, 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' });
  for (const x of xs) {
    g.append(path(`M ${x} 0 V 5.6`));
    g.append(arrow(`M ${x - 1.2} 5.6 H ${x + 1.2} L ${x} 8 Z`));
    g.append(arrow(`M ${x - 1.2} 12.2 H ${x + 1.2} L ${x} 10 Z`));
    g.append(path(`M ${x} 12.2 V ${bus}`));
  }
  for (const x of xs.slice(0, -1)) g.append(dashed(`M ${x + 3} 3 V 15`, '1.6 1.2', 0.6));
  g.append(path(`M ${first} ${bus} H ${last} M ${first} ${bus} V 18`));
}

/** Защита двигателя / тепловое реле 6007: рамка с тремя «крюками». */
function drawMotorProtection(g: SVGGElement, element: SchemaElement): void {
  const xs = columns(element);
  const rowGap = rowGapOf(element);
  const left = (xs[0] ?? 0) - 1.6;
  const right = (xs[xs.length - 1] ?? 0) + 4.6;
  g.append(rect(left, 3, right - left, 6, { fill: 'none', 'stroke-width': 0.9 }));
  const mid = (7.4 + rowGap) / 2;
  for (const x of xs) {
    g.append(path(`M ${x} 0 V 4.6 H ${x + 3} V 7.4 H ${x}`));
    // Силовой полюс реле: замкнут (сплошная линия) или разомкнут вручную/при срабатывании (разрыв с лопастью).
    g.append(group('mp-closed', path(`M ${x} 7.4 V ${rowGap}`)));
    g.append(group('mp-open', path(`M ${x} 7.4 V ${mid - 2}`), path(`M ${x - 2.6} ${mid - 2} L ${x} ${mid + 2}`), path(`M ${x} ${mid + 2} V ${rowGap}`)));
  }
  g.append(dashed(`M ${left - 3.2} 6 H ${left}`, '1.4 1'));
  g.append(path(`M ${left - 3.2} 7.4 V 6`, 0.8));
}

// ── Прочее ──────────────────────────────────────────────────────────────────

function drawThermalAux(g: SVGGElement, element: SchemaElement): void {
  const xs = columns(element);
  const rowGap = rowGapOf(element);
  const nc = xs[0] ?? 0;
  const no = xs[1] ?? nc + 9;
  g.append(contactColumn(nc, rowGap, { nc: true, control: 'trip' }));
  g.append(contactColumn(no, rowGap, { control: 'trip' }));
  g.append(dashed(`M ${nc - 4.7} 6 H ${no - 1.5}`, '1.6 1.2'));
  g.append(path(`M ${nc - 6.7} 7.8 V 6 H ${nc - 5.1} V 7.8`, 0.8));
  g.append(path(`M ${no + 3.8} 4 V 5 H ${no + 5.2} V 7 H ${no + 3.8} V 7.8`, 0.8));
}

function drawCoil(g: SVGGElement, element: SchemaElement, timer: boolean, rotation = 0): void {
  const rowGap = rowGapOf(element);
  const x = element.terminals[0]?.offset.x ?? 0;
  const mid = rowGap / 2;
  g.append(path(`M ${x} 0 V ${mid - 2} M ${x} ${mid + 2} V ${rowGap}`));
  g.append(rect(x - 4, mid - 2, 8, 4, { 'stroke-width': 0.9 }));
  if (timer) {
    g.append(path(`M ${x - 1.4} ${mid - 1} L ${x + 1.4} ${mid - 1} L ${x - 1.4} ${mid + 1} L ${x + 1.4} ${mid + 1} Z`, 0.6));
    // Отсчёт выдержки «прошло / задано»: текст заполняет интерфейс при симуляции, в редакторе скрыт (CSS).
    const readout = label('', x + 2, rowGap + 4.2, { size: 2.4, halo: true, upright: rotation });
    readout.setAttribute('class', 'timer-readout');
    g.append(readout);
  }
}

function drawLamp(g: SVGGElement, element: SchemaElement): void {
  const rowGap = rowGapOf(element);
  const x = element.terminals[0]?.offset.x ?? 0;
  const mid = rowGap / 2;
  const r = 3.3;
  // Индекс цвета из .cad: 0 — зелёная, 1 — красная, 2 — жёлтая.
  // Пока лампа не включена, цвет задаётся CSS как нейтральный.
  const requestedColor = Number(element.params.color ?? 0);
  const index = requestedColor === 1 || requestedColor === 2 ? requestedColor : 0;
  g.append(path(`M ${x} 0 V ${mid - r} M ${x} ${mid + r} V ${rowGap}`));
  g.append(circle(x, mid, r, { class: `lamp-glass lamp-c${index}`, fill: '#f6f7f8', stroke: '#7b8794' }));
  const d = r * Math.SQRT1_2;
  g.append(path(`M ${x - d} ${mid - d} L ${x + d} ${mid + d} M ${x + d} ${mid - d} L ${x - d} ${mid + d}`, 0.7));
}

/** Катушки и реле панели «Bobinas…» с обычным корпусом 8×4: отличаются значком в левом отсеке. Только символы. */
function drawCoilVariant(g: SVGGElement, element: SchemaElement): void {
  const code = element.typeCode;
  drawCoil(g, element, false);
  const x = element.terminals[0]?.offset.x ?? 0;
  const mid = rowGapOf(element) / 2;
  const divider = (): SVGPathElement => path(`M ${x - 1} ${mid - 2} V ${mid + 2}`, 0.9);
  const solid = (): SVGRectElement => rect(x - 4, mid - 2, 3, 4, { fill: INK, 'stroke-width': 0.9 });
  switch (code) {
    case 9002: // телеразрывное реле: отсек со знаком «<»
      g.append(divider(), path(`M ${x - 1.2} ${mid - 1.5} L ${x - 3.6} ${mid} L ${x - 1.2} ${mid + 1.5} M ${x - 3.6} ${mid} H ${x - 1}`, 0.7));
      break;
    case 9003: // электроклапан: косая черта в корпусе и клапан-«песочные часы» справа
      g.append(
        path(`M ${x - 1.9} ${mid + 2} L ${x + 1.7} ${mid - 2}`, 0.8),
        path(`M ${x + 4} ${mid} H ${x + 6}`, 0.8),
        path(`M ${x + 5} ${mid - 3} H ${x + 7.2} L ${x + 5} ${mid + 3} H ${x + 7.2} Z`, 0.8),
      );
      break;
    case 9005: // на отключение: залитый отсек
      g.append(solid());
      break;
    case 9006: // на включение и отключение: залитый отсек со знаком выдержки
      g.append(solid(), path(`M ${x - 3.4} ${mid - 1.1} H ${x - 1.6} M ${x - 2.5} ${mid - 1.1} V ${mid + 1.1} M ${x - 3.4} ${mid + 1.1} H ${x - 1.6}`, 0.6, { stroke: '#fff' }));
      break;
    case 9007: // реле-прерыватель: «5» из прямых линий
      g.append(divider(), path(`M ${x - 1.9} ${mid - 1.2} H ${x - 3.2} V ${mid} H ${x - 1.9} V ${mid + 1.2} H ${x - 3.2}`, 0.7));
      break;
    case 9015: // генератор импульсов: «E»
      g.append(divider(), path(`M ${x - 1.9} ${mid - 1.3} H ${x - 3.2} V ${mid + 1.3} H ${x - 1.9} M ${x - 3.2} ${mid} H ${x - 2.2}`, 0.7));
      break;
    case 9014: // выключатель по времени: часы
      g.append(circle(x, mid, 1.7, { fill: 'none', 'stroke-width': 0.7, 'stroke-dasharray': '0.7 0.5' }), path(`M ${x} ${mid - 1.1} V ${mid} H ${x + 0.9}`, 0.6));
      break;
    default:
      break;
  }
}

/** Биестабильная катушка 9001: два верхних вывода A1 и B1, нижний A2 по центру корпуса, внутри две косые линии. */
function drawBistable(g: SVGGElement, element: SchemaElement): void {
  const [a1, b1, a2] = element.terminals;
  const xa = a1?.offset.x ?? 0;
  const xb = b1?.offset.x ?? 6;
  const xm = a2?.offset.x ?? 3;
  const gap = rowGapOf(element);
  const mid = gap / 2;
  g.append(path(`M ${xa} 0 V ${mid - 2} M ${xb} 0 V ${mid - 2} M ${xm} ${mid + 2} V ${gap}`));
  g.append(rect(xm - 4, mid - 2, 8, 4, { 'stroke-width': 0.9 }));
  g.append(path(`M ${xa + 1.6} ${mid - 2} L ${xa} ${mid + 2} M ${xb - 2.1} ${mid - 2} L ${xb - 0.3} ${mid + 2}`, 0.7));
}

/** Счётчик импульсов 9016: корпус 18×6 с отсеком-«шестерёнкой» слева; выводы A1 C D R сверху и A2 снизу. */
function drawCounter(g: SVGGElement, element: SchemaElement): void {
  const gap = rowGapOf(element);
  for (const t of element.terminals) {
    g.append(path(t.offset.y === 0 ? `M ${t.offset.x} 0 V 3` : `M ${t.offset.x} ${gap - 3} V ${gap}`));
  }
  g.append(rect(-3, 3, 18, gap - 6, { 'stroke-width': 0.9 }));
  g.append(path(`M 3 3 V ${gap - 3}`, 0.9));
  g.append(circle(0, gap / 2, 1.9, { fill: 'none', 'stroke-width': 0.7, 'stroke-dasharray': '0.8 0.6' }));
}

/** Звонок, зуммер, сирена и рупор: выводы X1 X2 сверху и снизу, справа знак устройства. Только символы. */
function drawSignal(g: SVGGElement, element: SchemaElement): void {
  const gap = rowGapOf(element);
  const mid = gap / 2;
  const lead = (hx: number): SVGPathElement => path(`M 0 0 V ${mid - 2} H ${hx} M 0 ${gap} V ${mid + 2} H ${hx}`);
  switch (element.typeCode) {
    case 9010: // звонок: «D»
      g.append(lead(4), path(`M 4 ${mid - 3} V ${mid + 3} M 4 ${mid - 3} C 8 ${mid - 3} 8 ${mid + 3} 4 ${mid + 3}`));
      break;
    case 9011: // зуммер
      g.append(lead(3), path(`M 5.5 ${mid - 3} H 6 V ${mid + 3} H 5.5 M 5.5 ${mid - 3} C 2.5 ${mid - 1.5} 2.5 ${mid + 1.5} 5.5 ${mid + 3}`));
      break;
    case 9012: // сирена: треугольник
      g.append(lead(4), path(`M 4 ${mid - 3} L 8.3 ${mid} L 4 ${mid + 3} Z`));
      break;
    default: // 9013, рупор: квадрат и раструб
      g.append(
        path(`M 0 0 V ${mid - 2} M 0 ${mid + 2} V ${gap}`),
        rect(-2, mid - 2, 4, 4, { 'stroke-width': 0.9 }),
        path(`M 2 ${mid - 0.8} L 5.6 ${mid - 1.5} H 6.5 L 8.2 ${mid + 0.6} V ${mid + 1.4} L 2 ${mid + 0.8}`),
      );
  }
}

/** Лампа-мигалка 9009: лампа 9008 и значок импульса справа. */
function drawFlashingLamp(g: SVGGElement, element: SchemaElement): void {
  drawLamp(g, element);
  const x = element.terminals[0]?.offset.x ?? 0;
  const mid = rowGapOf(element) / 2;
  g.append(path(`M ${x + 5.6} ${mid + 0.9} H ${x + 6.4} V ${mid - 0.7} H ${x + 7.6} V ${mid + 0.9} H ${x + 8.4}`, 0.7));
}

/** Клеммная колодка: ромбики с цветной подписью. Если меток в файле нет, подписи L1 L2 L3 N PE по числу клемм. */
function drawStrip(g: SVGGElement, element: SchemaElement, names: string[]): void {
  element.terminals.forEach((terminal, i) => {
    const { x, y } = terminal.offset;
    const color = STRIP_COLORS[names[i] ?? ''] ?? INK;
    const r = 1.7;
    g.append(shape('path', { d: `M ${x} ${y - r} L ${x + r} ${y} L ${x} ${y + r} L ${x - r} ${y} Z`, fill: '#fff', stroke: color, 'stroke-width': 0.8, 'vector-effect': 'non-scaling-stroke', class: 'strip-terminal' }));
    const name = names[i];
    if (name) g.append(label(name === '-' ? '\u2212' : name, x, y - 3.6, { size: 2.6, anchor: 'middle', fill: color }));
  });
}

/** Метки клемм колодок питания по типу, как их рисует CADe_SIMU (однофазная колодка подписана «L», не «L1»). */
const STRIP_NAMES: Readonly<Record<number, readonly string[]>> = {
  3000: ['L'],
  3001: ['N'],
  3002: ['PE'],
  3003: ['L', 'N'],
  3011: ['L', 'N', 'PE'],
  3004: ['L1', 'L2', 'L3'],
  3005: ['L1', 'L2', 'L3', 'PE'],
  3006: ['L1', 'L2', 'L3', 'N'],
  3007: ['L1', 'L2', 'L3', 'N', 'PE'],
  3008: ['+'],
  3009: ['-'],
  3010: ['+', '-'],
};

function stripNames(count: number, typeCode = 3007): string[] {
  const known = STRIP_NAMES[typeCode];
  if (known) return Array.from({ length: count }, (_, i) => known[i] ?? '');
  if (count >= 5) return ['L1', 'L2', 'L3', 'N', 'PE'].concat(Array.from({ length: count - 5 }, () => ''));
  if (count === 4) return ['L1', 'L2', 'L3', 'N'];
  if (count === 3) return ['L1', 'L2', 'L3'];
  return Array.from({ length: count }, () => '');
}

const isStrip = (typeCode: number): boolean => getCadType(typeCode).family === 'terminal-strip';

// ── Питание: земля, трансформаторы, диод, выпрямитель, блоки питания, батарея, розетка ──

/** Земля: вывод сверху (клемма в x) и три убывающие черты. */
function drawGround(g: SVGGElement, element: SchemaElement): void {
  const x = element.terminals[0]?.offset.x ?? 3;
  g.append(path(`M ${x} 0 V 4.6`));
  g.append(path(`M ${x - 4} 4.6 H ${x + 4} M ${x - 2.6} 6.8 H ${x + 2.6} M ${x - 1.2} 9 H ${x + 1.2}`));
}

/** Трансформатор: два чёрных блока обмоток, между ними три линии сердечника, выводы по краям колонок. */
function drawTransformer(g: SVGGElement, element: SchemaElement): void {
  const xs = columns(element);
  const gap = rowGapOf(element);
  const m = gap / 2;
  const left = xs[0] ?? 0;
  const right = xs[xs.length - 1] ?? left + 6;
  const block = (y0: number, y1: number): SVGRectElement => shape('rect', { x: left, y: y0, width: right - left, height: y1 - y0, fill: INK, stroke: INK, 'stroke-width': 0.3, 'vector-effect': 'non-scaling-stroke' });
  g.append(block(m - 4.8, m - 1.5), block(m + 1.5, m + 4.8));
  for (const dy of [-0.9, 0, 0.9]) g.append(path(`M ${left} ${m + dy} H ${right}`, 0.6));
  for (const x of xs) g.append(path(`M ${x} 0 V ${m - 4.8} M ${x} ${m + 4.8} V ${gap}`));
}

/** Диод: анод (клемма 1) сверху, катод (клемма 2) снизу, треугольник вершиной вниз. */
function drawDiode(g: SVGGElement, element: SchemaElement): void {
  const x = element.terminals[0]?.offset.x ?? 0;
  const gap = rowGapOf(element);
  g.append(path(`M ${x} 0 V ${gap}`));
  g.append(shape('path', { d: `M ${x - 3.3} 3 H ${x + 3.3} L ${x} 8 Z`, fill: INK, stroke: INK, 'stroke-width': 0.6, 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }));
  g.append(path(`M ${x - 3.3} 8 H ${x + 3.3}`, 0.9));
}

/** Мостовой выпрямитель: ромб 12×12 с диодом внутри и выводами 1 слева, 2 справа, 3 сверху, 4 снизу. */
function drawRectifier(g: SVGGElement): void {
  g.append(path('M 3 9 L 9 3 L 15 9 L 9 15 Z'));
  g.append(path('M 0 9 H 3 M 15 9 H 18 M 9 0 V 3 M 9 15 V 18'));
  g.append(dashed('M 3.6 9 H 6.6 M 11 9 H 14.4', '1.1 0.9', 0.6));
  g.append(shape('path', { d: 'M 6.6 7.1 V 10.9 L 10.4 9 Z', fill: INK, stroke: INK, 'stroke-width': 0.5, 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }));
  g.append(path('M 10.6 7.1 V 10.9', 0.9));
  g.append(label('+', 9, 4.9, { size: 2, anchor: 'middle' }));
  g.append(label('-', 9, 13.1, { size: 2, anchor: 'middle' }));
}

/** Блок питания ~/=: прямоугольник с диагональю, выводы сверху и снизу, PE справа. */
function drawPowerSupply(g: SVGGElement, element: SchemaElement): void {
  const pe = element.terminals[element.terminals.length - 1];
  const right = (pe?.offset.x ?? 12) - 3;
  const left = -3;
  g.append(rect(left, 3, right - left, 12, { fill: 'none', 'stroke-width': 0.9 }));
  g.append(path(`M ${left} 15 L ${right} 3`, 0.9));
  for (const t of element.terminals.slice(0, -1)) {
    if (t.offset.y <= 0) g.append(path(`M ${t.offset.x} 0 V 3`));
    else g.append(path(`M ${t.offset.x} 15 V ${t.offset.y}`));
  }
  if (pe) g.append(path(`M ${right} ${pe.offset.y} H ${pe.offset.x}`));
  g.append(path(`M ${left + 1.4} 6.2 q 0.9 -1.5 1.8 0 t 1.8 0`, 0.7));
  g.append(path(`M ${right - 4.6} 11.4 H ${right - 1.2} M ${right - 4.6} 12.7 H ${right - 1.2}`, 0.7));
  g.append(label('-', right - 2.9, 14.1, { size: 1.8, anchor: 'middle' }));
  g.append(label('+', left + 1.7, 13.5, { size: 1.8, anchor: 'middle' }));
}

/** Батарея/конденсатор: две пластины между выводами «+» (сверху) и «−» (снизу). */
function drawBattery(g: SVGGElement, element: SchemaElement): void {
  const x = element.terminals[0]?.offset.x ?? 0;
  const gap = rowGapOf(element);
  const mid = gap / 2;
  g.append(path(`M ${x} 0 V ${mid - 1.1} M ${x} ${mid + 1.1} V ${gap}`));
  g.append(path(`M ${x - 3} ${mid - 1.1} H ${x + 3} M ${x - 3} ${mid + 1.1} H ${x + 3}`, 0.9));
}

/** Розетка: круг с тремя контактами и тремя выводами (сверху, справа, снизу). Клемм в файле нет. */
function drawOutlet(g: SVGGElement): void {
  g.append(path('M 3 3 V 6 M 3 12 V 15 M 6 9 H 9'));
  g.append(circle(3, 9, 3, { fill: 'none' }));
  for (const [dx, dy] of [[-0.9, -1.2], [1.6, -0.3], [-0.8, 1.5]] as const) {
    g.append(shape('path', { d: `M ${3 + dx} ${9 + dy - 0.5} l 0.45 0.5 l -0.45 0.5 l -0.45 -0.5 Z`, fill: INK, stroke: INK, 'stroke-width': 0.3, 'vector-effect': 'non-scaling-stroke' }));
  }
}

// ── Предохранители ──────────────────────────────────────────────────────────

/** Предохранитель: вывод проходит сквозь прямоугольник 3.2×6 (клеммы x и x + 12 по вертикали). */
function drawFusePole(g: SVGGElement, x: number): void {
  g.append(rect(x - 1.6, G, 3.2, 6, { 'stroke-width': 0.9 }));
  g.append(path(`M ${x} 0 V ${ZONE}`));
}

/** Нейтральный полюс без предохранителя: линия с короткими поперечными засечками. */
function drawFuseNeutral(g: SVGGElement, x: number): void {
  g.append(path(`M ${x} 0 V ${ZONE} M ${x - 1.2} ${G} H ${x + 1.2} M ${x - 1.2} ${ZONE - G} H ${x + 1.2}`));
}

/** Предохранитель-разъединитель: наклонный корпус с осевой линией, выводы короткими отрезками. */
function drawFuseDisconnectorPole(g: SVGGElement, x: number): void {
  const cx = x - 1.5;
  g.append(path(`M ${x} 0 V ${G} M ${x} ${ZONE - G} V ${ZONE}`));
  g.append(group('fuse-body', rect(cx - 1.6, 2.5, 3.2, 7, { 'stroke-width': 0.9, transform: `rotate(-25 ${cx} 6)` }), path(`M ${cx} 2.5 V 9.5`, 0.8, { transform: `rotate(-25 ${cx} 6)` })));
}

/** Нейтральная лопасть разъединителя: от верхнего вывода влево-вверх к нижнему. */
function drawFuseDisconnectorBlade(g: SVGGElement, x: number): void {
  g.append(path(`M ${x} 0 V ${G} M ${x} ${ZONE - G} V ${ZONE} M ${x - 3} ${G} L ${x} ${ZONE - G}`));
}

function drawFuse(g: SVGGElement, element: SchemaElement): void {
  const xs = columns(element);
  const disconnector = element.typeCode >= 5005;
  const neutral = element.typeCode % 5 === 1 || element.typeCode % 5 === 4;
  xs.forEach((x, i) => {
    const isNeutral = neutral && i === xs.length - 1;
    if (!disconnector) {
      (isNeutral ? drawFuseNeutral : drawFusePole)(g, x);
      return;
    }
    // Разъединитель: в редакторе и в симуляции «отключён» — наклонное положение; после включения кликом вид как у обычного предохранителя.
    const open = group('fuse-open');
    (isNeutral ? drawFuseDisconnectorBlade : drawFuseDisconnectorPole)(open, x);
    const closed = group('fuse-closed');
    (isNeutral ? drawFuseNeutral : drawFusePole)(closed, x);
    g.append(open, closed);
  });
}

// ── Вспомогательные контакты 7000–7015 ──────────────────────────────────────

type AuxTiming = 'instant' | 'on' | 'off' | 'onoff';
type AuxShape = 'no' | 'nc' | 'nono' | 'con';

/** Код типа = 7000 + 4·(вид выдержки) + вид контакта: NA, NC, NA+NC, CON (порядок кнопок панели). */
function auxKind(typeCode: number): { timing: AuxTiming; shape: AuxShape } {
  const index = typeCode - 7000;
  const timings: readonly AuxTiming[] = ['instant', 'on', 'off', 'onoff'];
  const shapes: readonly AuxShape[] = ['no', 'nc', 'nono', 'con'];
  return { timing: timings[Math.floor(index / 4)] ?? 'instant', shape: shapes[index % 4] ?? 'no' };
}

/**
 * Знак выдержки слева от контакта (центр cx, высота 6). Возвращает группу и x правого края, откуда идёт пунктир привода:
 * на включение — дуга «(» с чертой внутрь, на отключение — дуга «)» с чертой слева, на включение-отключение — круг с чертой.
 */
function delayMark(timing: AuxTiming, cx: number): { mark: SVGGElement; right: number } {
  if (timing === 'on') {
    return { mark: group('delay-mark', path(`M ${cx} 3.8 A 2.4 2.4 0 0 0 ${cx} 8.2`, 0.8), path(`M ${cx - 1.9} 6 H ${cx + 2}`, 0.8)), right: cx + 2 };
  }
  if (timing === 'off') {
    return { mark: group('delay-mark', path(`M ${cx} 3.8 A 2.4 2.4 0 0 1 ${cx} 8.2`, 0.8), path(`M ${cx - 2.4} 6 H ${cx + 1.4}`, 0.8)), right: cx + 1.5 };
  }
  return { mark: group('delay-mark', circle(cx, 6, 2.6, { 'stroke-width': 0.8 }), path(`M ${cx - 1.9} 6 H ${cx + 1.9}`, 0.8)), right: cx + 2.6 };
}

/** Переключающий контакт CON: общий вывод сверху, НЗ и НО снизу; лопасть в покое лежит на НЗ, после срабатывания на НО. */
function conColumn(topX: number, ncX: number, noX: number, control: Control = 'aux'): SVGGElement {
  const stubs = path(`M ${topX} 0 V ${G} M ${ncX} ${ZONE - G} V ${ZONE} M ${noX} ${ZONE - G} V ${ZONE} M ${noX} ${ZONE - G} H ${noX - 1.8}`);
  const rest = group('blade-closed', path(`M ${topX} ${G} L ${ncX} ${ZONE - G}`));
  const switched = group('blade-open', path(`M ${topX} ${G} L ${noX} ${ZONE - G}`));
  return group(`contact by-${control} rest-closed`, stubs, rest, switched);
}

function drawAuxContact(g: SVGGElement, element: SchemaElement): void {
  const { timing, shape: kind } = auxKind(element.typeCode);
  const xs = columns(element);
  const rowGap = rowGapOf(element);
  // Левый край символа и x, до которого идёт пунктир к лопасти (середина последней лопасти).
  let left = xs[0] ?? 0;
  let linkTo = left;
  if (kind === 'con') {
    const top = element.terminals[0]?.offset.x ?? 3;
    const nc = element.terminals[1]?.offset.x ?? 0;
    const no = element.terminals[2]?.offset.x ?? 6;
    g.append(conColumn(top, nc, no));
    left = Math.min(top, nc, no);
    linkTo = top;
  } else if (kind === 'nono') {
    const nc = xs[0] ?? 0;
    const no = xs[1] ?? nc + 9;
    g.append(contactColumn(nc, rowGap, { nc: true, control: 'aux' }));
    g.append(contactColumn(no, rowGap, { control: 'aux' }));
    left = nc;
    linkTo = no - 1.5;
  } else {
    const x = xs[0] ?? 0;
    g.append(contactColumn(x, rowGap, { nc: kind === 'nc', control: 'aux' }));
    linkTo = kind === 'nc' ? x + 1.5 : x - 1.5;
  }
  if (timing === 'instant') return;
  // Подпись имени заканчивается на x = −8,5 (смещение −15 из образца), знак выдержки стоит правее, ближе к лопасти.
  const { mark, right } = delayMark(timing, left - 5.5);
  g.append(mark);
  g.append(dashed(`M ${right + 0.3} 6 H ${linkTo}`, '1.2 0.9'));
}

function drawBody(g: SVGGElement, element: SchemaElement, rotation: number): void {
  const { w, h } = element.size;
  const xs = columns(element);
  const rowGap = rowGapOf(element);
  switch (element.typeCode) {
    case 1000:
    case 1001:
    case 1002:
    case 1003:
    case 1004:
    case 1005:
    case 1008:
    case 1010:
      drawMotor(g, element);
      break;
    case 1006:
    case 1007:
      drawDcMotor(g, element);
      break;
    case 1011:
    case 1012:
      drawStepper(g, element);
      break;
    case 1009:
      drawBrake(g, element);
      break;
    case 2000:
    case 2001:
    case 2002:
    case 2006:
    case 2008:
      for (const x of xs) {
        g.append(contactColumn(x, rowGap, { control: 'engine' }));
        if (element.typeCode === 2008) g.append(contactorMark(x));
      }
      g.append(linkBar(xs));
      break;
    case 2003:
    case 2004:
    case 2005:
    case 2007:
      for (const x of xs) g.append(contactColumn(x, rowGap, { control: 'engine' }));
      g.append(linkBar(xs));
      g.append(switchActuator(xs[0] ?? 0));
      break;
    case 2009:
      drawInterlock(g, element, rotation);
      break;
    case 3000: case 3001: case 3002: case 3003: case 3004: case 3005: case 3006: case 3007:
    case 3008: case 3009: case 3010: case 3011:
      drawStrip(g, element, element.terminals.some((t) => t.label) ? element.terminals.map((t) => t.label) : stripNames(element.terminals.length, element.typeCode));
      break;
    case 3015:
      drawGround(g, element);
      break;
    case 3012:
    case 3017:
      drawTransformer(g, element);
      break;
    case 3016:
      drawDiode(g, element);
      break;
    case 3013:
      drawRectifier(g);
      break;
    case 3014:
    case 3018:
      drawPowerSupply(g, element);
      break;
    case 3019:
      drawBattery(g, element);
      break;
    case 3020:
      drawOutlet(g);
      break;
    case 5000: case 5001: case 5002: case 5003: case 5004:
    case 5005: case 5006: case 5007: case 5008: case 5009:
      drawFuse(g, element);
      break;
    case 6000:
    case 6001:
    case 6002:
    case 6003:
    case 6004:
      drawBreakerPoles(g, element);
      break;
    case 6005:
    case 6006:
      drawBreakerPoles(g, element);
      drawDifferentialBlock(g, element);
      break;
    case 6008:
    case 6009:
    case 6010:
    case 6011:
    case 6012:
      drawBreakerPoles(g, element);
      drawTripBlock(g, element);
      break;
    case 6013:
    case 6014:
      drawSurgeLimiter(g, element);
      break;
    case 6007:
      drawMotorProtection(g, element);
      break;
    case 7000: case 7001: case 7002: case 7003: case 7004: case 7005: case 7006: case 7007:
    case 7008: case 7009: case 7010: case 7011: case 7012: case 7013: case 7014: case 7015:
      drawAuxContact(g, element);
      break;
    case 8023:
      drawIndicator(g);
      break;
    case 8000:
    case 8001:
    case 8013: {
      const x = xs[0] ?? 0;
      const nc = element.typeCode === 8013 || element.typeCode === 8001;
      g.append(contactColumn(x, rowGap, { nc, control: 'engine' }));
      g.append(pushActuator(x, nc));
      break;
    }
    case 8002:
      drawPushPair(g, element, false);
      break;
    case 8006:
      drawPushPair(g, element, true);
      break;
    case 8003:
      drawPushChangeover(g, element);
      break;
    case 8004:
    case 8005: {
      const x = xs[0] ?? 0;
      const nc = element.typeCode === 8005;
      g.append(contactColumn(x, rowGap, { nc, control: 'engine' }));
      g.append(setaActuator(x, nc));
      break;
    }
    case 8018:
      drawThermalAux(g, element);
      break;
    case 9000:
      drawCoil(g, element, false);
      break;
    case 9004:
      drawCoil(g, element, true, rotation);
      break;
    case 9008:
      drawLamp(g, element);
      break;
    case 9001:
      drawBistable(g, element);
      break;
    case 9002:
    case 9003:
    case 9005:
    case 9006:
    case 9007:
    case 9014:
    case 9015:
      drawCoilVariant(g, element);
      break;
    case 9016:
      drawCounter(g, element);
      break;
    case 9009:
      drawFlashingLamp(g, element);
      break;
    case 9010:
    case 9011:
    case 9012:
    case 9013:
      drawSignal(g, element);
      break;
    default:
      g.append(shape('rect', { x: 0.8, y: 0.8, width: Math.max(2, w - 1.6), height: Math.max(2, h - 1.6), fill: '#fff', stroke: INK, 'stroke-width': 0.7, 'stroke-dasharray': '2 1', 'vector-effect': 'non-scaling-stroke' }));
      g.append(label(String(element.typeCode), w / 2, h / 2, { size: 2.4, anchor: 'middle', upright: rotation }));
  }
}

/** Место имени (-M, -Fr) у двигателей, у которых оно не слева от окружности. */
const NAME_SPOTS: Readonly<Record<number, { x: number; y: number; anchor: 'start' | 'middle' | 'end' }>> = {
  1006: { x: 0.2, y: 8, anchor: 'start' },
  1007: { x: 0.2, y: 5, anchor: 'start' },
  1011: { x: -2, y: 16, anchor: 'end' },
  1012: { x: -2, y: 16, anchor: 'end' },
  1009: { x: -6.5, y: 7.5, anchor: 'end' },
};

type LabelSpot = readonly [dx: number, dy: number, anchor: 'start' | 'middle' | 'end'];
const LEFT: LabelSpot = [-1, 0, 'end'];
const RIGHT: LabelSpot = [1, 0, 'start'];
const BELOW: LabelSpot = [0, 1.8, 'middle'];
const BELOW_RIGHT: LabelSpot = [1, 1.7, 'start'];
/** Метки клемм двигателей с боковыми выводами: по индексам клемм в порядке файла. */
const SIDE_LABELS: Readonly<Record<number, ReadonlyArray<LabelSpot | undefined>>> = {
  1006: [LEFT, RIGHT, BELOW_RIGHT],                  // A1 A2 PE
  1007: [LEFT, RIGHT, BELOW_RIGHT, LEFT, RIGHT],     // A1 A2 PE F1 F2
  1011: [LEFT, BELOW, LEFT, BELOW, LEFT, BELOW],     // 1 2 3 4 5 6
  1012: [LEFT, LEFT, BELOW, BELOW],                  // 1 2 3 4
  1008: [undefined, undefined, undefined, [-1.2, -1.7, 'end']],  // U2 слева от вывода: справа стоит конденсатор
};

/** Подписи клемм: верхний ряд — под клеммой справа от вывода, нижний — над клеммой. Колодка подписана выше. */
function drawTerminalLabels(g: SVGGElement, element: SchemaElement, rotation: number): void {
  // Колодки подписаны над клеммами; у земли, батареи и розетки подписей клемм на символе нет.
  if (isStrip(element.typeCode) || [3015, 3019, 3020].includes(element.typeCode)) return;
  if (element.terminals.length === 0) return;
  const minY = Math.min(...element.terminals.map((t) => t.offset.y));
  const sideSpots = SIDE_LABELS[element.typeCode];
  for (const [index, terminal] of element.terminals.entries()) {
    if (!terminal.label) continue;
    const { x, y } = terminal.offset;
    const spot = sideSpots?.[index];
    if (spot) {
      g.append(label(terminal.label, x + spot[0], y + spot[1], { size: 2.3, anchor: spot[2], upright: rotation }));
      continue;
    }
    const top = y <= minY;
    if (element.typeCode === 9008 || element.typeCode === 9009) {
      // Лампа повёрнута: подписи клемм ставим «вверх» в системе листа, а не в системе элемента.
      const k = ((4 - rotation / 90) % 4) as 0 | 1 | 2 | 3;
      const o = rotateOffset({ x: 0, y: -2.6 }, k);
      g.append(label(terminal.label, x + o.x, y + o.y, { size: 2.3, anchor: 'middle', upright: rotation }));
      continue;
    }
    g.append(label(terminal.label, x + 0.9, top ? y + 1.7 : y - 1.7, { size: 2.3, upright: rotation }));
  }
}

/** Создаёт символ элемента в стиле CADe_SIMU: тело, подписи клемм и имя. */
export function createElementSymbol(element: SchemaElement): SVGGElement | null {
  if (element.typeCode === 20000 || getCadType(element.typeCode).family === 'system') return null;
  const info = getCadType(element.typeCode);
  const canonical: SchemaElement = {
    ...element,
    size: unrotatedSize(element.size, element.rotation),
    terminals: buildTerminals(info, element.terminals.length, unrotatedSize(element.size, element.rotation), 0, element.terminals.map((terminal) => terminal.label)),
  };
  const root = shape('g', { class: 'schematic-element', 'data-element-id': element.id, 'data-type-code': element.typeCode, 'aria-label': `${element.name || info.label} — ${info.label}` });
  const rotation = element.rotation * 90;
  root.setAttribute('transform', `translate(${element.position.x} ${element.position.y}) rotate(${rotation})`);
  // Невидимая область захвата: без неё элемент из тонких линий трудно выделить и нажать.
  const txs = canonical.terminals.map((t) => t.offset.x);
  const tys = canonical.terminals.map((t) => t.offset.y);
  const hitLeft = Math.min(0, ...txs) - 3;
  const hitRight = Math.max(0, ...txs) + 4;
  const motorSpec = MOTOR_SPECS[element.typeCode];
  const hitBottom = motorSpec ? Math.max(0, ...tys, motorSpec.cy + MOTOR_R + 1) : Math.max(0, ...tys);  // двигатели с нижними выводами: их положение тоже считается
  // Символы, у которых тело шире или ниже клемм (земля, розетка), получают область захвата по своей рамке.
  const FRAME_HIT: Readonly<Record<number, { x: number; y: number; w: number; h: number }>> = {
    2009: { x: 0, y: -2, w: 24, h: 7 },
    3015: { x: -2, y: -1, w: 10, h: 11 },
    3020: { x: -1, y: 1, w: 11, h: 15 },
    // Круг-индикатор 8023 без клемм: область захвата по рамке 6×6 с запасом на кольцо.
    8023: { x: -0.5, y: -0.5, w: 7, h: 7 },
    // Двигатели без окружности радиуса 9: тело и выводы лежат вокруг начала координат, часть выше клемм (отрицательные y).
    1006: { x: -1, y: -11, w: 20, h: 18.5 },
    1007: { x: -1, y: -13.5, w: 20, h: 18.5 },
    1011: { x: -6, y: -1, w: 22, h: 19 },
    1012: { x: -6, y: -1, w: 22, h: 19 },
    1009: { x: -7, y: -1, w: 26, h: 12 },
    // Катушки и сигнализация: значок выступает вправо за клеммы.
    9003: { x: -5, y: -1, w: 16, h: 14 },
    9009: { x: -4, y: -1, w: 14, h: 14 },
    9010: { x: -2, y: -1, w: 11, h: 14 },
    9011: { x: -2, y: -1, w: 10, h: 14 },
    9012: { x: -2, y: -1, w: 12, h: 14 },
    9013: { x: -3, y: -1, w: 13, h: 14 },
  };
  const frameHit = FRAME_HIT[element.typeCode];
  root.append(frameHit
    ? shape('rect', { class: 'hit-area', x: frameHit.x, y: frameHit.y, width: frameHit.w, height: frameHit.h, fill: '#000', 'fill-opacity': 0, stroke: 'none' })
    : shape('rect', { class: 'hit-area', x: hitLeft, y: -1, width: hitRight - hitLeft, height: hitBottom + 2, fill: '#000', 'fill-opacity': 0, stroke: 'none' }));
  // Головка кнопки/привода выступает влево за основную область захвата: добавляем свою, чтобы нажимать прямо на неё.
  if ([2003, 2004, 2005, 2007].includes(element.typeCode)) {
    const hx = Math.min(...txs, 0);
    root.append(shape('rect', { class: 'hit-area', x: hx - 10, y: 2, width: 10, height: 8, fill: '#000', 'fill-opacity': 0, stroke: 'none' }));
  }
  // Привод кнопки (скоба или грибок) выступает влево от первой клеммы: у кнопок панели «Accionamientos» тоже есть своя область захвата.
  if ([8000, 8001, 8002, 8003, 8004, 8005, 8006, 8013].includes(element.typeCode)) {
    const hx = Math.min(...txs, 0);
    root.append(shape('rect', { class: 'hit-area', x: hx - 9, y: 1, width: 9, height: 10, fill: '#000', 'fill-opacity': 0, stroke: 'none' }));
  }
  drawBody(root, canonical, rotation);
  drawTerminalLabels(root, canonical, rotation);
  if (element.name && element.typeCode !== 2009) {
    const rowGap = rowGapOf(canonical);
    // Смещение подписи из .cad — левый верхний угол текста; у двигателя ряд клемм один, подпись по центру круга.
    const mid = motorSpec ? motorSpec.cy : rowGap > 0 ? rowGap / 2 : element.size.h / 2;
    const x = element.labelOffset.x + 6.5;
    const named = NAME_SPOTS[element.typeCode];
    if (rotation === 0) {
      root.append(named
        ? label(element.name, named.x, named.y, { size: 2.7, anchor: named.anchor, halo: true, fill: NAME_COLOR })
        : label(element.name, x, mid, { size: 2.7, anchor: 'end', halo: true, fill: NAME_COLOR }));
    } else {
      // Подпись повёрнутых элементов остаётся читаемой: рисуется в неповёрнутой системе координат.
      const wrapper = shape('g', { transform: `rotate(${-rotation})` });
      wrapper.append(label(element.name, element.labelOffset.x + 3, element.labelOffset.y + 3, { size: 2.7, halo: true, fill: NAME_COLOR }));
      root.append(wrapper);
    }
  }
  return root;
}
