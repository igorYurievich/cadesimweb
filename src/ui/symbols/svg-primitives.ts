/**
 * Символы элементов в стиле CADe_SIMU (IEC 60617).
 *
 * Геометрия сверена с эталонными скриншотами assets/reference: шаг клемм 6, расстояние между
 * рядами клемм R = h − 3 (обычно 12). Контакт занимает зону 0..12: верхний вывод до y = 3,
 * лопасть между y = 3 и y = 9, нижний вывод от y = 9. Контакты рисуются в двух положениях
 * (`.blade-open` / `.blade-closed`), переключает их CSS по классам состояния симуляции.
 * Цвет линий берётся из `currentColor` группы: серый в покое, красный под напряжением.
 */

const NS = "http://www.w3.org/2000/svg";

export const INK = "currentColor";

export const NAME_COLOR = "#111418";

export const STRIP_COLORS: Record<string, string> = {
  L: "#7a1313",
  L1: "#7a1313",
  L2: "#7a1313",
  L3: "#7a1313",
  N: "#1530ff",
  PE: "#0a8a1c",
};

type Attrs = Record<string, string | number>;

export function shape<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  return el;
}

export function group(className: string, ...children: Element[]): SVGGElement {
  const g = shape("g", { class: className });
  g.append(...children);
  return g;
}

/** Линия символа: тонкая, цвет из currentColor, не масштабируется вместе с листом. */
export function path(d: string, width = 0.8, extra: Attrs = {}): SVGPathElement {
  return shape("path", {
    d,
    fill: "none",
    stroke: INK,
    "stroke-width": width,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "vector-effect": "non-scaling-stroke",
    ...extra,
  });
}

export function dashed(d: string, dash = "1.5 1.2", width = 0.7): SVGPathElement {
  return path(d, width, { "stroke-dasharray": dash, "stroke-linecap": "butt" });
}

export function rect(x: number, y: number, w: number, h: number, extra: Attrs = {}): SVGRectElement {
  return shape("rect", {
    x,
    y,
    width: w,
    height: h,
    fill: "#fff",
    stroke: INK,
    "stroke-width": 0.8,
    "vector-effect": "non-scaling-stroke",
    ...extra,
  });
}

export function circle(cx: number, cy: number, r: number, extra: Attrs = {}): SVGCircleElement {
  return shape("circle", {
    cx,
    cy,
    r,
    fill: "#fff",
    stroke: INK,
    "stroke-width": 0.8,
    "vector-effect": "non-scaling-stroke",
    ...extra,
  });
}

export function label(
  value: string,
  x: number,
  y: number,
  opts: {
    size?: number;
    anchor?: "start" | "middle" | "end";
    fill?: string;
    halo?: boolean;
    upright?: number;
  } = {},
): SVGTextElement {
  const { size = 2.9, anchor = "start", fill = INK, halo = false, upright = 0 } = opts;
  const el = shape("text", {
    x,
    y,
    fill,
    "font-size": size,
    "font-weight": 700,
    "font-family": "Arial, Helvetica, sans-serif",
    "text-anchor": anchor,
    "dominant-baseline": "central",
  });
  if (halo) {
    el.setAttribute("paint-order", "stroke");
    el.setAttribute("stroke", "#fff");
    el.setAttribute("stroke-width", "0.7");
    el.setAttribute("stroke-linejoin", "round");
    el.setAttribute("vector-effect", "non-scaling-stroke");
  }
  if (upright) el.setAttribute("transform", `rotate(${-upright} ${x} ${y})`);
  el.textContent = value;
  return el;
}
