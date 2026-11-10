import type { SchemaElement } from "@model/types";

import { ZONE, columns, contactColumn, linkBar, rowGapOf } from "./contacts";
import { INK, dashed, group, path, rect, shape } from "./svg-primitives";
import { conColumn } from "./auxiliary-contacts";

/** Аппараты с блоком расцепителей под полюсами. */
const TRIP_BLOCK_TYPES: ReadonlySet<number> = new Set([6008, 6009, 6010, 6011, 6012]);

/** Аппараты, у которых последний полюс — нейтраль (без расцепителя и без точки на лопасти). */
const NEUTRAL_POLE_TYPES: ReadonlySet<number> = new Set([6001, 6004, 6005, 6006, 6011, 6012]);

// Защитные аппараты и их расцепители.
export function drawBreakerPoles(g: SVGGElement, element: SchemaElement): void {
  const xs = columns(element);
  const rowGap = rowGapOf(element);
  const hasNeutral = NEUTRAL_POLE_TYPES.has(element.typeCode);
  xs.forEach((x, i) => {
    g.append(
      contactColumn(x, rowGap, {
        control: "open",
        blob: !(hasNeutral && i === xs.length - 1),
      }),
    );
    if (rowGap > ZONE && !TRIP_BLOCK_TYPES.has(element.typeCode))
      g.append(path(`M ${x} ${ZONE} V ${rowGap}`));
  });
  g.append(linkBar(xs));
}

/** Блок расцепителей под полюсами 6008–6012. */
export function drawTripBlock(g: SVGGElement, element: SchemaElement): void {
  const xs = columns(element);
  const rowGap = rowGapOf(element);
  const top = rowGap - 8.5;
  const cells = NEUTRAL_POLE_TYPES.has(element.typeCode) ? xs.slice(0, -1) : xs;
  const left = (cells[0] ?? 0) - 3;
  const right = (cells[cells.length - 1] ?? 0) + 3;
  g.append(rect(left, top, right - left, 5.5, { fill: "none" }));
  g.append(path(`M ${left} ${top + 3} H ${right}`, 0.7));
  for (const x of cells.slice(0, -1)) g.append(path(`M ${x + 3} ${top} V ${top + 5.5}`, 0.7));
  for (const x of cells) {
    g.append(path(`M ${x} ${top} V ${top + 0.9} H ${x + 2.4} V ${top + 2.2} H ${x} V ${top + 3}`, 0.8));
    g.append(
      path(
        `M ${x - 1.2} ${top + 3.7} V ${top + 4.9} M ${x - 0.1} ${top + 3.7} ` +
          `L ${x + 1.7} ${top + 4.3} L ${x - 0.1} ${top + 4.9} Z`,
        0.55,
      ),
    );
  }
  // Лишние отрезки вывода внутри рамки: вывод проходит сквозь крюк.
  for (const x of cells) g.append(path(`M ${x} ${ZONE} V ${top} M ${x} ${top + 3} V ${rowGap}`));
  for (const x of xs) if (!cells.includes(x)) g.append(path(`M ${x} ${ZONE} V ${rowGap}`));
  // Символ дифференциальной защиты.
  const x0 = (cells[0] ?? 0) - 10;
  g.append(path(`M ${x0} 3.2 V 7 M ${x0} 5.1 H ${x0 + 1.8}`, 0.8));
  g.append(rect(x0 + 1.8, 2.9, 4.4, 4.4, { fill: "none" }));
  g.append(path(`M ${x0 + 4} 2.9 V 7.3 M ${x0 + 1.8} 5.1 H ${x0 + 6.2} M ${x0 + 6.2} 5.1 H ${left}`, 0.7));
  g.append(dashed(`M ${x0 + 4} 7.3 V ${top + 4.3}`));
  g.append(dashed(`M ${x0 + 4} ${top + 1.5} H ${left}`));
  g.append(dashed(`M ${x0 + 4} ${top + 4.3} H ${left}`));
}

/** Дифференциальный расцепитель: символ УЗО слева, капсула вокруг полюсов, пунктирная связь. */
export function drawDifferentialBlock(g: SVGGElement, element: SchemaElement): void {
  const xs = columns(element);
  const first = xs[0] ?? 0;
  const last = xs[xs.length - 1] ?? first;
  const left = first - 1.8;
  const x0 = first - 10;
  g.append(
    shape("rect", {
      x: left,
      y: 12,
      width: last + 1.8 - left,
      height: 3,
      rx: 1.5,
      fill: "#fff",
      stroke: INK,
      "stroke-width": 0.8,
      "vector-effect": "non-scaling-stroke",
    }),
  );
  for (const x of xs) g.append(path(`M ${x} 12 V 15`));
  g.append(path(`M ${x0} 3.2 V 7 M ${x0} 5.1 H ${x0 + 1.8}`, 0.8));
  g.append(rect(x0 + 1.8, 2.9, 4.4, 4.4, { fill: "none" }));
  g.append(
    path(`M ${x0 + 4} 2.9 V 7.3 M ${x0 + 1.8} 5.1 H ${x0 + 6.2} M ${x0 + 6.2} 5.1 H ${first - 3}`, 0.7),
  );
  g.append(dashed(`M ${x0 + 4} 7.3 V 13.5 H ${left}`));
}

