import type { SchemaElement } from "@model/types";
import { BREAKER_2D, CONTACTOR_2D } from "@model/realistic-2d-types";

import { circle, dashed, group, label, path, rect } from "./svg-primitives";

// ── Символы 2D (панель «Símbolos realistas — barra A») ─────────────────────
// Рисунок по скриншотам simbolos_2d.zip. Клемма 1 (.1) в (0, 0), шаг сетки 3.
// Подвижные части лежат в группах .d2-switch: .d2-off — вид в покое, .d2-on — при срабатывании
// (класс is-d2-on на элементе ставит simulation/element-2d.ts). Внутренняя схема .d2-inner краснеет.

const TEXT = 1.25;
export const TINY = 0.95;

/** Винт клеммы: кружок с крестиком «+». */
export function screw(x: number, y: number): SVGGElement {
  return group(
    "d2-screw",
    circle(x, y, 1.35, { fill: "#fff" }),
    path(`M ${x - 0.75} ${y} H ${x + 0.75} M ${x} ${y - 0.75} V ${y + 0.75}`, 0.6),
  );
}

type Anchor = "start" | "middle" | "end";

export function text(
  value: string, x: number, y: number, rotation: number, size = TEXT, anchor: Anchor = "middle",
): SVGElement {
  return label(value, x, y, { size, anchor, upright: rotation });
}

/** Переключаемая часть: в покое off, при срабатывании on. */
function toggle(off: string, on: string): SVGGElement {
  return group("d2-switch", group("d2-off", path(off, 0.6)), group("d2-on", path(on, 0.6)));
}

/** Маленький контакт внутренней схемы между y1 и y2: НО в покое разомкнут, НЗ замкнут. */
export function miniContact(
  x: number, y1: number, y2: number, nc: boolean, top: string, bottom: string, rotation: number,
): SVGElement[] {
  const a = y1 + (y2 - y1) * 0.28;
  const b = y1 + (y2 - y1) * 0.72;
  const open = `M ${x} ${b} L ${x - 1.2} ${a + 0.3}`;
  const closed = nc ? `M ${x} ${b} L ${x + 0.9} ${a - 0.3}` : `M ${x} ${b} L ${x + 0.2} ${a}`;
  const seat = nc ? ` M ${x} ${a} H ${x + 1.1}` : "";
  return [
    path(`M ${x} ${y1} V ${a} M ${x} ${b} V ${y2}${seat}`, 0.6),
    nc ? toggle(closed, open) : toggle(open, closed),
    text(top, x + 0.5, y1 + 0.9, rotation, TINY, "start"),
    text(bottom, x + 0.5, y2 - 0.1, rotation, TINY, "start"),
  ];
}

// ── Pulsador .1 .3 / .2 .4 ──────────────────────────────────────────────────
function drawPushbutton(g: SVGGElement): void {
  g.append(
    path("M 0 0 V 11 H 3 M 0 16 V 27 M 9 0 V 10.2 M 9 16.3 V 27"),
    // В покое .1-.2 замкнут, .3-.4 разомкнут; нажата — наоборот.
    group(
      "d2-switch",
      group("d2-off", path("M 3.4 10.2 L 0 16 M 5.8 10.3 L 9 16.3")),
      group("d2-on", path("M 1.2 11.6 L -0.2 16 M 9 10.2 H 8.3 L 9 16.3")),
    ),
    path("M -4.5 12 H -5.8 V 15 H -4.5"),
    dashed("M -5.8 13.5 H 7.6"),
  );
}

// ── Contactor A1 A2 1 2 3 4 5 6 13 14 21 22 ─────────────────────────────────
function drawContactor(g: SVGGElement, rotation: number): void {
  const inner = group(
    "d2-inner",
    ...miniContact(-3.5, 18, 27, false, "1", "2", rotation),
    ...miniContact(-0.5, 18, 27, false, "3", "4", rotation),
    ...miniContact(2.5, 18, 27, false, "5", "6", rotation),
    ...miniContact(5.5, 18, 27, false, "13", "14", rotation),
    ...miniContact(8.8, 18, 27, true, "21", "22", rotation),
    path("M 14 18 V 21.6 M 14 23.4 V 27", 0.6),
    rect(12.6, 21.6, 2.8, 1.8, { fill: "none" }),
    text("A1", 14.5, 18.9, rotation, TINY, "start"),
    text("A2", 14.5, 26.9, rotation, TINY, "start"),
  );
  g.append(
    path("M 0 0 V 6 M 6 0 V 6 M 12 0 V 6 M 15 3 V 6 M 3 3 V 6 M 9 3 V 6"),
    path("M 0 39 V 45 M 6 39 V 45 M 12 39 V 45 M 15 39 V 45 M 3 39 V 42 M 9 39 V 42"),
    rect(-6, 6, 24, 33, { fill: "#fff" }),
    path("M -6 10 H 18 M -6 16 H 18 M -6 29 H 18 M -6 35 H 18", 0.6),
    screw(0, 8), screw(6, 8), screw(12, 8),
    text("1L1", -2.4, 7.4, rotation), text("3L2", 3.6, 7.4, rotation), text("5L3", 9.6, 7.4, rotation),
    screw(3, 13.5), screw(9, 13.5), screw(15, 13.5),
    text("13  NO", 3, 11.4, rotation, TINY), text("21  NC", 9, 11.4, rotation, TINY),
    text("A1", 15, 11.4, rotation, TINY),
    inner,
    screw(3, 31.5), screw(9, 31.5), screw(15, 31.5),
    text("14  NO", 3, 34.4, rotation, TINY), text("22  NC", 9, 34.4, rotation, TINY),
    text("A2", 15, 34.4, rotation, TINY),
    screw(0, 37), screw(6, 37), screw(12, 37),
    text("2T1", -2.4, 38.4, rotation), text("4T2", 3.6, 38.4, rotation), text("6T3", 9.6, 38.4, rotation),
  );
}

