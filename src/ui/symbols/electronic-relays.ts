/**
 * Символы панели «Relés electrónicos y protecciones» (model/electronic-relays.ts). Геометрия снята со скриншота
 * образца reles_electronicos.cad: рамка от y = 3 до y = 9, выводы от клемм до рамки (FORMATO_CAD §43).
 */
import type { SchemaElement } from "@model/types";
import {
  OVERVOLTAGE_4P, PHASE_FAIL, PHASE_FAIL_N, PHASE_SEQUENCE_N, RELAY_SPDT, SSR_3PH, SSR_AC, SSR_DC,
  SSR_REVERSING,
} from "@model/electronic-relays";

import { contactColumn } from "./contacts";
import { INK, group, label, path, rect, shape } from "./svg-primitives";

/** Место имени (-K, -F): слева от корпуса по середине высоты. */
export const ELECTRONIC_RELAY_NAME_SPOTS = Object.fromEntries([
  ...[SSR_DC, SSR_AC, SSR_3PH, SSR_REVERSING].map((code) => [code, { x: -4, y: 6, anchor: "end" as const }]),
  ...[9040, 9041, 9042, 9043, 9044, 9045, 1074, 1075].map((code) => [code, { x: -6, y: 6, anchor: "end" as const }]),
]);

const TOP = 3;
const BOTTOM = 9;
const ROW = 12;

/** Выводы клемм от верхнего ряда до рамки и от рамки до нижнего ряда. */
function leads(g: SVGGElement, top: readonly number[], bottom: readonly number[], from = TOP, to = BOTTOM): void {
  const d = [...top.map((x) => `M ${x} 0 V ${from}`), ...bottom.map((x) => `M ${x} ${to} V ${ROW}`)];
  if (d.length) g.append(path(d.join(" ")));
}

function box(g: SVGGElement, x0: number, x1: number, text: string, y0 = TOP, y1 = BOTTOM): void {
  g.append(rect(x0, y0, x1 - x0, y1 - y0, { fill: "none" }));
  if (text) g.append(label(text, (x0 + x1) / 2, (y0 + y1) / 2, { size: 2.9, anchor: "middle" }));
}

const mark = (text: string, x: number, y: number): SVGTextElement => label(text, x, y, { size: 2.1, anchor: "middle" });

/** Знак «~» переменного тока. */
const tilde = (x: number, y: number): SVGPathElement =>
  path(`M ${x - 1.1} ${y + 0.2} C ${x - 0.6} ${y - 0.9}, ${x + 0.1} ${y + 1}, ${x + 1.1} ${y - 0.3}`, 0.6);

export function drawSsr(g: SVGGElement, element: SchemaElement): void {
  if (element.typeCode === SSR_DC || element.typeCode === SSR_AC) {
    leads(g, [0, 6], [0, 6]);
    box(g, -3, 9, "SSR");
    if (element.typeCode === SSR_DC) g.append(mark("+", 0, 4), mark("-", 5.7, 4), mark("+", 0, 8));
    else g.append(tilde(0, 8.2), tilde(6, 8.2));
    return;
  }
  const reversing = element.typeCode === SSR_REVERSING;
  leads(g, reversing ? [0, 6, 12, 18, 24] : [0, 6, 12, 18], [0, 6, 12, 18]);
  box(g, -3, reversing ? 27 : 21, "SSR");
}

/** Реле контроля фаз (F) и чередования фаз (S). */
export function drawPhaseRelay(g: SVGGElement, element: SchemaElement): void {
  const withBottom = element.typeCode === PHASE_FAIL_N || element.typeCode === PHASE_SEQUENCE_N;
  leads(g, [0, 6, 12], withBottom ? [0] : []);
  box(g, -3, 15, element.typeCode === PHASE_FAIL_N || element.typeCode === PHASE_FAIL ? "F" : "S");
}

/** Лопасть полюса от верхней точки (tx, 3) к (x, 9) и чёрный квадрат расцепителя на ней. */
function blade(x: number, tx: number, withTrip: boolean): SVGGElement {
  const g = shape("g");
  g.append(path(`M ${tx} ${TOP} L ${x} ${BOTTOM}`));
  if (withTrip) {
    const len = Math.hypot(x - tx, BOTTOM - TOP);
    const [ux, uy] = [(x - tx) / len, (BOTTOM - TOP) / len];
    const [nx, ny] = [-uy, ux];
    const bx = tx + ux * 2.1;
    const by = TOP + uy * 2.1;
    const s = 1.8;
    const pts = [[bx - ux * s / 2, by - uy * s / 2], [bx + ux * s / 2, by + uy * s / 2]];
    const quad = [...pts, [pts[1]![0]! + nx * s, pts[1]![1]! + ny * s], [pts[0]![0]! + nx * s, pts[0]![1]! + ny * s]];
    g.append(shape("polygon", { points: quad.map((pt) => pt.join(",")).join(" "), fill: INK, stroke: "none" }));
  }
  return g;
}

/** Полюс аппарата: покой — лопасть разомкнута (как на рисунке CADe_SIMU), во включённом — замкнута. */
function pole(x: number, withTrip: boolean): SVGGElement {
  const dash = withTrip ? `M ${x - 1.5} 6 H ${x + 0.5}` : `M ${x - 3.5} 6 H ${x - 1.5}`;
  return group(
    "er-pole",
    path(`M ${x} 0 V ${TOP} M ${x} ${BOTTOM} V ${ROW} ${dash}`),
    group("er-open", blade(x, x - 3, withTrip)),
    group("er-closed", blade(x, x - 0.6, withTrip)),
  );
}

/** Защита от длительных перенапряжений: полюса с расцепителем (последний без него) и катушка U. */
export function drawOvervoltage(g: SVGGElement, element: SchemaElement): void {
  const four = element.typeCode === OVERVOLTAGE_4P;
  const poles = four ? [0, 6, 12, 18] : [0, 6];
  poles.forEach((x, i) => g.append(pole(x, i < poles.length - 1)));
  const coils = four ? [24, 30, 36] : [12];
  leads(g, coils, coils, 4, 8);
  if (four) box(g, 22, 38, "U", 4, 8);
  else box(g, 8, 16, "U", 4, 8);
  // До симуляции показан рисунок образца: лопасти разомкнуты.
  for (const node of g.querySelectorAll(".er-closed")) node.setAttribute("display", "none");
}

/** Реле с катушкой A1–A2 и контактом 13-14 (SPST) или переключающим 11 / 12 / 14 (SPDT). */
export function drawSmallRelay(g: SVGGElement, element: SchemaElement): void {
  g.append(path("M 0 0 V 4 M 0 8 V 12"));
  g.append(rect(-4, 4, 8, 4, { "stroke-width": 0.9 }));
  if (element.typeCode !== RELAY_SPDT) {
    g.append(contactColumn(9, ROW, { control: "aux" }));
    return;
  }
  // 12 (НЗ) слева сверху, 14 (НО) справа сверху, общий 11 снизу; лопасть в покое касается 12.
  g.append(path("M 9 0 V 3 H 10.8 M 15 0 V 3 H 13.2 M 12 9 V 12"));
  g.append(group(
    "contact by-aux",
    group("blade-open", path("M 12 9 L 9.6 1.8")),
    group("blade-closed", path("M 12 9 L 14.4 1.8")),
  ));
}
