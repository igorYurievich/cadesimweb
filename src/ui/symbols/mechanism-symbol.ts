import type { SchemaElement } from "@model/types";
import { isSimpleView } from "@model/realistic-2d-types";
import {
  MECHANISM_SPECS, MECH_BULB, MECH_CROSS, MECH_PUSH, MECH_SOCKET, MECH_SWITCH, MECH_TWO_WAY, isBackView,
} from "@model/mechanisms";

import { drawMechanismBack } from "./mechanism-back";
import { circle, group, label, path, rect } from "./svg-primitives";

// ── Механизмы Niessen Zenit (8120…8124), рамка 24×30: белая рамка 24×24 (y = 3…27), выводы до y = 0 / 30 ──────
// Цветной вид по фото: белая рамка, клавиша с тёмным контуром (у кнопки — окошко посередине), у розетки —
// квадратная вставка с круглым гнездом Schuko, двумя отверстиями, винтом и скобами заземления.
// В симуляции класс is-d2-on (simulation/element-2d.ts): клавиша нажата другой стороной, контакты простого вида
// переключаются (.d2-switch .d2-on / .d2-off); у розетки под напряжением — красное кольцо и «230 V ~».
// Лампочка E27 (8125, рамка 18×27, L (6, 27) и N (12, 27) снизу; колба нарисована в 24×36 и сжата в 0,7): прозрачная колба с нитью, цоколь с резьбой; под напряжением
// колба светится тёплым жёлтым (is-lamp-lit → .pilot-lit / .pilot-off, simulation/element-switches.ts).

const PLATE = "#fbfbfa";
const PLATE_EDGE = "#c3c6c9";
const INK = "#26282b";
const GREY = "#8a8f94";
const LIVE = "#e3181f";

const t = (value: string, x: number, y: number, rotation: number, size: number, fill = INK,
  anchor: "start" | "middle" | "end" = "middle") => label(value, x, y, { size, anchor, upright: rotation, fill });

const points = (code: number) => MECHANISM_SPECS[code]?.points ?? [];

/** Выводы от клемм до рамки и подписи клемм снаружи, рядом с выводом. */
function leads(code: number, rotation: number, edgeTop: number, edgeBottom: number): SVGElement[] {
  const spec = MECHANISM_SPECS[code];
  if (!spec) return [];
  return [
    path(spec.points.map((p) => `M ${p.x} ${p.y} V ${p.y === 0 ? edgeTop : edgeBottom}`).join(" ")),
    ...spec.points.map((p, k) =>
      t(spec.labels[k] ?? "", p.x + 1.1, p.y === 0 ? 1.9 : p.y - 0.7, rotation, 1.5, GREY, "start")),
  ];
}

function plate(): SVGElement[] {
  return [
    rect(0.3, 3.3, 23.4, 23.4, { fill: PLATE, stroke: PLATE_EDGE, "stroke-width": 0.4, rx: 1.4 }),
    path("M 1.2 26.4 H 23 M 23.4 4.4 V 26", 0.35, { stroke: "#dfe1e3" }),
  ];
}

const brand = (rotation: number) => t("NIESSEN", 22.4, 25.4, rotation, 0.95, "#6b7075", "end");

/** Клавиша: тень снизу — включено «вверх» (покой), тень сверху — нажата (is-d2-on). */
function rocker(code: number): SVGElement[] {
  const band = (y: number) => rect(5.3, y, 13.4, 1.4, { fill: "#a9adb1", stroke: "none", "fill-opacity": 0.55 });
  const parts: SVGElement[] = [
    rect(5, 8, 14, 14, { fill: "#ffffff", stroke: "#2e3134", "stroke-width": 0.5, rx: 0.5 }),
    group("d2-switch", group("d2-off", band(20.3)), group("d2-on", band(8.3))),
  ];
  if (code === MECH_PUSH) {
    parts.push(
      circle(12, 15, 1.9, { fill: "#eef0f1", stroke: "#9da2a6", "stroke-width": 0.35 }),
      group("d2-switch", group("d2-on", circle(12, 15, 1.2, { fill: "#f59e0b", stroke: "none" }))),
    );
  }
  // Значок типа на рамке над клавишей: ⇄ — проходной, ✕ — перекрёстный.
  if (code === MECH_TWO_WAY) {
    parts.push(path("M 10.4 5.7 H 13.6 M 10.4 5.7 l 0.8 -0.6 M 10.4 5.7 l 0.8 0.6 M 13.6 5.7 l -0.8 -0.6 "
      + "M 13.6 5.7 l -0.8 0.6", 0.3, { stroke: GREY }));
  }
  if (code === MECH_CROSS) parts.push(path("M 11 4.7 L 13 6.7 M 13 4.7 L 11 6.7", 0.3, { stroke: GREY }));
  return parts;
}

