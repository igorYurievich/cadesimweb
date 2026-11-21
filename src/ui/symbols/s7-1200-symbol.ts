import type { SchemaElement } from "@model/types";
import { isSimpleView } from "@model/realistic-2d-types";
import { S7_INPUTS, S7_LABELS, S7_OUTPUTS, S7_POINTS } from "@model/s7-1200";

import { circle, group, label, path, rect } from "./svg-primitives";

// ── ПЛК S7-1200, CPU 1215C DC/DC/DC (10230), рамка 141×105 ─────────────────────────────────────
// Цветной вид по фото: светло-серый корпус, сверху и снизу тёмные откидные крышки клеммников, под верхним
// клеммником лампочки входов DI a / DI b, над нижним — выходов DQ a / DQ b; слева лампочки RUN/STOP, ERROR, MAINT,
// в середине крышка с надписями SIEMENS, SIMATIC S7-1200 и CPU 1215C DC/DC/DC, справа разъём AI / AQ и два
// порта PROFINET. В симуляции: .logo-led-<операнд> получает is-on, «RUN» горит зелёным, пока CPU в RUN
// (is-logo-run, simulation/element-plc.ts). Простой вид — прямоугольник с подписями клемм.

const BODY = "#d5d9dc";
const COVER = "#e6e9eb";
const DOOR = "#4a5056";
const EDGE = "#30353a";
const INK = "#24292e";
const LIGHT = "#eef1f4";
const TEAL = "#009999";
const LED_OFF = "#7d868d";

const t = (value: string, x: number, y: number, rotation: number, size: number, fill = INK,
  anchor: "start" | "middle" | "end" = "middle") => label(value, x, y, { size, anchor, upright: rotation, fill });

const TOP = S7_POINTS.filter((p) => p.y === 0).map((p) => p.x);
const BOTTOM = S7_POINTS.filter((p) => p.y !== 0).map((p) => p.x);
const TOP_LABELS = S7_LABELS.slice(0, TOP.length);
const BOTTOM_LABELS = S7_LABELS.slice(TOP.length);
/** x лампочек входов и выходов (над / под их клеммами). */
const INPUT_X = TOP.slice(3);
const OUTPUT_X = BOTTOM.slice(2);

/** Лампочка операнда: тусклое «стекло» и зелёная заливка поверх, включается классом is-on. */
function ioLed(name: string, x: number, y: number, simple = false): SVGElement[] {
  const w = 3.4;
  const h = 2.2;
  const lit = rect(x - w / 2, y - h / 2, w, h, {
    class: `logo-led ${simple ? "" : "logo-cell "}logo-led-${name}`, fill: "#22c55e", "fill-opacity": 0,
    stroke: "none", rx: 0.4,
  });
  return simple ? [lit] : [rect(x - w / 2, y - h / 2, w, h, { fill: LED_OFF, stroke: "none", rx: 0.4 }), lit];
}

function screw(x: number, y: number): SVGGElement {
  return group(
    "d2-screw",
    circle(x, y, 2, { fill: "#b9c0c6", stroke: "#22272c", "stroke-width": 0.35 }),
    path(`M ${x - 1.2} ${y + 0.6} L ${x + 1.2} ${y - 0.6}`, 0.45, { stroke: "#22272c" }),
  );
}

function leads(): SVGPathElement {
  return path([...TOP.map((x) => `M ${x} 0 V 4`), ...BOTTOM.map((x) => `M ${x} 98 V 102`)].join(" "));
}

/** Откидные крышки клеммников с винтами и подписями клемм. */
function terminalDoors(rotation: number): SVGElement[] {
  const door = (y: number) => rect(1, y, 139, 12, { fill: DOOR, stroke: EDGE, "stroke-width": 0.4, rx: 0.8 });
  return [
    door(4), door(86),
    ...TOP.flatMap((x, k) => [t(TOP_LABELS[k] ?? "", x, 7.2, rotation, 1.5, LIGHT), screw(x, 11.4)]),
    ...BOTTOM.flatMap((x, k) => [screw(x, 90.4), t(BOTTOM_LABELS[k] ?? "", x, 95, rotation, 1.5, LIGHT)]),
    t("X10", 136, 7.2, rotation, 1.2, LIGHT, "end"), t("X11", 136, 95, rotation, 1.2, LIGHT, "end"),
    t("24VDC", 12, 14.9, rotation, 1.1, LIGHT), t("24VDC", 12, 87.5, rotation, 1.1, LIGHT),
  ];
}

/** Лампочки входов под верхним клеммником и выходов над нижним, с подписями групп. */
function ioRows(rotation: number): SVGElement[] {
  return [
    ...S7_INPUTS.flatMap((name, k) => ioLed(name, INPUT_X[k] ?? 0, 19)),
    ...S7_OUTPUTS.flatMap((name, k) => ioLed(name, OUTPUT_X[k] ?? 0, 82.6)),
    t("DI a", 60, 22.4, rotation, 1.4), t("DI b", 108, 22.4, rotation, 1.4),
    t("DQ a", 48, 79.2, rotation, 1.4), t("DQ b", 84, 79.2, rotation, 1.4),
  ];
}

