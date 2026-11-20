import type { SchemaElement } from "@model/types";
import { DELAY_BLOCK_2D } from "@model/realistic-2d-types";

import { circle, group, path } from "./svg-primitives";
import { screw } from "./realistic-2d";
import { appendDelayReadout } from "./realistic-2d-delay";
import { COLOR, box, note } from "./realistic-2d-color";

// ── Цветной вид блоков с выдержкой 7020 / 7021 ──────────────────────────────
// По фото: серый корпус с винтами по углам, круглая шкала выдержки, синий ползунок справа.
// Клеммы как у простого вида: 57 (0,0), 58 (0,27), 65 (18,0), 66 (18,27).
// При срабатывании стрелка шкалы переходит вправо и краснеет (.d2-on, .d2-inner).

export function drawDelayBlockColor(g: SVGGElement, element: SchemaElement, rotation: number): void {
  const onDelay = element.typeCode === DELAY_BLOCK_2D.ON;
  const left = onDelay ? "NC" : "NO";
  const right = onDelay ? "NO" : "NC";
  const terminal = (index: number, fallback: string) => element.terminals[index]?.label ?? fallback;
  g.append(
    path("M 0 0 V 0.6 M 18 0 V 0.6 M 0 26.4 V 27 M 18 26.4 V 27"),
    box(-3, 0.6, 24, 25.8, "#dcdcda"),
    box(-3, 0.6, 24, 1.8, "#c6c6c3"), box(-3, 24.6, 24, 1.8, "#c6c6c3"),
    screw(0, 6), screw(18, 6), screw(0, 21), screw(18, 21),
    note(terminal(0, "57"), -1.6, 3.6, rotation), note(left, -1.6, 8.9, rotation),
    note(left, -1.6, 18.2, rotation), note(terminal(1, "58"), -1.6, 23.4, rotation),
    note(terminal(2, "65"), 19.6, 3.6, rotation), note(right, 19.6, 8.9, rotation),
    note(right, 19.6, 18.2, rotation), note(terminal(3, "66"), 19.6, 23.4, rotation),
    // Шкала выдержки: «− +» и дуга сверху, кольцо делений, надписи типа и диапазона.
    note("−", 6.4, 3.9, rotation, COLOR.text, 1.4), note("+", 11.6, 3.9, rotation, COLOR.text, 1.4),
    path("M 6.6 5.2 A 4 4 0 0 1 11.4 5.2", 0.4, { stroke: COLOR.text }),
    circle(9, 13.6, 7.4, { fill: "#f3f3f1", stroke: "#555", "stroke-width": 0.6 }),
    circle(9, 13.6, 5.6, { fill: "#e6e6e3", stroke: "#888", "stroke-width": 0.4, "stroke-dasharray": "0.5 0.7" }),
    note(onDelay ? "ON delay" : "OFF delay", 9, 16.6, rotation, COLOR.text, 0.85),
    note("10-180s", 9, 18.2, rotation, "#666", 0.7),
    box(19.4, 10.6, 1.4, 6, COLOR.blue, { rx: 0.3 }),
    group("d2-inner", group("d2-switch",
      group("d2-off", path("M 9 13.6 L 5.4 10", 0.7)),
      group("d2-on", path("M 9 13.6 L 12.6 10", 0.7)))),
    circle(9, 13.6, 0.7, { fill: "#555", stroke: "none" }),
  );
  appendDelayReadout(g, rotation);
}
