import type { SchemaElement } from "@model/types";

import { INK, circle, dashed, group, label, path, rect, shape } from "./svg-primitives";
import { G, ZONE, columns, rowGapOf } from "./contacts";

// Источники питания и простые силовые символы.
export function drawGround(g: SVGGElement, element: SchemaElement): void {
  const x = element.terminals[0]?.offset.x ?? 3;
  g.append(path(`M ${x} 0 V 4.6`));
  g.append(path(`M ${x - 4} 4.6 H ${x + 4} M ${x - 2.6} 6.8 H ${x + 2.6} M ${x - 1.2} 9 H ${x + 1.2}`));
}

/** Трансформатор: два чёрных блока обмоток, между ними три линии сердечника, выводы по краям колонок. */
export function drawTransformer(g: SVGGElement, element: SchemaElement): void {
  const xs = columns(element);
  const gap = rowGapOf(element);
  const m = gap / 2;
  const left = xs[0] ?? 0;
  const right = xs[xs.length - 1] ?? left + 6;
  const block = (y0: number, y1: number): SVGRectElement =>
    shape("rect", {
      x: left,
      y: y0,
      width: right - left,
      height: y1 - y0,
      fill: INK,
      stroke: INK,
      "stroke-width": 0.3,
      "vector-effect": "non-scaling-stroke",
    });
  g.append(block(m - 4.8, m - 1.5), block(m + 1.5, m + 4.8));
  for (const dy of [-0.9, 0, 0.9]) g.append(path(`M ${left} ${m + dy} H ${right}`, 0.6));
  for (const x of xs) g.append(path(`M ${x} 0 V ${m - 4.8} M ${x} ${m + 4.8} V ${gap}`));
}

/** Диод: анод (клемма 1) сверху, катод (клемма 2) снизу, треугольник вершиной вниз. */
export function drawDiode(g: SVGGElement, element: SchemaElement): void {
  const x = element.terminals[0]?.offset.x ?? 0;
  const gap = rowGapOf(element);
  g.append(path(`M ${x} 0 V ${gap}`));
  g.append(
    shape("path", {
      d: `M ${x - 3.3} 3 H ${x + 3.3} L ${x} 8 Z`,
      fill: INK,
      stroke: INK,
      "stroke-width": 0.6,
      "stroke-linejoin": "round",
      "vector-effect": "non-scaling-stroke",
    }),
  );
  g.append(path(`M ${x - 3.3} 8 H ${x + 3.3}`, 0.9));
}

/** Мостовой выпрямитель: ромб 12×12 с диодом внутри и выводами 1 слева, 2 справа, 3 сверху, 4 снизу. */
export function drawRectifier(g: SVGGElement): void {
  g.append(path("M 3 9 L 9 3 L 15 9 L 9 15 Z"));
  g.append(path("M 0 9 H 3 M 15 9 H 18 M 9 0 V 3 M 9 15 V 18"));
  g.append(dashed("M 3.6 9 H 6.6 M 11 9 H 14.4", "1.1 0.9", 0.6));
  g.append(
    shape("path", {
      d: "M 6.6 7.1 V 10.9 L 10.4 9 Z",
      fill: INK,
      stroke: INK,
      "stroke-width": 0.5,
      "stroke-linejoin": "round",
      "vector-effect": "non-scaling-stroke",
    }),
  );
  g.append(path("M 10.6 7.1 V 10.9", 0.9));
  g.append(label("+", 9, 4.9, { size: 2, anchor: "middle" }));
  g.append(label("-", 9, 13.1, { size: 2, anchor: "middle" }));
}

/** Блок питания ~/=: прямоугольник с диагональю, выводы сверху и снизу, PE справа. */
export function drawPowerSupply(g: SVGGElement, element: SchemaElement): void {
  const pe = element.terminals[element.terminals.length - 1];
  const right = (pe?.offset.x ?? 12) - 3;
  const left = -3;
  g.append(rect(left, 3, right - left, 12, { fill: "none", "stroke-width": 0.9 }));
  g.append(path(`M ${left} 15 L ${right} 3`, 0.9));
  for (const t of element.terminals.slice(0, -1)) {
    if (t.offset.y <= 0) g.append(path(`M ${t.offset.x} 0 V 3`));
    else g.append(path(`M ${t.offset.x} 15 V ${t.offset.y}`));
  }
  if (pe) g.append(path(`M ${right} ${pe.offset.y} H ${pe.offset.x}`));
  g.append(path(`M ${left + 1.4} 6.2 q 0.9 -1.5 1.8 0 t 1.8 0`, 0.7));
  g.append(path(`M ${right - 4.6} 11.4 H ${right - 1.2} M ${right - 4.6} 12.7 H ${right - 1.2}`, 0.7));
  g.append(label("-", right - 2.9, 14.1, { size: 1.8, anchor: "middle" }));
  g.append(label("+", left + 1.7, 13.5, { size: 1.8, anchor: "middle" }));
}

