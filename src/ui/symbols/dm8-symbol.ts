import type { SchemaElement } from "@model/types";
import { isSimpleView } from "@model/realistic-2d-types";

import { circle, group, label, path, rect } from "./svg-primitives";
import { addressOf } from "./plc-address-registry";

// ── LOGO! DM8 10214 (расширение 4DI/4DO), корпус 42×96 в рамке 54×105 ────────
// По фото: тёмно-серый корпус, сверху клеммы X10 (P1 P2 и четыре входа), крышка со слотом, лицевая панель
// с «RUN/STOP», снизу два ряда выходов: X11 (Q1 Q2) и X12 (Q3 Q4). Подписи входов и выходов — адреса модуля
// (I9…I12, Q5…Q8 рядом с базовым LOGO, plc-modules.ts). Лампочки .logo-led-<адрес> и «RUN» — как у LOGO.

const BODY = "#5d6d7a";
const STRIP = "#6c7d8a";
const EDGE = "#33404a";
const INK = "#e8edf1";
const INPUT_X = [18, 24, 30, 36];
/** Выходы: x первой клеммы и y ряда винтов. */
const OUTPUTS: ReadonlyArray<readonly [number, number]> = [[9, 84], [27, 84], [6, 93.4], [30, 93.4]];

const t = (value: string, x: number, y: number, rotation: number, size: number, fill = INK,
  anchor: "start" | "middle" | "end" = "middle") => label(value, x, y, { size, anchor, upright: rotation, fill });

const led = (name: string, x: number, y: number, w: number, h = 2.2) => rect(x - w / 2, y - h / 2, w, h, {
  class: `logo-led logo-led-${name}`, fill: "#22c55e", "fill-opacity": 0, stroke: "none", rx: 0.5,
});

function screw(x: number, y: number): SVGGElement {
  return group(
    "d2-screw",
    circle(x, y, 1.9, { fill: "#cfd8df", stroke: "#2c3842", "stroke-width": 0.35 }),
    path(`M ${x - 1.2} ${y + 0.6} L ${x + 1.2} ${y - 0.6}`, 0.45, { stroke: "#2c3842" }),
  );
}

function leads(): SVGPathElement {
  const top = [6, 12, ...INPUT_X].map((x) => `M ${x} 0 V 3`);
  return path(top.join(" "));
}

/** Цвет выхода: оба вывода пары и подпись одного цвета, чтобы было видно, куда идёт каждый вывод. */
const OUTPUT_COLORS = ["#f59e0b", "#38bdf8", "#c084fc", "#34d399"];

/**
 * Выводы выходов: цветная линия от винта до точки подключения снизу (y = 102) и под корпусом номер клеммы
 * (5.1, 5.2 …). Ряды X11 и X12 стоят вперемешку через 3 клетки — без этого легко перепутать пары.
 */
function outputRouting(element: SchemaElement, rotation: number, screwsVisible: boolean): SVGElement[] {
  const outputs = addressOf(element)?.outputs ?? [];
  return OUTPUTS.flatMap(([x, y], k) => {
    const color = OUTPUT_COLORS[k] ?? INK;
    const number = (outputs[k] ?? `Q${k + 1}`).slice(1);
    const from = screwsVisible ? y + 1.9 : 99;
    return [0, 6].flatMap((dx, side) => [
      path(`M ${x + dx} ${from} V 102`, 0.5, { stroke: color }),
      label(`${number}.${side + 1}`, x + dx, 104.2, { size: 1.05, anchor: "middle", upright: rotation, fill: color }),
    ]);
  });
}

