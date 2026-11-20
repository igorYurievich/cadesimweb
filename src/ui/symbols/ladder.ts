import type { SchemaElement } from "@model/types";
import { LADDER_COIL } from "@model/plc-types";
import { LADDER_FALL, LADDER_FIRST_SCAN, LADDER_RESET, LADDER_RISE, LADDER_SET } from "@model/plc-blocks";

import { label, path, rect } from "./svg-primitives";

// ── Контакты и катушки Ladder 15×9: выводы (0, 0) и (12, 0) ─────────────────
// Контакт NA «—| |—», NC «—|/|—», фронты «—|↑|—» / «—|↓|—», First Scan — фронт с подписями FIRST / SCAN.
// Катушки «—( )—», Set «—(S)—», Reset «—(R)—». Под символом прозрачная подложка .ladder-glow:
// в симуляции (класс is-ladder-on) она подсвечивается зелёным, а линии символа становятся зелёными.

const ARROW_UP = "M 6 2.2 V -2.2 M 4.9 -1 L 6 -2.4 L 7.1 -1";
const ARROW_DOWN = "M 6 -2.2 V 2.2 M 4.9 1 L 6 2.4 L 7.1 1";

const COIL_LETTER: Readonly<Record<number, string>> = { [LADDER_SET]: "S", [LADDER_RESET]: "R" };

export function drawLadder(g: SVGGElement, element: SchemaElement, rotation: number): void {
  const glow = rect(2.6, -3.6, 6.8, 7.2, {
    class: "ladder-glow", fill: "#22c55e", "fill-opacity": 0, stroke: "none", rx: 1,
  });
  const letter = COIL_LETTER[element.typeCode];
  if (element.typeCode === LADDER_COIL || letter) {
    g.append(
      glow,
      path("M 0 0 H 3.6 M 8.4 0 H 12"),
      path("M 4.8 -3 A 4.2 4.2 0 0 0 4.8 3 M 7.2 -3 A 4.2 4.2 0 0 1 7.2 3", 0.8, { class: "ladder-mark" }),
    );
    if (letter) g.append(label(letter, 6, 0.1, { size: 2.2, anchor: "middle", upright: rotation }));
    return;
  }
  const inner = element.typeCode === LADDER_RISE || element.typeCode === LADDER_FIRST_SCAN ? ` ${ARROW_UP}`
    : element.typeCode === LADDER_FALL ? ` ${ARROW_DOWN}` : element.typeCode === 10051 ? " M 3.4 3 L 8.6 -3" : "";
  g.append(
    glow,
    path("M 0 0 H 4.5 M 7.5 0 H 12"),
    path(`M 4.5 -3 V 3 M 7.5 -3 V 3${inner}`, 0.8, { class: "ladder-mark" }),
  );
  // First Scan: имя «FIRST» над символом (NAME_SPOTS), функция «SCAN» под ним.
  if (element.typeCode === LADDER_FIRST_SCAN && element.func) {
    g.append(label(element.func, 6, 5, { size: 2.3, anchor: "middle", upright: rotation }));
  }
}
