import type { SchemaElement } from "@model/types";
import { isSimpleView } from "@model/realistic-2d-types";
import { S7_INPUTS, S7_OUTPUTS } from "@model/s7-1200";
import { S7_1214_LABELS, S7_1214_POINTS } from "@model/s7-1214";

import { circle, group, label, path, rect } from "./svg-primitives";
import { ioLed, screw } from "./s7-1200-symbol";

// ── ПЛК S7-1200, CPU 1214C AC/DC/RLY (10203, код CADe_SIMU), рамка 165×141 от (−3, −3) ──────────────────────
// По фото CADe_SIMU 4.2: серый корпус, сверху клеммник X10 (L1 N ⏚, L+ M 24VDC, 1M, DI a, DI b, AI), снизу справа
// релейные выходы X12 (1L .0….4, 2L .5….1), слева плата SB 1232 AQ и порт PROFINET. Лампочки входов и выходов —
// .logo-led-<операнд> (is-on в симуляции), «RUN» — .logo-run (simulation/element-plc.ts).

const BODY = "#cfd4d8";
const PANEL = "#e2e6e9";
const STRIP = "#2f3438";
const EDGE = "#30353a";
const INK = "#24292e";
const LIGHT = "#eef1f4";
const LED_OFF = "#7d868d";

const t = (value: string, x: number, y: number, rotation: number, size: number, fill = INK,
  anchor: "start" | "middle" | "end" = "middle") => label(value, x, y, { size, anchor, upright: rotation, fill });

const TOP = S7_1214_POINTS.filter((p) => p.y === 0).map((p) => p.x);
const BOTTOM = S7_1214_POINTS.filter((p) => p.y !== 0).map((p) => p.x);
const TOP_LABELS = S7_1214_LABELS.slice(0, TOP.length);
const BOTTOM_LABELS = S7_1214_LABELS.slice(TOP.length);
/** Клеммы входов I0.0…I1.5 и выходов Q0.0…Q1.1 (без 1L / 2L) — для простого вида, лампочки под клеммами. */
const INPUT_X = TOP.slice(6, 20);
const OUTPUT_X = BOTTOM.filter((_, k) => k !== 0 && k !== 6);
/** Цветной вид: лампочки справа группами DI a / DI b и DQ a / DQ b, как на корпусе. */
const ledX = (k: number): number => (k < 8 ? 84 + 4.6 * k : 124 + 4.6 * (k - 8));
const BOTTOM_Y = 138;

function leads(): SVGPathElement {
  const bottom = BOTTOM.map((x) => `M ${x} ${BOTTOM_Y - 4} V ${BOTTOM_Y}`);
  return path([...TOP.map((x) => `M ${x} 0 V 4`), ...bottom].join(" "));
}

/** Верхний клеммник X10: тёмная колодка с винтами, под ней подписи клемм и групп. */
function topBlock(rotation: number): SVGElement[] {
  return [
    rect(3, 4, 123.4, 11, { fill: STRIP, stroke: EDGE, "stroke-width": 0.4, rx: 0.8 }),
    rect(126, 4, 18.4, 11, { fill: STRIP, stroke: EDGE, "stroke-width": 0.4, rx: 0.8 }),
    ...TOP.flatMap((x, k) => [
      screw(x, 9.5), t(TOP_LABELS[k] === "PE" ? "⏚" : TOP_LABELS[k] ?? "", x, 18.4, rotation, 1.7),
    ]),
    path("M 3 20.6 H 144", 0.25, { stroke: "#9aa3aa" }),
    t("120-240VAC", 15, 23, rotation, 1.5), t("24VDC", 30, 23, rotation, 1.5),
    t("DI a", 66, 23, rotation, 1.5), t("DI b", 108, 23, rotation, 1.5), t("AI", 135, 23, rotation, 1.5),
    t("24VDC INPUTS", 84, 26, rotation, 1.4), t("ANALOG INPUTS", 135, 26, rotation, 1.2),
  ];
}

/** Нижний клеммник X12 релейных выходов. */
function bottomBlock(rotation: number): SVGElement[] {
  return [
    rect(75, 123, 78, 11, { fill: STRIP, stroke: EDGE, "stroke-width": 0.4, rx: 0.8 }),
    ...BOTTOM.flatMap((x, k) => [screw(x, 128.5), t(BOTTOM_LABELS[k] ?? "", x, 120.4, rotation, 1.7)]),
    t("RELAY OUTPUTS", 114, 113.6, rotation, 1.6),
    t("DQ a", 99, 117, rotation, 1.3), t("DQ b", 144, 117, rotation, 1.3),
  ];
}

