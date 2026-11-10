import type { SchemaElement } from "@model/types";
import { getCadType } from "@model/cad-types";

import { INK, STRIP_COLORS, label, shape } from "./svg-primitives";

/** Клеммная колодка с цветными ромбами. */
export function drawStrip(g: SVGGElement, element: SchemaElement, names: string[]): void {
  element.terminals.forEach((terminal, i) => {
    const { x, y } = terminal.offset;
    const color = STRIP_COLORS[names[i] ?? ""] ?? INK;
    const r = 1.7;
    g.append(
      shape("path", {
        d: `M ${x} ${y - r} L ${x + r} ${y} L ${x} ${y + r} L ${x - r} ${y} Z`,
        fill: "#fff",
        stroke: color,
        "stroke-width": 0.8,
        "vector-effect": "non-scaling-stroke",
        class: "strip-terminal",
      }),
    );
    const name = names[i];
    if (name)
      g.append(
        label(name === "-" ? "\u2212" : name, x, y - 3.6, {
          size: 2.6,
          anchor: "middle",
          fill: color,
        }),
      );
  });
}

/** Метки клемм колодок питания по типу, как их рисует CADe_SIMU (однофазная колодка подписана «L», не «L1»). */
const STRIP_NAMES: Readonly<Record<number, readonly string[]>> = {
  3000: ["L"],
  3001: ["N"],
  3002: ["PE"],
  3003: ["L", "N"],
  3011: ["L", "N", "PE"],
  3004: ["L1", "L2", "L3"],
  3005: ["L1", "L2", "L3", "PE"],
  3006: ["L1", "L2", "L3", "N"],
  3007: ["L1", "L2", "L3", "N", "PE"],
  3008: ["+"],
  3009: ["-"],
  3010: ["+", "-"],
};

export function stripNames(count: number, typeCode = 3007): string[] {
  const known = STRIP_NAMES[typeCode];
  if (known) return Array.from({ length: count }, (_, i) => known[i] ?? "");
  if (count >= 5) return ["L1", "L2", "L3", "N", "PE"].concat(Array.from({ length: count - 5 }, () => ""));
  if (count === 4) return ["L1", "L2", "L3", "N"];
  if (count === 3) return ["L1", "L2", "L3"];
  return Array.from({ length: count }, () => "");
}

export const isStrip = (typeCode: number): boolean => getCadType(typeCode).family === "terminal-strip";
