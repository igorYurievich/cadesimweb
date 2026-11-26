import type { SchemaElement } from "@model/types";

import { circle, group, path } from "./svg-primitives";

// ── Пилот 2D 8101 (-H, X1 сверху, X2 снизу) ─────────────────────────────────
// Цвет как у обычной лампы 9008: params.color 0 — зелёный, 1 — красный, 2 — жёлтый.
// Цветной вид по образцу CADe_SIMU 4.2: цветной диск в тёмном ободке. Горит — класс is-lamp-lit
// (simulation/element-switches.ts): видна группа .pilot-lit со свечением, .pilot-off скрыта (viewport.css).

/** Выводы X1 (0, 0) и X2 (0, 18), лампа посередине. */
const CY = 9;
const X2 = 18;
const RIM = 4.9;
const GLASS = 4.2;

const PILOT_COLORS = [
  { off: "#13914a", lit: "#3fe377", glow: "#29dc5a" },
  { off: "#b8100f", lit: "#ff3d3d", glow: "#ff3038" },
  { off: "#f3c400", lit: "#ffec4f", glow: "#ffd400" },
] as const;

const colorIndex = (element: SchemaElement): 0 | 1 | 2 => {
  const value = Number(element.params.color ?? 0);
  return value === 1 || value === 2 ? value : 0;
};

const leads = () => path(`M 0 0 V ${CY - RIM} M 0 ${CY + RIM} V ${X2}`);

export function drawPilotColor(g: SVGGElement, element: SchemaElement): void {
  const color = PILOT_COLORS[colorIndex(element)];
  g.append(
    leads(),
    circle(0, CY, RIM, { fill: "#1d1e20", stroke: "#4a2a2a", "stroke-width": 0.3 }),
    group("pilot-off", circle(0, CY, GLASS, { fill: color.off, stroke: "none" })),
    group(
      "pilot-lit",
      circle(0, CY, GLASS, { fill: color.lit, stroke: "none", style: `filter: drop-shadow(0 0 3px ${color.glow})` }),
      path(`M -2.6 ${CY - 1.2} A 2.9 2.9 0 0 1 -0.6 ${CY - 2.9}`, 0.6, {
        stroke: "#fff", "stroke-opacity": 0.6, "stroke-linecap": "round",
      }),
    ),
  );
}

/** Простой вид — обычный символ лампы (круг с крестом), подсветка как у 9008 (классы lamp-glass lamp-cN). */
export function drawPilotSimple(g: SVGGElement, element: SchemaElement): void {
  const r = 3.3;
  const d = r * Math.SQRT1_2;
  g.append(
    path(`M 0 0 V ${CY - r} M 0 ${CY + r} V ${X2}`),
    circle(0, CY, r, { class: `lamp-glass lamp-c${colorIndex(element)}`, fill: "#f6f7f8", stroke: "#7b8794" }),
    path(`M ${-d} ${CY - d} L ${d} ${CY + d} M ${d} ${CY - d} L ${-d} ${CY + d}`, 0.7, { stroke: "#7b8189" }),
  );
}