function socket(rotation: number): SVGElement[] {
  const holes = [9.2, 14.8].map((x) =>
    circle(x, 15, 1.05, { fill: "#1b1d1f", stroke: "#4b4f53", "stroke-width": 0.2 }));
  return [
    rect(4, 7, 16, 16, { fill: "#ffffff", stroke: "#cfd2d5", "stroke-width": 0.35, rx: 0.3 }),
    circle(12, 15, 6.6, { fill: "#e8eaeb", stroke: "#cdd0d3", "stroke-width": 0.35 }),
    rect(11.2, 8.5, 1.6, 1.7, { fill: "#9ea3a7", stroke: "#6d7276", "stroke-width": 0.2, rx: 0.2 }),
    rect(11.2, 19.8, 1.6, 1.7, { fill: "#9ea3a7", stroke: "#6d7276", "stroke-width": 0.2, rx: 0.2 }),
    ...holes,
    circle(12, 15, 0.9, { fill: "#d8dbdd", stroke: "#4b4f53", "stroke-width": 0.25 }),
    path("M 11.5 15 H 12.5 M 12 14.5 V 15.5", 0.2, { stroke: "#4b4f53" }),
    group("d2-switch", group(
      "d2-on",
      circle(12, 15, 7.1, { fill: "none", stroke: LIVE, "stroke-width": 0.5 }),
      t("230 V ~", 12, 5.6, rotation, 1.3, LIVE),
    )),
  ];
}

// ── Лампочка E27 ───────────────────────────────────────────────────────────────────────────────────────

const GLASS = "M 7.6 23 C 7.6 19.4 2.4 16.6 2.4 11 A 9.6 9.6 0 0 1 21.6 11 C 21.6 16.6 16.4 19.4 16.4 23 Z";

function bulbLeads(rotation: number, d = "M 6 27 V 24.6 L 8.4 23.1 M 12 27 V 20.4"): SVGElement[] {
  return [
    path(d),
    t("L", 5.2, 26.4, rotation, 1.4, GREY, "end"), t("N", 12.8, 26.4, rotation, 1.4, GREY, "start"),
  ];
}

/** Колба и цоколь нарисованы в 24×36 (центр x = 12) и сжаты в 0,7 к центру рамки 18×27. */
function scaled(...children: SVGElement[]): SVGGElement {
  const g = group("bulb-scale", ...children);
  g.setAttribute("transform", "translate(0.6 0) scale(0.7)");
  return g;
}

function drawBulb(g: SVGGElement, rotation: number): void {
  const filament = (stroke: string, width: number) => path(
    "M 10.3 23 L 8.6 11.6 M 13.7 23 L 15.4 11.6 M 8.6 11.6 q 0.42 -0.9 0.85 0 q 0.42 -0.9 0.85 0 q 0.42 -0.9 0.85 0 "
    + "q 0.42 -0.9 0.85 0 q 0.42 -0.9 0.85 0 q 0.42 -0.9 0.85 0 q 0.42 -0.9 0.85 0 q 0.42 -0.9 0.85 0",
    width, { stroke, fill: "none" },
  );
  const ridges = [24.4, 26.1, 27.8, 29.5].map((y) => path(`M 7.4 ${y + 0.5} L 16.6 ${y - 0.3}`, 0.45,
    { stroke: "#7d8389" }));
  g.append(...bulbLeads(rotation), scaled(
    group("pilot-off", path(GLASS, 0.4, { fill: "#eef3f6", "fill-opacity": 0.7, stroke: "#aab4bc" })),
    group("pilot-lit", path(GLASS, 0.4, {
      fill: "#fff1a8", stroke: "#e0a800", style: "filter: drop-shadow(0 0 3px #ffd84a)",
    })),
    path("M 6 8 C 6.6 5.6 8.4 4 10.4 3.4", 0.7, { stroke: "#ffffff", "stroke-opacity": 0.9, fill: "none" }),
    rect(11.2, 15.6, 1.6, 7.4, { fill: "#e3eaee", stroke: "#b5c0c7", "stroke-width": 0.25, rx: 0.4 }),
    group("pilot-off", filament("#5b6166", 0.35)),
    group("pilot-lit", filament("#ff8a00", 0.5)),
    rect(7.4, 22.6, 9.2, 1.2, { fill: "#d9b77a", stroke: "none" }),
    rect(7.4, 23.6, 9.2, 7, { fill: "#c9ced3", stroke: "#6f757b", "stroke-width": 0.35, rx: 0.6 }),
    ...ridges,
    rect(8.2, 30.5, 7.6, 1.5, { fill: "#2b2d2f", stroke: "none", rx: 0.3 }),
    path("M 10.3 32 H 13.7 L 12.9 33.2 H 11.1 Z", 0.3, { fill: "#b9bfc4", stroke: "#6f757b" }),
  ));
}

