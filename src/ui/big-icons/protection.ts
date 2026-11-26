/**
 * Крупные значки категорий «Защита» и «Контакторы» — по образцу кнопок CADe_SIMU.
 * Полюс — нож с выводами. Автомат — залитый флажок на конце ножа; контактор — просто нож
 * (у «Контактор III» с дугой — дуга у верхнего вывода); выключатель — привод «⊢» слева.
 * УЗО — кнопка теста «⊞» и тороид-шестигранник снизу; мотор-автомат — блоки расцепителей под ножами.
 */
import { WIRE_N, drawShapes, rect } from './primitives';
import type { Actuator, Shape } from './primitives';

type PoleKind = 'breaker' | 'contactor' | 'switch';

function pole(cx: number, kind: PoleKind): Shape[] {
  const base = `M${cx} 3V13M${cx} 35V45M${cx} 35L${cx - 7} 15`;
  if (kind === 'breaker') return [base, { d: `M${cx - 12} 8L${cx - 2} 12L${cx - 9} 21Z`, fill: true }];
  if (kind === 'contactor') return [`${base}M${cx} 13A4 4 0 0 1 ${cx} 21`];
  return [base];
}

interface PoleRow {
  kind: PoleKind;
  poles: number;
  /** Последний полюс — нейтраль (синий, простой нож). */
  neutral?: boolean;
  /** Привод слева (кнопка теста, «⊢» выключателя). */
  actuator?: Actuator;
  /** Штриховая связь между полюсами (у контакторов в оригинале её нет). */
  link?: boolean;
  /** Дорисовать поверх (тороид УЗО); получает координаты полюсов. */
  extra?: (xs: readonly number[]) => Shape[];
}

function poleXs(count: number, withActuator: boolean): number[] {
  const left = withActuator ? 26 : 14;
  const right = 60;
  const step = count > 1 ? Math.min(14, (right - left) / (count - 1)) : 0;
  const center = withActuator ? (left + right) / 2 + 3 : 33;
  const first = center - (step * (count - 1)) / 2;
  return Array.from({ length: count }, (_, index) => Math.round(first + index * step));
}

function poleRow(row: PoleRow): () => SVGSVGElement {
  return () => {
    const count = row.poles + (row.neutral ? 1 : 0);
    const xs = poleXs(count, Boolean(row.actuator));
    const shapes: Shape[] = xs.flatMap((cx, index) => (row.neutral && index === count - 1
      ? [{ d: pole(cx, 'switch')[0] as string, color: WIRE_N }]
      : pole(cx, row.kind)));
    const linkFrom = row.actuator?.linkFrom ?? (row.link !== false && count > 1 ? (xs[0] ?? 0) - 4 : undefined);
    const linkTo = (xs[count - 1] ?? 0) - 4;
    if (linkFrom !== undefined && linkTo - linkFrom > 4) {
      shapes.unshift({ d: `M${linkFrom} 25H${linkTo}`, dash: true });
    }
    if (row.actuator?.path) shapes.push(row.actuator.path);
    if (row.extra) shapes.push(...row.extra(xs));
    return drawShapes(shapes);
  };
}

/** Кнопка теста «⊞» слева. */
const TEST_BUTTON: Actuator = { path: `${rect(2, 17, 15, 15)}M9.5 20V29M5 24.5H14`, linkFrom: 17 };

/** Тороид УЗО: вытянутый шестигранник поперёк полюсов снизу. */
const toroid = (xs: readonly number[]): Shape[] => {
  const x0 = (xs[0] ?? 0) - 8;
  const x1 = (xs[xs.length - 1] ?? 0) + 6;
  return [`M${x0} 40L${x0 + 4} 36H${x1 - 4}L${x1} 40L${x1 - 4} 44H${x0 + 4}Z`];
};

