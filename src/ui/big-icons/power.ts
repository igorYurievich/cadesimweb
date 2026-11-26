/**
 * Крупные значки категорий «Источники питания» и «Предохранители»: питание — буква и клемма
 * (нейтраль синяя, защитный зелёный), предохранители — толстые вертикальные корпуса.
 */
import { WIRE_N, WIRE_PE, circle, drawShapes, rect } from './primitives';
import type { IconText, Shape } from './primitives';

type Conductor = 'L' | 'N' | 'PE' | '+' | '−';

/** Цвет вывода: нейтраль синяя, защитный зелёный, остальные — цвета текста. */
const CONDUCTOR_COLOR: Partial<Record<Conductor, string>> = { N: WIRE_N, PE: WIRE_PE };

/**
 * Питание как на кнопках CADe_SIMU: над каждым выводом буква (L, N, PE, +, −),
 * под ней кружок-клемма и провод вниз. Так это читается как источник, а не как провод.
 */
function supply(conductors: readonly Conductor[]): () => SVGSVGElement {
  return () => {
    const step = conductors.length > 1 ? Math.min(14, 48 / (conductors.length - 1)) : 0;
    const first = 32 - (step * (conductors.length - 1)) / 2;
    const xs = conductors.map((_, index) => Math.round(first + index * step));
    const shapes: Shape[] = conductors.map((kind, index) => {
      const x = xs[index] ?? 32;
      const d = `M${x} 17V19${circle(x, 23, 4)}M${x} 27V45`;
      const color = CONDUCTOR_COLOR[kind];
      return color ? { d, color } : d;
    });
    const size = conductors.length > 4 ? 8 : conductors.length > 2 ? 10 : 13;
    const texts: IconText[] = conductors.map((kind, index) => ({
      x: xs[index] ?? 32, y: 9, text: kind, size, color: CONDUCTOR_COLOR[kind],
    }));
    return drawShapes(shapes, [], texts);
  };
}

/** Заземление: вывод сверху и три убывающие черты. */
const earth = (): SVGSVGElement => drawShapes([
  { d: 'M32 4V22', color: WIRE_PE },
  'M16 22H48M22 31H42M28 40H36',
]);

/** Блок питания: квадрат с диагональю, «~» входа и «=» выхода; число выводов сверху — фазы. */
function converter(phases: 1 | 3): () => SVGSVGElement {
  const xs = phases === 1 ? [32] : [24, 32, 40];
  const inputs = xs.map((x) => `M${x} 2V9`).join('');
  return () => drawShapes([
    rect(14, 9, 36, 30),
    'M14 39L50 9',
    'M18 19C21 13 24 13 27 19S33 25 36 19',
    'M35 29H45M35 34H45',
    inputs,
    'M32 39V46',
  ]);
}

/** Аккумулятор: две банки (длинная пластина «+», короткая «−»). */
const battery = (): SVGSVGElement => drawShapes([
  'M4 24H20M44 24H60',
  'M20 10V38M28 17V31M36 10V38M44 17V31',
]);

const POWER_SOURCE_BIG_ICONS: Readonly<Record<number, () => SVGSVGElement>> = {
  32873: supply(['L']),
  32874: supply(['N']),
  32883: supply(['PE']),
  32872: supply(['L', 'N']),
  32906: supply(['L', 'N', 'PE']),
  32870: supply(['L', 'L', 'L']),
  32879: supply(['L', 'L', 'L', 'PE']),
  32869: supply(['L', 'L', 'L', 'N']),
  32882: supply(['L', 'L', 'L', 'N', 'PE']),
  32876: supply(['+']),
  32877: supply(['−']),
  32875: supply(['+', '−']),
  33042: earth,
  32998: converter(1),
  33044: converter(3),
  33046: battery,
};

/** Предохранитель: корпус и проходящая сквозь него линия. */
function fuse(cx: number): string {
  return `${rect(cx - 3.5, 11, 7, 26)}M${cx} 3V45`;
}

/**
 * Предохранитель-разъединитель: тот же корпус на ноже, отклонённом влево от нижней опоры.
 * Углы корпуса считаются вдоль ножа, чтобы он оставался прямоугольником.
 */
function fuseSwitch(cx: number): string {
  const [px, py] = [cx, 40];
  const [tx, ty] = [cx - 8, 12];
  const len = Math.hypot(tx - px, ty - py);
  const [ux, uy] = [(tx - px) / len, (ty - py) / len];
  const [nx, ny] = [-uy * 3.5, ux * 3.5];
  const at = (t: number, side: number): string =>
    `${Math.round((px + ux * t + nx * side) * 10) / 10} ${Math.round((py + uy * t + ny * side) * 10) / 10}`;
  return `M${cx} 3V10M${cx} 40V45M${px} ${py}L${tx} ${ty}`
    + `M${at(6, 1)}L${at(24, 1)}L${at(24, -1)}L${at(6, -1)}Z`;
}

/** Полюса слева направо; последний «N» — нейтраль, просто синяя линия. */
function fuseRow(poles: number, neutral: boolean, switched: boolean): () => SVGSVGElement {
  const count = poles + (neutral ? 1 : 0);
  const step = count > 1 ? Math.min(16, 44 / (count - 1)) : 0;
  const first = 32 - (step * (count - 1)) / 2;
  return () => {
    const shapes: Shape[] = [];
    for (let index = 0; index < count; index += 1) {
      const cx = Math.round(first + index * step);
      if (neutral && index === count - 1) shapes.push({ d: `M${cx} 3V45`, color: WIRE_N });
      else shapes.push(switched ? fuseSwitch(cx) : fuse(cx));
    }
    return drawShapes(shapes);
  };
}

const FUSE_BIG_ICONS: Readonly<Record<number, () => SVGSVGElement>> = {
  32853: fuseRow(1, false, false),
  32842: fuseRow(1, true, false),
  32839: fuseRow(2, false, false),
  32840: fuseRow(3, false, false),
  32841: fuseRow(3, true, false),
  32854: fuseRow(1, false, true),
  32843: fuseRow(1, true, true),
  32844: fuseRow(2, false, true),
  32845: fuseRow(3, false, true),
  32848: fuseRow(3, true, true),
};

export const POWER_BIG_ICONS: Readonly<Record<number, () => SVGSVGElement>> = {
  ...POWER_SOURCE_BIG_ICONS,
  ...FUSE_BIG_ICONS,
};
