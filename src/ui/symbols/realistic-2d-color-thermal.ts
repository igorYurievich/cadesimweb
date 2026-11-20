import type { SchemaElement } from "@model/types";

import { circle, group, label, path, rect } from "./svg-primitives";

// ── Цветной вид теплового реле 6016 ─────────────────────────────────────────
// По фото реле LRD: светлый корпус с зелёной полосой, слева окно уставки (шкала 4-5-6, окошко «H», флажок
// срабатывания), справа синяя RESET и красная STOP; ниже полоса 97 98 95 96 и тёмная колодка 2T1 4T2 6T3.
// Геометрия как у простого вида (realistic-2d-thermal.ts): корпус x −6…18, y 6…30, клеммы те же.
// Сработало (класс is-d2-on) — в окошке красный флажок (группа .d2-on).

const LIGHT = "#e4e4e1";
const PANEL = "#d6d6d2";
const EDGE = "#9b9b97";
const GREEN = "#1d9f55";

const box = (x: number, y: number, w: number, h: number, fill: string, extra: Record<string, number> = {}) =>
  rect(x, y, w, h, { fill, stroke: EDGE, "stroke-width": 0.35, ...extra });

const note = (value: string, x: number, y: number, rotation: number, fill: string, size = 0.8) =>
  label(value, x, y, { size, anchor: "middle", upright: rotation, fill });

/** Тёмный винт клеммы с крестовым шлицем. */
function darkScrew(x: number, y: number, r = 1.35): SVGGElement {
  const d = r * 0.55;
  return group(
    "d2-screw",
    circle(x, y, r, { fill: "#2f3032", stroke: "#18191a", "stroke-width": 0.3 }),
    path(`M ${x - d} ${y} H ${x + d} M ${x} ${y - d} V ${y + d}`, 0.35, { stroke: "#8c8d90" }),
  );
}

/** Окно уставки: надпись, шкала с винтом регулировки, окошко «H» и флажок срабатывания. */
function settingPanel(rotation: number): SVGElement[] {
  return [
    box(-5.2, 8.6, 10.2, 11.4, PANEL, { rx: 0.6 }),
    label("LRD 10", -4.6, 10.6, { size: 0.9, anchor: "start", upright: rotation, fill: "#8a8a86" }),
    circle(-2.2, 16.4, 1.9, { fill: "#eeeeeb", stroke: EDGE, "stroke-width": 0.35 }),
    path("M -3.2 16.4 H -1.2 M -2.2 15.4 V 17.4", 0.45, { stroke: "#6d6d6a" }),
    note("4", -4.5, 17.4, rotation, "#777", 0.7), note("5", -2.2, 14.1, rotation, "#777", 0.7),
    note("6", 0.1, 17.4, rotation, "#777", 0.7),
    box(1.1, 10, 2.4, 2.6, "#2c2d2f"),
    box(1.3, 13.2, 2, 2.4, "#cfd0cc"), note("H", 2.3, 14.9, rotation, "#666", 1),
    rect(1.4, 16.2, 1.8, 1.2, { fill: "#2c2d2f" }), note("A", 2.3, 18.9, rotation, "#777", 0.9),
    group("d2-switch", group("d2-on", rect(0.6, 9.4, 4, 4, { fill: "#e3262b" }))),
  ];
}

export function drawThermalRelayColor(g: SVGGElement, _element: SchemaElement, rotation: number): void {
  const auxScrews = [-2.3, 3.3, 8.7, 14];
  const auxLabels = ["97 NO", "98 NO", "95 NC", "96 NC"];
  g.append(
    path("M 0 0 V 6 M 6 0 V 6 M 12 0 V 6"),
    path("M 0 30 V 36 M 6 30 V 36 M 12 30 V 36 M -3 30 V 33 M 3 30 V 33 M 9 30 V 33 M 15 30 V 33"),
    // Верхний корпус с зелёной полосой и кнопками RESET / STOP.
    box(-6, 6, 24, 15.4, LIGHT, { rx: 0.6 }),
    rect(5.4, 7.2, 11.6, 0.9, { fill: GREEN }),
    ...settingPanel(rotation),
    note("RESET", 9.8, 11.4, rotation, GREEN, 0.85),
    box(13.2, 9.6, 3, 2.7, "#2f5fc9", { rx: 0.4 }),
    note("STOP", 10, 16.7, rotation, GREEN, 0.85),
    box(13.2, 14.8, 3, 2.7, "#d8302c", { rx: 0.4 }),
    rect(17.6, 12, 0.7, 3, { fill: "#2c2d2f" }),
    // Полоса вспомогательных контактов и тёмная колодка силовых выводов.
    box(-6, 21.4, 24, 5, "#dadad6"),
    ...auxScrews.map((x) => darkScrew(x, 23.2)),
    ...auxScrews.map((x, k) => note(auxLabels[k] ?? "", x, 25.7, rotation, "#6b6b68", 0.75)),
    box(-4.8, 26.4, 21.6, 3.6, "#6e6f71"),
    ...[0, 6, 12].map((x) => darkScrew(x, 28.2, 1.2)),
    ...["2T1", "4T2", "6T3"].map((name, k) => note(name, 6 * k - 2.6, 29.3, rotation, "#d4d4d4", 0.75)),
  );
}