/** Лампочки входов / выходов с номерами и надпись CPU, как на фото справа. */
function ioRows(rotation: number): SVGElement[] {
  return [
    t("DI a", 84, 44.6, rotation, 1.4, INK, "start"), t("DI b", 124, 44.6, rotation, 1.4, INK, "start"),
    ...S7_INPUTS.flatMap((name, k) => [...ioLed(name, ledX(k), 51), t(name.slice(3), ledX(k), 47.8, rotation, 1.3)]),
    t("CPU 1214C", 156, 64, rotation, 4.6, INK, "end"),
    t("AC/DC/RLY", 156, 70, rotation, 3.4, INK, "end"),
    t("DQ a", 84, 79.6, rotation, 1.4, INK, "start"), t("DQ b", 124, 79.6, rotation, 1.4, INK, "start"),
    ...S7_OUTPUTS.flatMap((name, k) => [...ioLed(name, ledX(k), 86), t(name.slice(3), ledX(k), 82.8, rotation, 1.3)]),
    t("6ES7 214-1BG40-0XB0", 150, 108, rotation, 1.3, "#4b5359", "end"),
  ];
}

/** Слева: лампочки RUN/STOP, ERROR, MAINT; плата SB 1232 AQ; порт PROFINET с адресом. */
function leftSide(rotation: number): SVGElement[] {
  const row = (y: number, text: string, fill: string) => [
    rect(3, y - 1.2, 4, 2.4, { fill, stroke: "none", rx: 0.4 }), t(text, 8.5, y, rotation, 1.5, INK, "start"),
  ];
  return [
    ...row(46, "RUN/STOP", "#d4a514"),
    group("logo-run", rect(3, 44.8, 4, 2.4, { fill: "#22c55e", stroke: "none", rx: 0.4 })),
    ...row(51, "ERROR", LED_OFF), ...row(56, "MAINT", LED_OFF),
    t("SIEMENS", 4, 36, rotation, 2.6, "#009999", "start"),
    rect(28, 30, 46, 70, { fill: PANEL, stroke: "#9aa3aa", "stroke-width": 0.35, rx: 1 }),
    t("SB 1232 AQ", 31, 35, rotation, 1.8, INK, "start"), t("AQ 1x12 BIT", 31, 38.4, rotation, 1.4, INK, "start"),
    t("6ES7 232-4HA30-0XB0", 31, 41.4, rotation, 1.2, "#4b5359", "start"),
    t("AQ 0", 51, 82, rotation, 1.6),
    rect(36, 104, 34, 30, { fill: STRIP, stroke: EDGE, "stroke-width": 0.4, rx: 0.8 }),
    ...[42, 48, 54, 60].map((x) => screw(x, 128.5)),
    t("0M", 42, 109, rotation, 1.4, LIGHT), t("0", 48, 109, rotation, 1.4, LIGHT),
    rect(2, 108, 30, 26, { fill: PANEL, stroke: "#9aa3aa", "stroke-width": 0.35, rx: 0.8 }),
    t("LAN", 17, 112, rotation, 1.6), t("X1 PN", 17, 115.4, rotation, 1.4),
    rect(9, 118, 16, 12, { fill: "#101315", stroke: EDGE, "stroke-width": 0.35, rx: 0.6 }),
    ...row(68, "LINK", LED_OFF), ...row(73, "Rx/Tx", LED_OFF),
  ];
}

function drawColor(g: SVGGElement, rotation: number): void {
  g.append(
    leads(),
    rect(-2, 3.5, 163, 131, { fill: BODY, stroke: EDGE, "stroke-width": 0.5, rx: 1.4 }),
    path("M -1 29 H 160 M -1 106 H 160", 0.3, { stroke: "#aab2b8" }),
    ...topBlock(rotation), ...bottomBlock(rotation), ...leftSide(rotation), ...ioRows(rotation),
    circle(156, 40, 2.4, { fill: PANEL, stroke: "#9aa3aa", "stroke-width": 0.3 }),
  );
}

function drawSimple(g: SVGGElement, rotation: number): void {
  const dark = "#4b5563";
  g.append(
    leads(),
    rect(-2, 4, 163, 130, { fill: "#fff", stroke: dark, "stroke-width": 0.6 }),
    path(`M -2 15 H 161 M -2 123 H 161`, 0.4, { stroke: dark }),
    ...TOP.map((x, k) => t(TOP_LABELS[k] ?? "", x, 7.6, rotation, 1.6, dark)),
    ...BOTTOM.map((x, k) => t(BOTTOM_LABELS[k] ?? "", x, 130.4, rotation, 1.6, dark)),
    ...S7_INPUTS.flatMap((name, k) => [
      ...ioLed(name, INPUT_X[k] ?? 0, 11.6, true), t(name.slice(1), INPUT_X[k] ?? 0, 11.6, rotation, 1.2, dark),
    ]),
    ...S7_OUTPUTS.flatMap((name, k) => [
      ...ioLed(name, OUTPUT_X[k] ?? 0, 126.4, true), t(name.slice(1), OUTPUT_X[k] ?? 0, 126.4, rotation, 1.2, dark),
    ]),
    t("S7-1200", 79.5, 62, rotation, 7, dark),
    t("CPU 1214C AC/DC/RLY", 79.5, 70, rotation, 2.8, dark),
    group("logo-run", t("RUN", 79.5, 78, rotation, 3, "#16a34a")),
  );
}

export function drawS7Ac(g: SVGGElement, element: SchemaElement, rotation: number): void {
  if (isSimpleView(element)) drawSimple(g, rotation);
  else drawColor(g, rotation);
}
