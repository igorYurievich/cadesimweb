import type { SchemaElement } from "@model/types";

import { INK, circle, dashed, group, label, path } from "./svg-primitives";

// Высота рабочей зоны контакта.
export const ZONE = 12;

export const G = 3;

export type Control = "engine" | "open" | "trip" | "aux" | "pressed";

interface ContactOptions {
  /** NO: в покое разомкнут; NC: в покое замкнут. */
  nc?: boolean;
  /** Причина переключения контакта. */
  control?: Control;
  /** Метка расцепителя (чёрная точка на лопасти) у автоматов. */
  blob?: boolean;
  /** У контактов теплового реле замкнутая НО лопасть изображается прямой. */
  straightClosed?: boolean;
  /** У разомкнутого НЗ термореле — чистая диагональ без ступеньки. */
  straightOpenNc?: boolean;
}

/** Один полюс контакта в колонке x. Два положения лопасти лежат в отдельных группах. */
export function contactColumn(x: number, _rowGap: number, opts: ContactOptions = {}): SVGGElement {
  const {
    nc = false,
    control = "engine",
    blob = false,
    straightClosed = false,
    straightOpenNc = false,
  } = opts;
  const bottom = ZONE - G;
  const stubs = path(`M ${x} 0 V ${G} M ${x} ${bottom} V ${ZONE}`);
  const open = group("blade-open");
  const closed = group("blade-closed");
  if (!nc) {
    open.append(path(`M ${x - 3} ${G} L ${x} ${bottom}`));
    closed.append(
      path(straightClosed ? `M ${x} ${G} V ${bottom}` : `M ${x} ${G} H ${x - 1} L ${x} ${bottom}`),
    );
    if (blob) {
      open.append(circle(x - 2.1, G + 1.2, 0.75, { fill: INK, "stroke-width": 0.2 }));
      closed.append(circle(x - 0.85, G + 1.7, 0.75, { fill: INK, "stroke-width": 0.2 }));
    }
  } else {
    open.append(
      path(
        straightOpenNc
          ? `M ${x} ${bottom} L ${x + 3} ${G}`
          : `M ${x} ${G} H ${x + 3} L ${x + 1.9} ${bottom - 1.6}`,
      ),
    );
    closed.append(path(`M ${x} ${G} H ${x + 3} L ${x} ${bottom}`));
  }
  const col = group(
    `contact by-${control}${nc ? " rest-closed" : ""}${!nc && control === "open" ? " rest-closed" : ""}`,
    stubs,
    open,
    closed,
  );
  return col;
}

/** Колонки полюсов: x-координаты клемм верхнего ряда (или всех клемм, если ряд один). */
export function columns(element: SchemaElement): number[] {
  return [...new Set(element.terminals.map((t) => t.offset.x))].sort((a, b) => a - b);
}

export function rowGapOf(element: SchemaElement): number {
  return Math.max(0, ...element.terminals.map((t) => t.offset.y));
}

/** Пунктирная механическая связь между полюсами на уровне середины контакта. */
export function linkBar(xs: number[], y = ZONE / 2): SVGPathElement {
  const first = xs[0] ?? 0;
  const last = xs[xs.length - 1] ?? 0;
  return dashed(`M ${first + 0.8} ${y} H ${last + 3.2}`, "2.2 1.7");
}

/** Знак функции контактора (дуга слева от вывода, «d»): Contactor III 2008. */
export function contactorMark(x: number): SVGPathElement {
  return path(`M ${x} 1 A 1 1 0 0 0 ${x} ${G}`);
}

/** Блокировка двух контакторов: имена с подчёркиванием, между ними треугольник вершиной вниз. */
export function drawInterlock(g: SVGGElement, element: SchemaElement, rotation: number): void {
  const mid = 1.5;
  g.append(path(`M 1.3 ${mid} H 9.2 M 14.8 ${mid} H 22.7`));
  g.append(path(`M 10.2 ${mid - 1.9} H 13.8 L 12 ${mid + 1.8} Z`, 0.8));
  g.append(label(element.name, 1.3, mid - 1.6, { size: 2.6, upright: rotation }));
  g.append(label(element.func, 17.6, mid - 1.6, { size: 2.6, upright: rotation }));
}