function ioLabels(element: SchemaElement, rotation: number, fill: string): SVGElement[] {
  const address = addressOf(element);
  const inputs = (address?.inputs ?? []).flatMap((name, k) => {
    const x = INPUT_X[k] ?? 0;
    return [led(name, x, 6, 4.4), t(name, x, 6, rotation, 1.6, fill)];
  });
  const outputs = (address?.outputs ?? []).flatMap((name, k) => {
    const [x, y] = OUTPUTS[k] ?? [0, 0];
    return [led(name, x + 3, y + 3.6, 4.6), t(name, x + 3, y + 3.6, rotation, 1.5, OUTPUT_COLORS[k] ?? fill)];
  });
  return [t("P1", 6, 6, rotation, 1.6, fill), t("P2", 12, 6, rotation, 1.6, fill), ...inputs, ...outputs];
}

function drawColor(g: SVGGElement, element: SchemaElement, rotation: number): void {
  g.append(
    leads(),
    rect(0, 3, 42, 96, { fill: BODY, stroke: EDGE, "stroke-width": 0.5, rx: 1.2 }),
    rect(0, 3, 42, 10.6, { fill: STRIP, stroke: EDGE, "stroke-width": 0.35 }),
    t("X", 1.8, 9.2, rotation, 1.2, INK, "start"), t("10", 1.8, 10.6, rotation, 1.1, INK, "start"),
    ...[6, 12, ...INPUT_X].map((x) => screw(x, 10)),
    rect(0, 13.6, 42, 11, { fill: STRIP, stroke: EDGE, "stroke-width": 0.35 }),
    rect(6.4, 15.4, 14, 7.2, { fill: "#2a3138", stroke: "#1a1f24", "stroke-width": 0.3 }),
    rect(21.4, 16.2, 2.6, 5.6, { fill: "#8a99a5", stroke: "#1a1f24", "stroke-width": 0.3 }),
    rect(29, 16, 10, 5, { fill: "none", stroke: INK, "stroke-width": 0.35 }),
    rect(0.6, 25, 40.8, 54.4, { fill: "#647684", stroke: EDGE, "stroke-width": 0.35 }),
    rect(5.2, 37.2, 1.8, 1.8, { fill: "#2a3138", stroke: "none" }),
    group("logo-run", rect(5.2, 37.2, 1.8, 1.8, { fill: "#22c55e", stroke: "none" })),
    t("RUN/STOP", 8, 38.2, rotation, 1.9, "#d4dde4", "start"),
    rect(0, 79.6, 42, 9.6, { fill: "#4f5d69", stroke: EDGE, "stroke-width": 0.35 }),
    rect(0, 89.2, 42, 9.8, { fill: "#4a5763", stroke: EDGE, "stroke-width": 0.35 }),
    t("X11", 1.2, 82, rotation, 1.2, INK, "start"), t("X12", 1.2, 91.4, rotation, 1.1, INK, "start"),
    circle(21, 84, 1.7, { fill: "#15191d", stroke: "none" }),
    circle(19, 93.4, 1.6, { fill: "#15191d", stroke: "none" }),
    circle(23.6, 93.4, 1.6, { fill: "#15191d", stroke: "none" }),
    ...outputRouting(element, rotation, true),
    ...OUTPUTS.flatMap(([x, y]) => [screw(x, y), screw(x + 6, y)]),
    ...ioLabels(element, rotation, INK),
  );
}

function drawSimple(g: SVGGElement, element: SchemaElement, rotation: number): void {
  g.append(
    leads(),
    rect(0, 3, 42, 96, { fill: "#fff", stroke: "#4b5563", "stroke-width": 0.6 }),
    path("M 0 13.6 H 42 M 0 79.6 H 42", 0.4, { stroke: "#4b5563" }),
    t("DM8", 21, 46, rotation, 4, "#4b5563"),
    group("logo-run", t("RUN", 21, 53, rotation, 2.4, "#16a34a")),
    ...outputRouting(element, rotation, false),
    ...ioLabels(element, rotation, "#2b2f33"),
  );
}

export function drawDm8(g: SVGGElement, element: SchemaElement, rotation: number): void {
  if (isSimpleView(element)) drawSimple(g, element, rotation);
  else drawColor(g, element, rotation);
}
