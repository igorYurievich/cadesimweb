import type { SchemaElement } from "@model/types";

import { rowGapOf } from "./contacts";
import { circle, path, rect } from "./svg-primitives";
import { drawLamp } from "./coils";

/** Биестабильная катушка. */
export function drawBistable(g: SVGGElement, element: SchemaElement): void {
  const [a1, b1, a2] = element.terminals;
  const xa = a1?.offset.x ?? 0;
  const xb = b1?.offset.x ?? 6;
  const xm = a2?.offset.x ?? 3;
  const gap = rowGapOf(element);
  const mid = gap / 2;
  g.append(path(`M ${xa} 0 V ${mid - 2} M ${xb} 0 V ${mid - 2} M ${xm} ${mid + 2} V ${gap}`));
  g.append(rect(xm - 4, mid - 2, 8, 4, { "stroke-width": 0.9 }));
  g.append(
    path(
      `M ${xa + 1.6} ${mid - 2} L ${xa} ${mid + 2} M ${xb - 2.1} ${mid - 2} L ${xb - 0.3} ${mid + 2}`,
      0.7,
    ),
  );
}

/** Счётчик импульсов 9016: корпус 18×6 с отсеком-«шестерёнкой» слева; выводы A1 C D R сверху и A2 снизу. */
export function drawCounter(g: SVGGElement, element: SchemaElement): void {
  const gap = rowGapOf(element);
  for (const t of element.terminals) {
    g.append(path(t.offset.y === 0 ? `M ${t.offset.x} 0 V 3` : `M ${t.offset.x} ${gap - 3} V ${gap}`));
  }
  g.append(rect(-3, 3, 18, gap - 6, { "stroke-width": 0.9 }));
  g.append(path(`M 3 3 V ${gap - 3}`, 0.9));
  g.append(
    circle(0, gap / 2, 1.9, {
      fill: "none",
      "stroke-width": 0.7,
      "stroke-dasharray": "0.8 0.6",
    }),
  );
}

/** Звонок, зуммер, сирена и рупор: выводы X1 X2 сверху и снизу, справа знак устройства. Только символы. */
export function drawSignal(g: SVGGElement, element: SchemaElement): void {
  const gap = rowGapOf(element);
  const mid = gap / 2;
  const lead = (hx: number): SVGPathElement =>
    path(`M 0 0 V ${mid - 2} H ${hx} M 0 ${gap} V ${mid + 2} H ${hx}`);
  switch (element.typeCode) {
    case 9010: // звонок: «D»
      g.append(
        lead(4),
        path(`M 4 ${mid - 3} V ${mid + 3} M 4 ${mid - 3} C 8 ${mid - 3} 8 ${mid + 3} 4 ${mid + 3}`, 0.8, {
          class: "signal-icon",
          fill: "#fff",
        }),
      );
      break;
    case 9011: // зуммер
      g.append(
        lead(3),
        path(
          `M 5.5 ${mid - 3} H 6 V ${mid + 3} H 5.5 M 5.5 ${mid - 3} C 2.5 ${mid - 1.5} 2.5 ${mid + 1.5} 5.5 ${mid + 3}`,
          0.8,
          { class: "signal-icon", fill: "#fff" },
        ),
      );
      break;
    case 9012: // сирена: треугольник
      g.append(
        lead(4),
        path(`M 4 ${mid - 3} L 8.3 ${mid} L 4 ${mid + 3} Z`, 0.8, {
          class: "signal-icon",
          fill: "#fff",
        }),
      );
      break;
    default: // 9013, рупор: квадрат и раструб
      g.append(
        path(`M 0 0 V ${mid - 2} M 0 ${mid + 2} V ${gap}`),
        rect(-2, mid - 2, 4, 4, { class: "signal-icon", "stroke-width": 0.9 }),
        path(
          `M 2 ${mid - 0.8} L 5.6 ${mid - 1.5} H 6.5 L 8.2 ${mid + 0.6} V ${mid + 1.4} L 2 ${mid + 0.8}`,
          0.8,
          { class: "signal-icon", fill: "#fff" },
        ),
      );
  }
}

/** Лампа-мигалка 9009: лампа 9008 и значок импульса справа. */
export function drawFlashingLamp(g: SVGGElement, element: SchemaElement): void {
  drawLamp(g, element);
  const x = element.terminals[0]?.offset.x ?? 0;
  const mid = rowGapOf(element) / 2;
  g.append(
    path(
      `M ${x + 5.6} ${mid + 0.9} H ${x + 6.4} V ${mid - 0.7} H ${x + 7.6} V ${mid + 0.9} H ${x + 8.4}`,
      0.7,
    ),
  );
}
