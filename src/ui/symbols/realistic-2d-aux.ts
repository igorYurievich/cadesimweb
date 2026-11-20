import type { SchemaElement } from "@model/types";

import { group, label, path, rect } from "./svg-primitives";
import { miniContact, screw } from "./realistic-2d";
import { clips } from "./realistic-2d-delay";

// ── Блок вспомогательных контактов 2D 7019: 53-54 НО, 61-62 НЗ, 71-72 НЗ, 83-84 НО ─────────
// Рисунок по скриншотам пользователя (покой и срабатывание), шаг сетки 3. Клеммы от клеммы 53 (0, 0)
// с шагом 6: верхние на y = 0, нижние на y = 27. Корпус как у блоков с выдержкой (realistic-2d-delay.ts).

const TINY = 0.85;
/** НЗ ли пара клемм по порядку столбцов. */
const COLUMNS: ReadonlyArray<{ x: number; nc: boolean; kind: string }> = [
  { x: 0, nc: false, kind: "NO" }, { x: 6, nc: true, kind: "NC" },
  { x: 12, nc: true, kind: "NC" }, { x: 18, nc: false, kind: "NO" },
];

export function drawAuxBlock2d(g: SVGGElement, element: SchemaElement, rotation: number): void {
  const terminal = (index: number) => element.terminals[index]?.label ?? "";
  const tiny = (value: string, x: number, y: number) =>
    label(value, x, y, { size: TINY, anchor: "middle", upright: rotation });
  g.append(
    rect(-3, 0.6, 24, 25.8, { fill: "#fff" }),
    path("M -3 2.6 H 21 M -3 24.4 H 21", 0.6),
    path(COLUMNS.map(({ x }) => `M ${x} 0 V 0.6 M ${x} 26.4 V 27`).join(" ")),
    ...clips(),
    ...COLUMNS.flatMap(({ x, kind }, k) => [
      screw(x, 6), screw(x, 21),
      tiny(`${terminal(2 * k)} ${kind}`, x, 3.7),
      tiny(`${terminal(2 * k + 1)} ${kind}`, x, 23.3),
    ]),
    group("d2-inner", ...COLUMNS.flatMap(({ x, nc }) => miniContact(x, 10, 17, nc, "", "", rotation))),
  );
}
