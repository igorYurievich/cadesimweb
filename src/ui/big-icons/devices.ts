/**
 * Крупные значки «Механизмов» (условные обозначения на плане квартиры) и «Инсталляций».
 */
import { circle, drawShapes, rect } from './primitives';

/** Плановый выключатель: кружок и рычаг с засечкой (рычаги задаются углами в градусах). */
function wallSwitch(levers: readonly number[]): () => SVGSVGElement {
  const [cx, cy, r, len] = [32, 26, 6, 20];
  const paths = levers.map((deg) => {
    const a = (deg * Math.PI) / 180;
    const [ux, uy] = [Math.cos(a), -Math.sin(a)];
    const [sx, sy] = [cx + ux * r, cy + uy * r];
    const [ex, ey] = [cx + ux * (r + len), cy + uy * (r + len)];
    const [tx, ty] = [ex - uy * 6, ey + ux * 6];
    const f = (v: number): number => Math.round(v);
    return `M${f(sx)} ${f(sy)}L${f(ex)} ${f(ey)}L${f(tx)} ${f(ty)}`;
  });
  return () => drawShapes(paths, [circle(cx, cy, r)]);
}

/** Перекрёстный (cruzamiento), как в CADe_SIMU: пустой кружок и четыре плеча наискось с загибом наружу. */
function crossSwitch(): SVGSVGElement {
  const [cx, cy, r, len, tick] = [32, 24, 6, 13, 6];
  const arms = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([ux = 0, uy = 0]) => {
    const k = Math.SQRT1_2;
    const [sx, sy] = [cx + ux * k * r, cy + uy * k * r];
    const [ex, ey] = [sx + ux * k * len, sy + uy * k * len];
    const [tx, ty] = [ex + ux * k * tick, ey - uy * k * tick];
    const f = (v: number): number => Math.round(v * 10) / 10;
    return `M${f(sx)} ${f(sy)}L${f(ex)} ${f(ey)}L${f(tx)} ${f(ty)}`;
  });
  return drawShapes([circle(cx, cy, r), ...arms]);
}

const MECHANISM_BIG_ICONS: Readonly<Record<number, () => SVGSVGElement>> = {
  34003: wallSwitch([50]),
  34004: wallSwitch([50, 230]),
  34005: crossSwitch,
  34006: () => drawShapes([circle(32, 24, 14)], [circle(32, 24, 6)]),
  34007: () => drawShapes(['M16 30A16 16 0 0 1 48 30H16Z', 'M32 30V46', 'M14 14H50']),
  34008: () => drawShapes([circle(32, 24, 15), 'M21.4 13.4L42.6 34.6M42.6 13.4L21.4 34.6']),
};

const INSTALLATION_BIG_ICONS: Readonly<Record<number, () => SVGSVGElement>> = {
  // Лифт: шахта и стрелки вверх/вниз.
  34012: () => drawShapes([rect(16, 3, 32, 42), 'M32 3V45'], ['M20 20L26 11L30 20Z', 'M34 28L38 37L44 28Z']),
};

export const DEVICE_BIG_ICONS: Readonly<Record<number, () => SVGSVGElement>> = {
  ...MECHANISM_BIG_ICONS,
  ...INSTALLATION_BIG_ICONS,
};
