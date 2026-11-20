import type { SchemaElement } from "@model/types";

import { circle, group, label, path, rect } from "./svg-primitives";

// ── Цветной вид блока вспомогательных контактов 7019 ────────────────────────
// По фото приставки LADN: кремовый корпус с защёлками сверху и снизу, подписи «53 NO»… у защёлок,
// тёмные винты, зелёная полоса, окошко для маркировки и синий толкатель справа. Геометрия как у простого
// вида (realistic-2d-aux.ts): корпус x −3…21, клеммы с шагом 6 на y = 0 и y = 27.
// Катушка включена (класс is-d2-on) — толкатель утоплен вниз (группа .d2-on).

const BODY = "#ebe8de";
const CLIP = "#f7f5ef";
const EDGE = "#a9a59a";
const KINDS = ["NO", "NC", "NC", "NO"] as const;

/** Тёмный винт клеммы с крестовым шлицем. */
function screw(x: number, y: number): SVGGElement {
  return group(
    "d2-screw",
    circle(x, y, 1.75, { fill: "#4a4334", stroke: "#2a2519", "stroke-width": 0.35 }),
    path(`M ${x - 0.9} ${y} H ${x + 0.9} M ${x} ${y - 0.9} V ${y + 0.9}`, 0.45, { stroke: "#a39a84" }),
  );
}

/** Толкатель: синяя клавиша с рифлением. */
function plunger(y: number): SVGElement[] {
  const ribs = [1, 2, 3, 4].map((k) => `M 16.6 ${y + k * 1.1} H 18.6`).join(" ");
  return [
    rect(16.2, y, 2.8, 5.6, { fill: "#3a4ea6", stroke: "#1e2a66", "stroke-width": 0.35, rx: 0.3 }),
    path(ribs, 0.25, { stroke: "#7f8fd8" }),
  ];
}

export function drawAuxBlockColor(g: SVGGElement, element: SchemaElement, rotation: number): void {
  const terminal = (index: number) => element.terminals[index]?.label ?? "";
  const note = (value: string, x: number, y: number) =>
    label(value, x, y, { size: 0.8, anchor: "middle", upright: rotation, fill: "#77746c" });
  const columns = [0, 6, 12, 18];
  g.append(
    path(columns.map((x) => `M ${x} 0 V 0.6 M ${x} 26.4 V 27`).join(" ")),
    rect(-3, 0.6, 24, 25.8, { fill: BODY, stroke: EDGE, "stroke-width": 0.4, rx: 0.6 }),
    // Защёлки сверху и снизу между клеммами.
    ...columns.flatMap((x) => [
      rect(x - 2.4, 0.6, 4.8, 1.8, { fill: CLIP, stroke: EDGE, "stroke-width": 0.3 }),
      rect(x - 2.4, 24.6, 4.8, 1.8, { fill: CLIP, stroke: EDGE, "stroke-width": 0.3 }),
    ]),
    ...columns.flatMap((x, k) => [
      note(`${terminal(2 * k)} ${KINDS[k]}`, x, 3.5),
      note(`${terminal(2 * k + 1)} ${KINDS[k]}`, x, 23.9),
      screw(x, 6.3), screw(x, 20.4),
    ]),
    rect(8.6, 9.2, 12, 0.8, { fill: "#16a34a" }),
    rect(3.2, 12, 9.6, 5, { fill: CLIP, stroke: EDGE, "stroke-width": 0.35 }),
    group("d2-switch", group("d2-off", ...plunger(11.6)), group("d2-on", ...plunger(13.2))),
  );
}