/** Ограничитель перенапряжения. */
export function drawSurgeLimiter(g: SVGGElement, element: SchemaElement): void {
  const xs = columns(element);
  const first = xs[0] ?? 0;
  const last = xs[xs.length - 1] ?? first;
  const bus = 14.3;
  g.append(dashed(`M ${first - 3} 3 H ${last + 3} V 15 H ${first - 3} Z`, "2 1.4"));
  const arrow = (d: string): SVGPathElement =>
    shape("path", {
      d,
      fill: INK,
      stroke: INK,
      "stroke-width": 0.4,
      "stroke-linejoin": "round",
      "vector-effect": "non-scaling-stroke",
    });
  for (const x of xs) {
    g.append(path(`M ${x} 0 V 5.6`));
    g.append(arrow(`M ${x - 1.2} 5.6 H ${x + 1.2} L ${x} 8 Z`));
    g.append(arrow(`M ${x - 1.2} 12.2 H ${x + 1.2} L ${x} 10 Z`));
    g.append(path(`M ${x} 12.2 V ${bus}`));
  }
  for (const x of xs.slice(0, -1)) g.append(dashed(`M ${x + 3} 3 V 15`, "1.6 1.2", 0.6));
  g.append(path(`M ${first} ${bus} H ${last} M ${first} ${bus} V 18`));
}

/** Защита двигателя / тепловое реле 6007: рамка с тремя «крюками». */
export function drawMotorProtection(g: SVGGElement, element: SchemaElement): void {
  const xs = columns(element);
  const rowGap = rowGapOf(element);
  const left = (xs[0] ?? 0) - 1.6;
  const right = (xs[xs.length - 1] ?? 0) + 4.6;
  g.append(rect(left, 3, right - left, 6, { fill: "none", "stroke-width": 0.9 }));
  const mid = (7.4 + rowGap) / 2;
  for (const x of xs) {
    g.append(path(`M ${x} 0 V 4.6 H ${x + 3} V 7.4 H ${x}`));
    // Силовой полюс реле: замкнут (сплошная линия) или разомкнут вручную/при срабатывании (разрыв с лопастью).
    g.append(group("mp-closed", path(`M ${x} 7.4 V ${rowGap}`)));
    g.append(
      group(
        "mp-open",
        path(`M ${x} 7.4 V ${mid - 2}`),
        path(`M ${x - 2.6} ${mid - 2} L ${x} ${mid + 2}`),
        path(`M ${x} ${mid + 2} V ${rowGap}`),
      ),
    );
  }
  g.append(dashed(`M ${left - 3.2} 6 H ${left}`, "1.4 1"));
  g.append(path(`M ${left - 3.2} 7.4 V 6`, 0.8));
}

// ── Прочее ──────────────────────────────────────────────────────────────────

/** Метка срабатывания теплового реле справа от лопасти (общая для 8016–8019): x — правая клемма/лопасть. */
function thermalTripMark(x: number): SVGPathElement {
  return path(`M ${x + 3.8} 4 V 5 H ${x + 5.2} V 7 H ${x + 3.8} V 7.8`, 0.8);
}

/** Тепловые контакты 8016 и 8017. */
export function drawThermalSingle(g: SVGGElement, element: SchemaElement, nc: boolean): void {
  const x = columns(element)[0] ?? 0;
  g.append(
    contactColumn(x, rowGapOf(element), {
      nc,
      control: "trip",
      straightClosed: !nc,
      straightOpenNc: nc,
    }),
  );
  g.append(dashed(`M ${x - 4.7} 6 H ${nc ? x + 1.5 : x - 1.5}`, "1.6 1.2"));
  g.append(path(`M ${x - 6.7} 7.8 V 6 H ${x - 5.1} V 7.8`, 0.8));
  g.append(thermalTripMark(x));
}

/** Тепловой контакт CON 8019: общий 95 сверху, НЗ 96 и НО 98 снизу; пунктир идёт к середине лопасти 95-96. */
export function drawThermalCon(g: SVGGElement, element: SchemaElement): void {
  const top = element.terminals[0]?.offset.x ?? 3;
  const nc = element.terminals[1]?.offset.x ?? 0;
  const no = element.terminals[2]?.offset.x ?? 6;
  const left = Math.min(top, nc, no);
  g.append(conColumn(top, nc, no, "trip"));
  g.append(dashed(`M ${left - 4.7} 6 H ${(top + nc) / 2}`, "1.6 1.2"));
  g.append(path(`M ${left - 6.7} 7.8 V 6 H ${left - 5.1} V 7.8`, 0.8));
  g.append(thermalTripMark(no));
}

export function drawThermalAux(g: SVGGElement, element: SchemaElement): void {
  const xs = columns(element);
  const rowGap = rowGapOf(element);
  const nc = xs[0] ?? 0;
  const no = xs[1] ?? nc + 9;
  g.append(
    contactColumn(nc, rowGap, {
      nc: true,
      control: "trip",
      straightOpenNc: true,
    }),
  );
  g.append(contactColumn(no, rowGap, { control: "trip", straightClosed: true }));
  g.append(dashed(`M ${nc - 4.7} 6 H ${no - 1.5}`, "1.6 1.2"));
  g.append(path(`M ${nc - 6.7} 7.8 V 6 H ${nc - 5.1} V 7.8`, 0.8));
  g.append(path(`M ${no + 3.8} 4 V 5 H ${no + 5.2} V 7 H ${no + 3.8} V 7.8`, 0.8));
}