function drawBulbSimple(g: SVGGElement, rotation: number): void {
  g.append(
    ...bulbLeads(rotation, "M 6 27 V 21 L 9 17.5 M 12 27 V 21 L 9 17.5"),
    group("pilot-off", circle(9, 11.5, 6, { fill: "#fff", stroke: "currentColor", "stroke-width": 0.6 })),
    group("pilot-lit", circle(9, 11.5, 6, {
      fill: "#fff1a8", stroke: "#e0a800", "stroke-width": 0.6, style: "filter: drop-shadow(0 0 3px #ffd84a)",
    })),
    path("M 4.76 7.26 L 13.24 15.74 M 13.24 7.26 L 4.76 15.74", 0.6),
  );
}

function drawColor(g: SVGGElement, code: number, rotation: number): void {
  if (code === MECH_BULB) { drawBulb(g, rotation); return; }
  g.append(...leads(code, rotation, 3.3, 26.7), ...plate());
  g.append(...(code === MECH_SOCKET ? socket(rotation) : rocker(code)), brand(rotation));
}

// ── Простой вид: условные обозначения ─────────────────────────────────────────────────────────────────────

const dot = (x: number, y: number) => circle(x, y, 0.55, { fill: "currentColor", stroke: "none" });
const state = (off: string, on: string, width = 0.6) =>
  group("d2-switch", group("d2-off", path(off, width)), group("d2-on", path(on, width)));

function simpleBody(code: number): SVGElement[] {
  switch (code) {
    case MECH_SWITCH:
      return [path("M 12 0 V 10 M 12 20 V 30"), dot(12, 20), state("M 12 20 L 7 10.8", "M 12 20 L 12 10")];
    case MECH_PUSH:
      return [
        path("M 12 0 V 10 M 12 20 V 30"), dot(12, 20), state("M 12 20 L 7.6 10.6", "M 12 20 L 12 10"),
        path("M 3.4 12.6 V 17.4 M 3.4 15 H 9.6", 0.4, { "stroke-dasharray": "1 0.8" }),
      ];
    case MECH_TWO_WAY:
      return [
        path("M 12 0 V 10 M 6 20 V 30 M 18 20 V 30"), dot(12, 10), dot(6, 20), dot(18, 20),
        state("M 12 10 L 6 20", "M 12 10 L 18 20"),
      ];
    case MECH_CROSS:
      return [
        path("M 6 0 V 10 M 18 0 V 10 M 6 20 V 30 M 18 20 V 30"),
        ...[[6, 10], [18, 10], [6, 20], [18, 20]].map(([x, y]) => dot(x!, y!)),
        state("M 6 10 V 20 M 18 10 V 20", "M 6 10 L 18 20 M 18 10 L 6 20"),
        rect(3, 8, 18, 14, { fill: "none", stroke: "currentColor", "stroke-width": 0.3, "stroke-dasharray": "1 1" }),
      ];
    default:
      return [
        path("M 6 30 V 14 M 18 30 V 14 M 12 30 V 20"),
        path("M 6 14 A 6 6 0 0 0 18 14", 0.7),
        path("M 8.5 9.5 H 15.5", 0.6),
        group("d2-switch", group("d2-on", path("M 6 14 A 6 6 0 0 0 18 14", 0.9, { stroke: LIVE }))),
      ];
  }
}

function drawSimple(g: SVGGElement, code: number, rotation: number): void {
  if (code === MECH_BULB) { drawBulbSimple(g, rotation); return; }
  g.append(
    ...simpleBody(code),
    ...points(code).map((p, k) =>
      t(MECHANISM_SPECS[code]?.labels[k] ?? "", p.x + 1.1, p.y === 0 ? 1.9 : 29.3, rotation, 1.5, GREY, "start")),
  );
}

export function drawMechanism(g: SVGGElement, element: SchemaElement, rotation: number): void {
  if (isBackView(element)) drawMechanismBack(g, element.typeCode, rotation);
  else if (isSimpleView(element)) drawSimple(g, element.typeCode, rotation);
  else drawColor(g, element.typeCode, rotation);
}