// ── Disyuntor 1 3 5 2 4 6 13 14 21 22 ────────────────────────────────────────
function breakerPole(x: number, rotation: number, top: string, bottom: string): SVGElement[] {
  return [
    path(`M ${x} 18 V 19.6 M ${x} 22.6 V 24.4 M ${x} 27.8 V 29.5`, 0.6),
    toggle(`M ${x} 22.6 L ${x - 1.2} 19.9`, `M ${x} 22.6 L ${x - 0.15} 19.6`),
    // Расцепители: тепловой (сверху) и электромагнитный I> (снизу).
    rect(x - 1.1, 24.4, 2.2, 1.7, { fill: "none" }),
    path(`M ${x - 0.5} 25.8 V 24.9 H ${x + 0.5} V 25.8`, 0.5),
    rect(x - 1.1, 26.1, 2.2, 1.7, { fill: "none" }),
    text("I>", x, 27.4, rotation, 0.85),
    text(top, x + 0.4, 18.9, rotation, TINY, "start"),
    text(bottom, x + 0.4, 29.4, rotation, TINY, "start"),
  ];
}

function drawBreaker(g: SVGGElement, rotation: number): void {
  const inner = group(
    "d2-inner",
    // Ручной привод «⊞» с механической связью к полюсам и расцепителям.
    path("M -5.7 19.8 V 22.4 M -5.7 21.1 H -4.9", 0.6),
    rect(-4.9, 20.2, 1.9, 1.8, { fill: "none" }),
    path("M -3.95 20.2 V 22 M -4.9 21.1 H -3", 0.5),
    dashed("M -3 21.1 H 15", "0.9 0.7", 0.5),
    dashed("M -3.95 22 V 26.9 H -1.1", "0.9 0.7", 0.5),
    ...breakerPole(0.5, rotation, "1", "2"),
    ...breakerPole(3.5, rotation, "3", "4"),
    ...breakerPole(6.5, rotation, "5", "6"),
    ...miniContact(11, 18, 25, false, "13", "14", rotation),
    ...miniContact(14.6, 18, 25, true, "21", "22", rotation),
  );
  g.append(
    path("M 0 0 V 6 M 6 0 V 6 M 12 0 V 6 M -3 3 V 6 M 3 3 V 6 M 9 3 V 6 M 15 3 V 6"),
    path("M 0 45 V 51 M 6 45 V 51 M 12 45 V 51"),
    rect(-6, 6, 24, 39, { fill: "#fff" }),
    path("M -6 10 H 18 M -6 15 H 18 M -6 36 H 18 M -6 41 H 18", 0.6),
    screw(0, 8), screw(6, 8), screw(12, 8),
    text("1L1", -2.4, 7.4, rotation), text("3L2", 3.6, 7.4, rotation), text("5L3", 9.6, 7.4, rotation),
    screw(-4.5, 13), screw(-0.5, 13), screw(7.5, 13), screw(11.5, 13),
    text("21   NC   22", -2.5, 11.2, rotation, TINY), text("13   NO   14", 9.5, 11.2, rotation, TINY),
    inner,
    screw(0, 43), screw(6, 43), screw(12, 43),
    text("2T1", -2.4, 44.4, rotation), text("4T2", 3.6, 44.4, rotation), text("6T3", 9.6, 44.4, rotation),
  );
}

export function drawRealistic2d(g: SVGGElement, element: SchemaElement, rotation: number): void {
  if (element.typeCode === CONTACTOR_2D) drawContactor(g, rotation);
  else if (element.typeCode === BREAKER_2D) drawBreaker(g, rotation);
  else drawPushbutton(g);
}