/** Тепловое реле: на каждом проводнике «скоба» нагревателя, всё в штриховой рамке. */
const thermalRelay = (): SVGSVGElement => {
  const xs = [14, 30, 46];
  const heaters = xs.map((x) => `M${x} 3V17H${x + 7}V31H${x}V45`);
  return drawShapes([...heaters, { d: rect(8, 12, 52, 24), dash: true }]);
};

/** Мотор-автомат: «⊞» слева, ножи сверху, под ними блоки расцепителей со «ступенькой». */
function motorBreaker(poles: number, neutral: boolean): () => SVGSVGElement {
  return () => {
    const cell = poles > 2 ? 12 : 16;
    const x0 = 19;
    const xs = Array.from({ length: poles }, (_, i) => x0 + cell * i + cell / 2);
    const shapes: Shape[] = [
      `${rect(2, 2, 13, 13)}M8.5 5V12M5 8.5H12`,
      { d: `M15 13H${(xs[poles - 1] ?? 0) - 3}M8 15V31H${x0}`, dash: true },
      rect(x0, 22, cell * poles, 18),
    ];
    for (const [i, x] of xs.entries()) {
      shapes.push(`M${x} 2V6M${x} 22L${x - 6} 7M${x} 40V46M${x - 3} 35V27H${x + 3}`);
      if (i > 0) shapes.push(`M${x - cell / 2} 22V40`);
    }
    if (neutral) shapes.push({ d: `M${x0 + cell * poles + 5} 2V46`, color: WIRE_N });
    return drawShapes(shapes);
  };
}

/** Привод выключателя «⊢». */
const SWITCH_HANDLE: Actuator = { path: 'M4 17V33M4 25H12', linkFrom: 12 };

/** Механическая блокировка: треугольник вершиной вниз на штриховой линии. */
const interlock = (): SVGSVGElement => drawShapes([
  { d: 'M4 16H60', dash: true },
  'M20 16H44L32 34Z',
]);

const PROTECTION_BIG_ICONS: Readonly<Record<number, () => SVGSVGElement>> = {
  32858: poleRow({ kind: 'breaker', poles: 1 }),
  32859: poleRow({ kind: 'breaker', poles: 1, neutral: true }),
  32860: poleRow({ kind: 'breaker', poles: 2 }),
  32861: poleRow({ kind: 'breaker', poles: 3 }),
  32862: poleRow({ kind: 'breaker', poles: 3, neutral: true }),
  32863: poleRow({ kind: 'switch', poles: 1, neutral: true, actuator: TEST_BUTTON, extra: toroid }),
  32864: poleRow({ kind: 'switch', poles: 3, neutral: true, actuator: TEST_BUTTON, extra: toroid }),
  32865: thermalRelay,
  32898: motorBreaker(1, false),
  33050: motorBreaker(1, true),
  32866: motorBreaker(2, false),
  32867: motorBreaker(3, false),
  33052: motorBreaker(3, true),
};

const CONTACTOR_BIG_ICONS: Readonly<Record<number, () => SVGSVGElement>> = {
  32899: poleRow({ kind: 'switch', poles: 1, link: false }),
  32834: poleRow({ kind: 'switch', poles: 2, link: false }),
  32833: poleRow({ kind: 'switch', poles: 3, link: false }),
  32835: poleRow({ kind: 'switch', poles: 4, link: false }),
  33219: poleRow({ kind: 'contactor', poles: 3, link: false }),
  32900: poleRow({ kind: 'switch', poles: 1, actuator: SWITCH_HANDLE }),
  32836: poleRow({ kind: 'switch', poles: 2, actuator: SWITCH_HANDLE }),
  32837: poleRow({ kind: 'switch', poles: 3, actuator: SWITCH_HANDLE }),
  32838: poleRow({ kind: 'switch', poles: 4, actuator: SWITCH_HANDLE }),
  33392: interlock,
};

export const PROTECTION_BIG_ICONS_ALL: Readonly<Record<number, () => SVGSVGElement>> = {
  ...PROTECTION_BIG_ICONS,
  ...CONTACTOR_BIG_ICONS,
};
