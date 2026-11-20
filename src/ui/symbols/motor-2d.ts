import type { SchemaElement } from "@model/types";

import { group, label, path, rect } from "./svg-primitives";
import { motorRotor } from "./motors";

// ── Моторы 2D (1000 и 1001 с params.motor2d) ────────────────────────────────
// Цветной вид сбоку по фото пользователя: синий корпус с рёбрами, клеммная коробка сверху, вал слева,
// кожух вентилятора справа, лапы снизу. Клеммы как у обычных моторов: U1 V1 W1 PE на y = 0 (шаг 6),
// у YD ещё W2 U2 V2 снизу. В симуляции у вала крутится стрелка (класс motor-rotor, как у обычного мотора).

const BLUE = "#2f62b5";
const BLUE_DARK = "#1f4588";
const BLUE_LIGHT = "#4a7fd0";
const STEEL = "#b9bec6";
const STEEL_DARK = "#6d737c";

const fill = (x: number, y: number, w: number, h: number, color: string, extra: Record<string, number> = {}) =>
  rect(x, y, w, h, { fill: color, stroke: BLUE_DARK, "stroke-width": 0.4, ...extra });

/** Рёбра охлаждения по корпусу. */
function fins(): SVGElement {
  const lines: string[] = [];
  for (let y = 9.2; y < 18.5; y += 1.3) lines.push(`M -1.6 ${y.toFixed(2)} H 15.6`);
  return path(lines.join(" "), 0.35, { stroke: BLUE_DARK });
}

export function drawMotor2d(g: SVGGElement, element: SchemaElement): void {
  const lower = element.terminals.filter((terminal) => terminal.offset.y > 0);
  g.append(
    // Выводы U1 V1 W1 в клеммную коробку, PE — к болту заземления на кожухе вентилятора.
    path("M 0 0 V 3.2 M 6 0 V 3.2 M 12 0 V 3.2 M 18 0 V 8.2"),
    // Вал с шпонкой.
    rect(-7.2, 12.2, 3.8, 2.6, { fill: STEEL, stroke: STEEL_DARK, "stroke-width": 0.4 }),
    path("M -6.6 12.9 H -4.4", 0.4, { stroke: STEEL_DARK }),
    // Передний щит, корпус с рёбрами, лапы.
    fill(-3.6, 8.6, 1.4, 10.2, BLUE_DARK),
    fill(-2.4, 7.6, 19, 12, BLUE, { rx: 0.8 }),
    fins(),
    fill(1.2, 19.4, 11.6, 1.6, BLUE_DARK),
    // Кожух вентилятора.
    fill(16.4, 8, 5.4, 11.2, BLUE_LIGHT, { rx: 2.6 }),
    path("M 20.6 9.6 V 17.6", 0.35, { stroke: BLUE_DARK }),
    // Клеммная коробка с крышкой и двумя кабельными вводами.
    fill(-1.6, 3.2, 15.2, 4.6, BLUE, { rx: 0.5 }),
    path("M -1.6 4.2 H 13.6", 0.4, { stroke: BLUE_DARK }),
    rect(2.2, 5, 2.4, 2.2, { fill: STEEL, stroke: STEEL_DARK, "stroke-width": 0.35, rx: 1.1 }),
    rect(7.4, 5, 2.4, 2.2, { fill: STEEL, stroke: STEEL_DARK, "stroke-width": 0.35, rx: 1.1 }),
    // Табличка «M 3~».
    rect(4, 11.2, 6.4, 4.2, { fill: "#fff", stroke: BLUE_DARK, "stroke-width": 0.3 }),
    label("M 3~", 7.2, 13.4, { size: 1.9, anchor: "middle", fill: "#222" }),
  );
  // У YD выводы W2 U2 V2 выходят вниз из-под корпуса.
  if (lower.length > 0) {
    g.append(path(lower.map((terminal) => `M ${terminal.offset.x} 19.6 V ${terminal.offset.y}`).join(" ")));
  }
  g.append(group("motor-body", motorRotor(-10.2, 14, 0.55)));
}
