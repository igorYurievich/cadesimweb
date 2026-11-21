import type { SchemaElement } from "@model/types";
import { isSimpleView } from "@model/realistic-2d-types";

import { circle, group, label, path, rect } from "./svg-primitives";

// ── Блок питания 24 V на DIN-рейку 10220, корпус 18×94 в рамке 18×105 ───────────────────────────
// Цветной вид по фото: чёрный корпус 1 TE, сверху клеммы «+V» «−V», под ними уступ, лицевая панель с зелёной
// лампочкой, регулятором «Vo Adj.» и паспортными надписями, снизу клеммы «N» «L». Лампочка .psu-led
// горит в симуляции, пока на входе есть напряжение (класс is-psu-on, simulation/element-power.ts).
// Простой вид — прямоугольник со знаком преобразователя «~ / =» и подписями клемм.

const HOUSING = "#2b2e33";
const SHOULDER = "#33373d";
const FACE = "#1e2125";
const EDGE = "#15171a";
const STRIP = "#8a9097";
const INK = "#eef1f4";
const DARK = "#2b2f33";

const t = (value: string, x: number, y: number, rotation: number, size: number, fill = INK,
  anchor: "start" | "middle" | "end" = "middle") => label(value, x, y, { size, anchor, upright: rotation, fill });

const led = (x: number, y: number, w: number, h: number) =>
  rect(x, y, w, h, { class: "psu-led", fill: "#2f6b3f", stroke: "none", rx: 0.4 });

function screw(x: number, y: number): SVGGElement {
  return group(
    "d2-screw",
    circle(x, y, 2.2, { fill: "#0f1012", stroke: "#3d4148", "stroke-width": 0.35 }),
    path(`M ${x - 1.3} ${y + 0.7} L ${x + 1.3} ${y - 0.7}`, 0.5, { stroke: "#5b616a" }),
  );
}

const leads = (): SVGPathElement => path("M 6 0 V 4 M 12 0 V 4 M 6 98 V 102 M 12 98 V 102");

/** Клеммный блок с двумя винтами в общем углублении (верх — выход, низ — вход). */
function terminalBlock(y: number): SVGElement[] {
  return [
    rect(1.5, y, 15, 12, { fill: HOUSING, stroke: EDGE, "stroke-width": 0.35, rx: 0.6 }),
    rect(2.6, y + 2.2, 12.8, 7, { fill: "#17191c", stroke: "none", rx: 3.4 }),
    screw(6, y + 5.7), screw(12, y + 5.7),
  ];
}

/** Регулятор выходного напряжения с дугой шкалы. */
function potentiometer(): SVGElement[] {
  return [
    path("M 9 29.8 A 3.7 3.7 0 0 1 14.8 30.6", 0.3, { stroke: INK }),
    circle(11.8, 32.6, 2.4, { fill: "#0d0e10", stroke: "#4a4f57", "stroke-width": 0.35 }),
    path("M 11.8 32.6 L 10.5 31.3", 0.35, { stroke: "#6b717a" }),
  ];
}

function frontPanel(rotation: number): SVGElement[] {
  const text = (value: string, y: number, size = 1.05) => t(value, 2.2, y, rotation, size, INK, "start");
  return [
    rect(0, 22, 18, 58, { fill: "#2e3237", stroke: EDGE, "stroke-width": 0.45, rx: 0.8 }),
    rect(1.2, 24, 15.6, 54, { fill: FACE, stroke: "#3b4047", "stroke-width": 0.3 }),
    rect(1.2, 24, 15.6, 1.6, { fill: STRIP, stroke: "none" }), led(1.5, 24.15, 3.2, 1.3),
    t("+V", 6, 28, rotation, 1.5), t("-V", 12, 28, rotation, 1.5),
    text("Vo", 31.4, 1.15), text("Adj.", 33.1, 1.15), ...potentiometer(),
    text("21.6-29V", 37.4), text("Max.0.63A", 39.1), text("Max.15.2Watt", 40.8),
    text("INPUT:", 45.2, 1.15), text("100-240VAC", 47, 1.15), text("0.5A 50/60Hz", 48.8, 1.15),
    text("OUTPUT:", 50.6, 1.15), text("24V=0.63A", 52.4, 1.15),
    t("\"Terminal torque 4.4 Lb-In\"", 9, 56, rotation, 0.72),
    t("N", 6, 74.2, rotation, 1.5), t("L", 12, 74.2, rotation, 1.5),
    rect(1.2, 76.4, 15.6, 1.6, { fill: STRIP, stroke: "none" }),
  ];
}

function drawColor(g: SVGGElement, rotation: number): void {
  g.append(
    leads(),
    ...terminalBlock(4),
    rect(0.8, 16, 16.4, 6, { fill: SHOULDER, stroke: EDGE, "stroke-width": 0.35 }),
    ...frontPanel(rotation),
    rect(0.8, 80, 16.4, 6, { fill: SHOULDER, stroke: EDGE, "stroke-width": 0.35 }),
    ...terminalBlock(86),
  );
}

function drawSimple(g: SVGGElement, rotation: number): void {
  g.append(
    leads(),
    rect(0, 4, 18, 94, { fill: "#fff", stroke: "#4b5563", "stroke-width": 0.6 }),
    path("M 1.5 70 L 16.5 32", 0.5, { stroke: "#4b5563" }),
    t("=", 5, 40, rotation, 4, DARK), t("~", 13, 62, rotation, 4, DARK),
    t("24 V", 9, 22, rotation, 2.2, DARK), led(6.8, 14, 4.4, 1.6),
    t("+V", 6, 7.6, rotation, 1.6, DARK), t("-V", 12, 7.6, rotation, 1.6, DARK),
    t("N", 6, 94.4, rotation, 1.6, DARK), t("L", 12, 94.4, rotation, 1.6, DARK),
    t("230 V~", 9, 86, rotation, 1.8, DARK),
  );
}

export function drawDinPowerSupply(g: SVGGElement, element: SchemaElement, rotation: number): void {
  if (isSimpleView(element)) drawSimple(g, rotation);
  else drawColor(g, rotation);
}
