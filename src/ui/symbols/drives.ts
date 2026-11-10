import type { SchemaElement } from "@model/types";

import { G, columns, rowGapOf } from "./contacts";
import { INK, group, label, path, rect, shape } from "./svg-primitives";
import { inkFill } from "./motors";

// Силовая электроника: резисторы, пускатели и преобразователи.
export function drawResistor(g: SVGGElement, element: SchemaElement): void {
  const gap = rowGapOf(element);
  for (const x of columns(element)) {
    g.append(path(`M ${x} 0 V ${G} M ${x} ${gap - G} V ${gap}`));
    g.append(rect(x - 1.5, G, 3, gap - 2 * G));
  }
}

/** Автотрансформатор III. */
export function drawAutotransformer(g: SVGGElement): void {
  for (const x of [0, 6, 12]) {
    g.append(path(`M ${x} 0 V 3 M ${x} 15 V 18`));
    g.append(
      shape("rect", {
        x: x - 1.5,
        y: 3,
        width: 3,
        height: 12,
        fill: INK,
        stroke: INK,
        "stroke-width": 0.3,
        "vector-effect": "non-scaling-stroke",
      }),
    );
    g.append(path(`M ${x + 1.5} 9 H ${x + 3}`));
  }
}

/** Диод-тиристор в рамке пускателя: треугольник вершиной вниз, анодная линия слева и катодная черта. */
function drawStarterDiode(g: SVGGElement): void {
  g.append(path("M 6 6 V 18"));
  g.append(inkFill("M 3 9 H 9 L 6 15 Z"));
  g.append(path("M 0 12 H 4.5 M 3 15 H 9"));
}

/** Электронный пускатель c.a. 1053: рамка, диод внутри, три вывода сверху, три снизу и PE справа. */
export function drawElectronicStarter(g: SVGGElement): void {
  g.append(rect(-3, 3, 18, 18));
  g.append(path("M 0 0 V 3 M 6 0 V 3 M 12 0 V 3 M 0 21 V 24 M 6 21 V 24 M 12 21 V 24 M 15 12 H 18"));
  drawStarterDiode(g);
}

/** Индикатор READY / RUN: квадратик 2×3 и подпись справа от него. */
function indicator(name: string, y: number): SVGGElement {
  const g = group(`indicator indicator-${name.toLowerCase()}`);
  g.append(rect(-1, y, 2, 3));
  g.append(label(name, 2, y + 1.5, { size: 2.3 }));
  return g;
}

/** Блок управления пускателем/инвертором 1062, 1063: рамка, выводы по клеммам и два индикатора READY, RUN. */
export function drawControlUnit(g: SVGGElement, element: SchemaElement): void {
  const { w, h } = element.size;
  g.append(rect(-3, 3, w, h - 9));
  for (const t of element.terminals) {
    const bottom = t.offset.y > 0;
    g.append(path(bottom ? `M ${t.offset.x} ${h - 6} V ${t.offset.y}` : `M ${t.offset.x} 0 V 3`));
  }
  g.append(indicator("READY", 6), indicator("RUN", 15));
}

/** Преобразователь частоты 1054. */
export function drawDrive(g: SVGGElement, element: SchemaElement): void {
  const { w, h } = element.size;
  g.append(rect(-3, 3, w, h - 9));
  for (const t of element.terminals) {
    g.append(path(t.offset.y > 0 ? `M ${t.offset.x} ${h - 6} V ${t.offset.y}` : `M ${t.offset.x} 0 V 3`));
  }
  g.append(rect(3, 6, 12, 18));
  g.append(path("M 3 12 H 15 M 3 18 H 15"));
  // Выпрямитель: малый диод по центру верхней секции.
  g.append(path("M 9 7.4 V 10.6 M 8 9.9 H 10"));
  g.append(inkFill("M 8 8.2 H 10 L 9 9.8 Z"));
  // Конденсатор: две пластины и выводы.
  g.append(path("M 6 15 H 8 M 10 15 H 12 M 8 13.4 V 16.6 M 10 13.4 V 16.6"));
  // Транзистор: база, коллектор и эмиттер со стрелкой.
  g.append(path("M 9 19.4 V 22.6 M 9 20.5 L 10.4 19.2 M 9 21.5 L 10.5 22.6"));
  g.append(inkFill("M 10.8 23 L 9.7 22.5 L 10.4 21.8 Z"));
}

