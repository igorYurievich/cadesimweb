import type { SchemaElement } from "@model/types";
import { buttonColorName, type ButtonColorName } from "@model/pushbutton-2d";

import { circle, group, path, rect } from "./svg-primitives";
import { screw } from "./realistic-2d";

// ── Цветной вид кнопки 8100 ─────────────────────────────────────────────────
// По фото кнопки на DIN-рейке: чёрный корпус контактного блока с винтами .1 .3 сверху и .2 .4 снизу,
// посередине круглая кнопка в металлическом ободке, внизу защёлка. Цвет — nums[16] (pushbutton-2d.ts).
// Нажатие (класс is-d2-on) — кнопка утоплена: меньше и темнее, с тенью от ободка.

const BUTTON_FILL: Record<ButtonColorName, { face: string; pressed: string }> = {
  black: { face: "#2b2c2e", pressed: "#151617" },
  green: { face: "#1f9d55", pressed: "#137a3f" },
  red: { face: "#d9302c", pressed: "#a81f1c" },
};

const HOUSING = "#2a2b2d";
const HOUSING_EDGE = "#111214";
const STEEL = "#c7cad0";
const STEEL_DARK = "#7b7f87";
const CX = 4.5;
const CY = 13.5;

export function drawPushbuttonColor(g: SVGGElement, element: SchemaElement): void {
  const color = BUTTON_FILL[buttonColorName(element)];
  g.append(
    // Выводы клемм к винтам корпуса.
    path("M 0 0 V 3.4 M 9 0 V 3.4 M 0 23.6 V 27 M 9 23.6 V 27"),
    // Корпус и две колонки контактов по бокам.
    rect(-4, 3, 17, 21, { fill: HOUSING, stroke: HOUSING_EDGE, "stroke-width": 0.5, rx: 1 }),
    path("M -1.8 6.6 V 20.4 M 10.8 6.6 V 20.4", 0.35, { stroke: "#55575b" }),
    screw(0, 4.8), screw(9, 4.8), screw(0, 22.2), screw(9, 22.2),
    // Защёлка на DIN-рейку снизу.
    rect(2.3, 23.2, 4.4, 1.6, { fill: STEEL, stroke: STEEL_DARK, "stroke-width": 0.3 }),
    // Ободок и кнопка: в покое выпуклая с бликом, нажатая — утоплена.
    circle(CX, CY, 7, { fill: STEEL, stroke: STEEL_DARK, "stroke-width": 0.5 }),
    circle(CX, CY, 6.1, { fill: "#e9ebee", stroke: STEEL_DARK, "stroke-width": 0.3 }),
    group(
      "d2-switch",
      group(
        "d2-off",
        circle(CX, CY, 5.6, { fill: color.face, stroke: HOUSING_EDGE, "stroke-width": 0.35 }),
        path(`M ${CX - 3.4} ${CY - 1.6} A 3.8 3.8 0 0 1 ${CX + 0.4} ${CY - 4.2}`, 0.7, {
          stroke: "#fff", "stroke-opacity": 0.45, "stroke-linecap": "round",
        }),
      ),
      group(
        "d2-on",
        circle(CX, CY, 5.6, { fill: "#4b4d52", stroke: HOUSING_EDGE, "stroke-width": 0.35 }),
        circle(CX, CY + 0.3, 4.8, { fill: color.pressed, stroke: "none" }),
      ),
    ),
  );
}