function statusLeds(rotation: number): SVGElement[] {
  const row = (y: number, text: string, fill: string) => [
    rect(4, y - 1.2, 4, 2.4, { fill, stroke: "none", rx: 0.4 }), t(text, 9.5, y, rotation, 1.5, INK, "start"),
  ];
  return [
    rect(2.5, 29, 24, 20, { fill: COVER, stroke: "#9aa3aa", "stroke-width": 0.3, rx: 0.6 }),
    // RUN/STOP: жёлтая в STOP, зелёная поверх, пока CPU в RUN (.logo-run).
    ...row(33, "RUN/STOP", "#d4a514"),
    group("logo-run", rect(4, 31.8, 4, 2.4, { fill: "#22c55e", stroke: "none", rx: 0.4 })),
    ...row(39, "ERROR", LED_OFF), ...row(45, "MAINT", LED_OFF),
  ];
}

function frontCover(rotation: number): SVGElement[] {
  return [
    rect(29, 27, 80, 48, { fill: COVER, stroke: "#9aa3aa", "stroke-width": 0.35, rx: 1 }),
    t("SIEMENS", 32, 32, rotation, 3.4, TEAL, "start"),
    t("SIMATIC", 106, 31.4, rotation, 2.2, INK, "end"), t("S7-1200", 106, 34.6, rotation, 2.6, INK, "end"),
    path("M 32 38 H 106", 0.3, { stroke: "#b4bcc2" }),
    t("CPU 1215C", 69, 47, rotation, 5, INK),
    t("DC/DC/DC", 69, 54, rotation, 3, INK),
    // Слот карты памяти и заказной номер.
    rect(53, 61, 32, 4, { fill: "#c3c9ce", stroke: "#8f989f", "stroke-width": 0.3, rx: 0.6 }),
    t("6ES7 215-1AG40-0XB0", 69, 70.4, rotation, 1.6, "#4b5359"),
  ];
}

/** Разъём аналоговых AI / AQ и два порта PROFINET X1 P1 / P2. */
function rightSide(rotation: number): SVGElement[] {
  const port = (y: number, name: string) => [
    rect(114, y, 20, 10, { fill: "#2c3136", stroke: EDGE, "stroke-width": 0.35, rx: 0.6 }),
    rect(118, y + 2.4, 12, 6, { fill: "#101315", stroke: "none" }),
    rect(121.5, y + 6.6, 5, 1.8, { fill: "#2c3136", stroke: "none" }),
    rect(115, y + 0.8, 2.4, 1.4, { fill: "#22c55e", stroke: "none", "fill-opacity": 0.7 }),
    t(name, 136, y + 5, rotation, 1.3, INK, "start"),
  ];
  return [
    rect(112, 27, 26, 14, { fill: "#babfc4", stroke: "#8f989f", "stroke-width": 0.35, rx: 0.6 }),
    t("AI 0 1   AQ 0 1", 125, 30.6, rotation, 1.2, INK),
    rect(114, 33, 22, 5.6, { fill: "#30353a", stroke: "none", rx: 0.5 }),
    ...[0, 1, 2, 3, 4, 5].map((k) => circle(116.6 + 3.4 * k, 35.8, 0.9, { fill: "#9aa3aa", stroke: "none" })),
    t("X1 PN", 125, 46, rotation, 1.3, INK), t("LINK Rx/Tx", 125, 48.6, rotation, 1.1, INK),
    ...port(51, "P1"), ...port(63, "P2"),
  ];
}

function drawColor(g: SVGGElement, rotation: number): void {
  g.append(
    leads(),
    rect(0.5, 3.5, 140, 95, { fill: BODY, stroke: EDGE, "stroke-width": 0.5, rx: 1.4 }),
    // Рёбра вентиляции у верхнего и нижнего клеммника.
    path("M 3 16.6 H 138 M 3 85.4 H 138", 0.3, { stroke: "#aab2b8" }),
    ...terminalDoors(rotation), ...ioRows(rotation), ...statusLeds(rotation), ...frontCover(rotation),
    ...rightSide(rotation),
  );
}

function drawSimple(g: SVGGElement, rotation: number): void {
  const dark = "#4b5563";
  g.append(
    leads(),
    rect(1, 4, 139, 94, { fill: "#fff", stroke: dark, "stroke-width": 0.6 }),
    path("M 1 15 H 140 M 1 87 H 140", 0.4, { stroke: dark }),
    ...TOP.map((x, k) => t(TOP_LABELS[k] ?? "", x, 7.4, rotation, 1.6, dark)),
    ...BOTTOM.map((x, k) => t(BOTTOM_LABELS[k] ?? "", x, 94.6, rotation, 1.6, dark)),
    ...S7_INPUTS.flatMap((name, k) => [
      ...ioLed(name, INPUT_X[k] ?? 0, 11.6, true), t(name.slice(1), INPUT_X[k] ?? 0, 11.6, rotation, 1.2, dark),
    ]),
    ...S7_OUTPUTS.flatMap((name, k) => [
      ...ioLed(name, OUTPUT_X[k] ?? 0, 90.2, true), t(name.slice(1), OUTPUT_X[k] ?? 0, 90.2, rotation, 1.2, dark),
    ]),
    t("S7-1200", 70.5, 46, rotation, 6, dark),
    t("CPU 1215C DC/DC/DC", 70.5, 53, rotation, 2.4, dark),
    group("logo-run", t("RUN", 70.5, 60, rotation, 2.6, "#16a34a")),
  );
}

export function drawS7(g: SVGGElement, element: SchemaElement, rotation: number): void {
  if (isSimpleView(element)) drawSimple(g, rotation);
  else drawColor(g, rotation);
}