/** Рамка блока (x −3..w − 3, y 3..h − 6) и выводы от клемм до рамки. */
function drawBlockFrame(g: SVGGElement, element: SchemaElement, left = -3): void {
  const { w, h } = element.size;
  g.append(rect(left, 3, w, h - 9));
  for (const t of element.terminals) {
    g.append(path(t.offset.y > 0 ? `M ${t.offset.x} ${h - 6} V ${t.offset.y}` : `M ${t.offset.x} 0 V 3`));
  }
}

/** Control Variador 1056: рамка 54×33, 13 выводов и переключающий контакт у RA–RC. */
export function drawDriveControl(g: SVGGElement, element: SchemaElement): void {
  drawBlockFrame(g, element, element.typeCode === 1061 ? -6 : -3);
  g.append(path("M 0 3 V 6 H 3 M 3 9 L 9 6 M 9 6 H 12 V 3"));
}

/** Диод моста: треугольник вправо и катодная черта. */
function bridgeDiode(g: SVGGElement, x: number, y: number): void {
  g.append(inkFill(`M ${x} ${y - 1} L ${x} ${y + 1} L ${x + 1.8} ${y} Z`));
  g.append(path(`M ${x + 1.8} ${y - 1} V ${y + 1}`));
}

/** Преобразователь для двигателя постоянного тока. */
export function drawDcDrive(g: SVGGElement, element: SchemaElement): void {
  drawBlockFrame(g, element);
  const three = element.typeCode === 1059 || element.typeCode === 1060;
  const left = element.typeCode === 1057 ? 0 : 3;
  const right = left + 12;
  const rows = three ? [12, 15, 18] : [12, 18];
  const stubs: Array<[number, number]> = three
    ? [
        [4.5, 12],
        [6, 15],
        [7.2, 18],
      ]
    : [
        [4.5, 12],
        [7.2, 18],
      ];
  g.append(path(`M ${left} 12 V 21 M ${right} 12 V 21`));
  for (const y of rows) {
    g.append(path(`M ${left} ${y} H ${right}`));
    bridgeDiode(g, left + 1.2, y);
    bridgeDiode(g, right - 3.3, y);
  }
  for (const [dx, bottom] of stubs) g.append(path(`M ${left + dx} 9 V ${bottom}`));
}

/** Транзистор контроллера шагового двигателя. */
function stepperTransistor(g: SVGGElement, x: number): void {
  g.append(
    path(
      `M ${x - 2.5} 9.1 H ${x - 1.4} M ${x - 1.4} 7.5 V 10.6 ` +
        `M ${x - 1.4} 8.4 L ${x} 7.5 V 6.2 M ${x - 1.4} 9.7 L ${x} 10.7 V 11.3`,
    ),
  );
  g.append(inkFill(`M ${x} 10.9 L ${x - 1.1} 10.6 L ${x - 0.4} 9.7 Z`));
}

/** Контроллер шагового двигателя. */
export function drawStepperController(g: SVGGElement, element: SchemaElement): void {
  g.append(rect(-3, 3, 36, 12));
  for (const t of element.terminals) {
    g.append(path(t.offset.y > 0 ? `M ${t.offset.x} 15 V ${t.offset.y}` : `M ${t.offset.x} 0 V 3`));
  }
  g.append(path("M 24 0 V 3 M 30 0 V 3"));
  g.append(label("L+", 24.9, 1.7, { size: 2.3 }), label("L-", 30.9, 1.7, { size: 2.3 }));
  for (const x of [0, 6, 12, 18]) stepperTransistor(g, x);
  g.append(label("UNIPOLAR", 3.1, 13.4, { size: 2.3 }));
  const names =
    element.typeCode === 1066
      ? ([
          ["CW", -2],
          ["CCW", 3],
          ["PD", 10],
        ] as const)
      : element.typeCode === 1067
        ? ([
            ["CK", -2],
            ["UD", 4],
            ["PD", 10],
          ] as const)
        : [];
  for (const [text, x] of names) g.append(label(text, x, 4.8, { size: 2.3 }));
}
