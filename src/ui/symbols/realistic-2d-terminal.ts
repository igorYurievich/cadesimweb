import type { SchemaElement } from "@model/types";
import { TERMINAL_2D_BOTTOM, isTerminal2d, terminalColorName } from "@model/terminal-2d";
import type { TerminalColorName } from "@model/terminal-2d";

import { circle, label, path, rect } from "./svg-primitives";

// ── Клемма 2D «Borna» 4011 (-X) ─────────────────────────────────────────────
// Свой рисунок по смыслу скриншота CADe_SIMU 4.2: узкая клемма на DIN-рейку, вид спереди. Сверху и снизу
// отверстия под провод, белые таблички маркировки, два винта и посередине гнездо перемычки. Цвет корпуса —
// серый (фаза), синий (N) или жёлто-зелёный (PE) по nums[16] (terminal-2d.ts). Координаты от вывода (x = 0):
// верхний вывод на y = 0, нижний на TERMINAL_2D_BOTTOM; корпус занимает всю высоту между ними.

const HALF = 1.5;
const H = TERMINAL_2D_BOTTOM;

const BODY: Readonly<Record<TerminalColorName, { fill: string; edge: string; mark: string }>> = {
  phase: { fill: "#9ea2a6", edge: "#5f6468", mark: "" },
  neutral: { fill: "#3d86d8", edge: "#1f5596", mark: "N" },
  pe: { fill: "#3aa63a", edge: "#23702a", mark: "PE" },
};

const PE_STRIPE = "#f2cf1d";

/** Отверстие под провод: тёмная щель с концом жилы. */
const wireEntry = (y: number): SVGElement[] => [
  rect(-1.05, y, 2.1, 0.9, { fill: "#2b2c2e", stroke: "none", rx: 0.2 }),
  rect(-0.35, y + 0.15, 0.7, 0.6, { fill: "#c58a3a", stroke: "none" }),
];

/** Белая табличка маркировки с надписью N / PE (у фазы пустая). */
const marker = (y: number, text: string, rotation: number): SVGElement[] => [
  rect(-1.2, y, 2.4, 1.3, { fill: "#f7f7f3", stroke: "#b9bab5", "stroke-width": 0.15 }),
  ...(text ? [label(text, 0, y + 0.68, { size: 0.85, anchor: "middle", upright: rotation, fill: "#222" })] : []),
];

/** Винт с прорезью. */
const screw = (y: number): SVGElement[] => [
  circle(0, y, 1.05, { fill: "#c9ccd0", stroke: "#6d7277", "stroke-width": 0.2 }),
  path(`M -0.6 ${y + 0.45} L 0.6 ${y - 0.45}`, 0.3, { stroke: "#4b4f53" }),
];

/** Цветной вид клеммы; false — тип не этот. */
export function drawTerminalColor(g: SVGGElement, element: SchemaElement, rotation: number): boolean {
  if (!isTerminal2d(element.typeCode)) return false;
  const colorName = terminalColorName(element);
  const body = BODY[colorName];
  g.append(
    rect(-HALF, 0, 2 * HALF, H, { fill: body.fill, stroke: body.edge, "stroke-width": 0.25, rx: 0.35 }),
    // PE: правая половина корпуса жёлтая, как у жёлто-зелёных клемм.
    ...(colorName === "pe" ? [rect(0, 0.15, HALF - 0.15, H - 0.3, { fill: PE_STRIPE, stroke: "none" })] : []),
    ...wireEntry(0.35),
    ...wireEntry(H - 1.25),
    ...marker(1.6, body.mark, rotation),
    ...marker(H - 2.9, body.mark, rotation),
    ...screw(3.95),
    ...screw(H - 3.95),
    // Гнездо перемычки посередине.
    rect(-0.9, H / 2 - 0.6, 1.8, 1.2, { fill: "#3b3c3e", stroke: "none", rx: 0.2 }),
    circle(0, H / 2, 0.32, { fill: "#8a8d90", stroke: "none" }),
  );
  return true;
}

/** Простой вид: провод сквозь клемму и кружок клеммы посередине. */
export function drawTerminalSimple(g: SVGGElement): void {
  const r = 1.4;
  g.append(
    path(`M 0 0 V ${H / 2 - r} M 0 ${H / 2 + r} V ${H}`),
    circle(0, H / 2, r, { fill: "#fff" }),
  );
}
