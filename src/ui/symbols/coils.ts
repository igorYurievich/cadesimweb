import type { SchemaElement } from "@model/types";

import { rowGapOf } from "./contacts";
import { INK, circle, label, path, rect } from "./svg-primitives";

export function drawCoil(g: SVGGElement, element: SchemaElement, timer: boolean, rotation = 0): void {
  const rowGap = rowGapOf(element);
  const x = element.terminals[0]?.offset.x ?? 0;
  const mid = rowGap / 2;
  g.append(path(`M ${x} 0 V ${mid - 2} M ${x} ${mid + 2} V ${rowGap}`));
  g.append(rect(x - 4, mid - 2, 8, 4, { "stroke-width": 0.9 }));
  if (timer) {
    g.append(
      path(
        `M ${x - 1.4} ${mid - 1} L ${x + 1.4} ${mid - 1} L ${x - 1.4} ${mid + 1} L ${x + 1.4} ${mid + 1} Z`,
        0.6,
      ),
    );
    // Отсчёт выдержки «прошло / задано»: текст заполняет интерфейс при симуляции, в редакторе скрыт (CSS).
    const readout = label("", x + 2, rowGap + 4.2, {
      size: 2.4,
      halo: true,
      upright: rotation,
    });
    readout.setAttribute("class", "timer-readout");
    g.append(readout);
  }
}

export function drawLamp(g: SVGGElement, element: SchemaElement): void {
  const rowGap = rowGapOf(element);
  const x = element.terminals[0]?.offset.x ?? 0;
  const mid = rowGap / 2;
  const r = 3.3;
  // Индекс цвета из .cad: 0 — зелёная, 1 — красная, 2 — жёлтая.
  // Пока лампа не включена, цвет задаётся CSS как нейтральный.
  const requestedColor = Number(element.params.color ?? 0);
  const index = requestedColor === 1 || requestedColor === 2 ? requestedColor : 0;
  g.append(path(`M ${x} 0 V ${mid - r} M ${x} ${mid + r} V ${rowGap}`));
  g.append(
    circle(x, mid, r, {
      class: `lamp-glass lamp-c${index}`,
      fill: "#f6f7f8",
      stroke: "#7b8794",
    }),
  );
  const d = r * Math.SQRT1_2;
  g.append(
    path(`M ${x - d} ${mid - d} L ${x + d} ${mid + d} M ${x + d} ${mid - d} L ${x - d} ${mid + d}`, 0.7, {
      stroke: "#7b8189",
    }),
  );
}

export function drawCoilVariant(g: SVGGElement, element: SchemaElement): void {
  const code = element.typeCode;
  drawCoil(g, element, false);
  const x = element.terminals[0]?.offset.x ?? 0;
  const mid = rowGapOf(element) / 2;
  switch (code) {
    case 9002:
      drawRemoteRelay(g, x, mid);
      break;
    case 9003:
      drawSolenoidValve(g, x, mid);
      break;
    case 9005:
      drawDelayedOff(g, x, mid, rowGapOf(element));
      break;
    case 9006:
      drawDelayedBoth(g, x, mid, rowGapOf(element));
      break;
    case 9007:
      drawFlasherRelay(g, x, mid);
      break;
    case 9015:
      drawPulseGenerator(g, x, mid);
      break;
    case 9014:
      drawTimedSwitch(g, x, mid);
      break;
    default:
      break;
  }
}

function divider(x: number, mid: number): SVGPathElement {
  return path(`M ${x - 1} ${mid - 2} V ${mid + 2}`, 0.9);
}

function solidCompartment(x: number, mid: number): SVGRectElement {
  return rect(x - 4, mid - 2, 3, 4, { fill: INK, "stroke-width": 0.9 });
}

function appendTimerReadout(g: SVGGElement, x: number, rowGap: number): void {
  const readout = label("", x + 2, rowGap + 4.2, { size: 2.4, halo: true });
  readout.setAttribute("class", "timer-readout");
  g.append(readout);
}

function drawRemoteRelay(g: SVGGElement, x: number, mid: number): void {
  g.append(
    divider(x, mid),
    path(
      `M ${x - 1.2} ${mid - 1.5} L ${x - 3.6} ${mid} L ${x - 1.2} ${mid + 1.5} ` +
        `M ${x - 3.6} ${mid} H ${x - 1}`,
      0.7,
    ),
  );
}

function drawSolenoidValve(g: SVGGElement, x: number, mid: number): void {
  g.append(
    path(`M ${x - 1.9} ${mid + 2} L ${x + 1.7} ${mid - 2}`, 0.8),
    path(`M ${x + 4} ${mid} H ${x + 6}`, 0.8),
    path(`M ${x + 5} ${mid - 3} H ${x + 7.2} L ${x + 5} ${mid + 3} H ${x + 7.2} Z`, 0.8),
  );
}

function drawDelayedOff(g: SVGGElement, x: number, mid: number, rowGap: number): void {
  g.append(solidCompartment(x, mid));
  appendTimerReadout(g, x, rowGap);
}

function drawDelayedBoth(g: SVGGElement, x: number, mid: number, rowGap: number): void {
  g.append(
    solidCompartment(x, mid),
    path(
      `M ${x - 3.4} ${mid - 1.1} H ${x - 1.6} M ${x - 2.5} ${mid - 1.1} V ${mid + 1.1} ` +
        `M ${x - 3.4} ${mid + 1.1} H ${x - 1.6}`,
      0.6,
      { stroke: "#fff" },
    ),
  );
  appendTimerReadout(g, x, rowGap);
}

function drawFlasherRelay(g: SVGGElement, x: number, mid: number): void {
  g.append(
    divider(x, mid),
    path(
      `M ${x - 1.9} ${mid - 1.2} H ${x - 3.2} V ${mid} H ${x - 1.9} ` + `V ${mid + 1.2} H ${x - 3.2}`,
      0.7,
    ),
  );
}

function drawPulseGenerator(g: SVGGElement, x: number, mid: number): void {
  g.append(
    divider(x, mid),
    path(
      `M ${x - 1.9} ${mid - 1.3} H ${x - 3.2} V ${mid + 1.3} H ${x - 1.9} ` +
        `M ${x - 3.2} ${mid} H ${x - 2.2}`,
      0.7,
    ),
  );
}

function drawTimedSwitch(g: SVGGElement, x: number, mid: number): void {
  g.append(
    circle(x, mid, 1.7, {
      fill: "none",
      "stroke-width": 0.7,
      "stroke-dasharray": "0.7 0.5",
    }),
    path(`M ${x} ${mid - 1.1} V ${mid} H ${x + 0.9}`, 0.6),
  );
}
