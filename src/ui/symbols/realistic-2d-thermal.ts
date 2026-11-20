import type { SchemaElement } from "@model/types";

import { group, path, rect } from "./svg-primitives";
import { TINY, miniContact, screw, text } from "./realistic-2d";

// ── Тепловое реле 2D 6016: 1 3 5 2 4 6 97 98 95 96 ──────────────────────────
// Рисунок по скриншотам пользователя (покой и срабатывание), шаг сетки 3. Полюса 1 3 5 сверху (y = 0),
// 2 4 6 снизу (y = 36), короткие выводы 97 98 95 96 снизу (y = 33). Корпус от x = −6 шириной 24.

/** Нагреватель полюса внутренней схемы: «крюк» внутри общей рамки. */
function heater(x: number, top: string, bottom: string, rotation: number): SVGElement[] {
  return [
    path(`M ${x} 10.4 V 12.6 H ${x + 1.4} V 14.2 H ${x} V 16.4`, 0.6),
    text(top, x + 0.5, 10.9, rotation, TINY, "start"),
    text(bottom, x + 0.5, 16.1, rotation, TINY, "start"),
  ];
}

export function drawThermalRelay2d(g: SVGGElement, _element: SchemaElement, rotation: number): void {
  const inner = group(
    "d2-inner",
    rect(-3, 12, 9.4, 2.8, { fill: "none", "stroke-width": 0.6 }),
    ...heater(-2.2, "1", "2", rotation),
    ...heater(0.8, "3", "4", rotation),
    ...heater(3.8, "5", "6", rotation),
    ...miniContact(9, 10.2, 16.6, false, "97", "98", rotation),
    ...miniContact(13.3, 10.2, 16.6, true, "95", "96", rotation),
  );
  g.append(
    path("M 0 0 V 6 M 6 0 V 6 M 12 0 V 6"),
    path("M 0 30 V 36 M 6 30 V 36 M 12 30 V 36 M -3 30 V 33 M 3 30 V 33 M 9 30 V 33 M 15 30 V 33"),
    rect(-6, 6, 24, 24, { fill: "#fff" }),
    path("M -6 20.6 H 18 M -6 26.1 H 18", 0.8),
    inner,
    screw(-2.3, 23), screw(3.3, 23), screw(8.7, 23), screw(14, 23),
    text("97 NO", -2.3, 25.2, rotation, TINY), text("98 NO", 3.3, 25.2, rotation, TINY),
    text("95 NC", 8.7, 25.2, rotation, TINY), text("96 NC", 14, 25.2, rotation, TINY),
    screw(-0.6, 28), screw(6.1, 28), screw(12.8, 28),
    text("2T1", -3.4, 28.6, rotation), text("4T2", 3.4, 28.6, rotation), text("6T3", 10, 28.6, rotation),
  );
}