/** Батарея/конденсатор: две пластины между выводами «+» (сверху) и «−» (снизу). */
export function drawBattery(g: SVGGElement, element: SchemaElement): void {
  const x = element.terminals[0]?.offset.x ?? 0;
  const gap = rowGapOf(element);
  const mid = gap / 2;
  g.append(path(`M ${x} 0 V ${mid - 1.1} M ${x} ${mid + 1.1} V ${gap}`));
  // Длинная верхняя пластина — положительный полюс; короткая нижняя — отрицательный.
  g.append(path(`M ${x - 3} ${mid - 1.1} H ${x + 3} M ${x - 1.8} ${mid + 1.1} H ${x + 1.8}`, 0.9));
}

/** Розетка: круг с тремя контактами и тремя выводами (сверху, справа, снизу). Клемм в файле нет. */
export function drawOutlet(g: SVGGElement): void {
  g.append(path("M 3 3 V 6 M 3 12 V 15 M 6 9 H 9"));
  g.append(circle(3, 9, 3, { fill: "none" }));
  for (const [dx, dy] of [
    [-0.9, -1.2],
    [1.6, -0.3],
    [-0.8, 1.5],
  ] as const) {
    g.append(
      shape("path", {
        d: `M ${3 + dx} ${9 + dy - 0.5} l 0.45 0.5 l -0.45 0.5 l -0.45 -0.5 Z`,
        fill: INK,
        stroke: INK,
        "stroke-width": 0.3,
        "vector-effect": "non-scaling-stroke",
      }),
    );
  }
}

// ── Предохранители ──────────────────────────────────────────────────────────

/** Предохранитель: вывод проходит сквозь прямоугольник 3.2×6 (клеммы x и x + 12 по вертикали). */
function drawFusePole(g: SVGGElement, x: number): void {
  g.append(rect(x - 1.6, G, 3.2, 6, { "stroke-width": 0.9 }));
  g.append(path(`M ${x} 0 V ${ZONE}`));
}

/** Разомкнутый предохранитель: корпус целый, в центральной линии показан небольшой разрыв. */
function drawFusePoleOpen(g: SVGGElement, x: number): void {
  const gapStart = 5.4;
  const gapEnd = 6.6;
  g.append(rect(x - 1.6, G, 3.2, 6, { "stroke-width": 0.9 }));
  g.append(path(`M ${x} 0 V ${gapStart} M ${x} ${gapEnd} V ${ZONE}`));
}

/** Нейтральный полюс без предохранителя: линия с короткими поперечными засечками. */
function drawFuseNeutral(g: SVGGElement, x: number, open = false): void {
  const center = ZONE / 2;
  const mainLine = open
    ? `M ${x} 0 V ${center - 0.6} M ${x} ${center + 0.6} V ${ZONE}`
    : `M ${x} 0 V ${ZONE}`;
  g.append(path(`${mainLine} M ${x - 1.2} ${G} H ${x + 1.2} M ${x - 1.2} ${ZONE - G} H ${x + 1.2}`));
}

/** Предохранитель-разъединитель: наклонный корпус с осевой линией, выводы короткими отрезками. */
function drawFuseDisconnectorPole(g: SVGGElement, x: number): void {
  const cx = x - 1.5;
  g.append(path(`M ${x} 0 V ${G} M ${x} ${ZONE - G} V ${ZONE}`));
  g.append(
    group(
      "fuse-body",
      rect(cx - 1.6, 2.5, 3.2, 7, {
        "stroke-width": 0.9,
        transform: `rotate(-25 ${cx} 6)`,
      }),
      path(`M ${cx} 2.5 V 9.5`, 0.8, { transform: `rotate(-25 ${cx} 6)` }),
    ),
  );
}

/** Нейтральная лопасть разъединителя: от верхнего вывода влево-вверх к нижнему. */
function drawFuseDisconnectorBlade(g: SVGGElement, x: number): void {
  g.append(path(`M ${x} 0 V ${G} M ${x} ${ZONE - G} V ${ZONE} M ${x - 3} ${G} L ${x} ${ZONE - G}`));
}

export function drawFuse(g: SVGGElement, element: SchemaElement): void {
  const xs = columns(element);
  const disconnector = element.typeCode >= 5005;
  const neutral = element.typeCode % 5 === 1 || element.typeCode % 5 === 4;
  xs.forEach((x, i) => {
    const isNeutral = neutral && i === xs.length - 1;
    if (!disconnector) {
      const open = group("fuse-open");
      if (isNeutral) drawFuseNeutral(open, x, true);
      else drawFusePoleOpen(open, x);
      const closed = group("fuse-closed");
      if (isNeutral) drawFuseNeutral(closed, x);
      else drawFusePole(closed, x);
      g.append(group("fuse-manual", open, closed));
      return;
    }
    // Разъединитель в покое показан наклонным.
    const open = group("fuse-open");
    (isNeutral ? drawFuseDisconnectorBlade : drawFuseDisconnectorPole)(open, x);
    const closed = group("fuse-closed");
    (isNeutral ? drawFuseNeutral : drawFusePole)(closed, x);
    g.append(open, closed);
  });
}
