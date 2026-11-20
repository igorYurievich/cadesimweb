import type { SchemaElement } from "@model/types";
import { POLE_COUNT, POLE_LABELS, POLE_VARIANT_OF, isDifferential2d } from "@model/realistic-2d-types";
import type { PoleVariant } from "@model/realistic-2d-types";

import { INK, circle, dashed, group, label, path, rect } from "./svg-primitives";

// ── Автомат 6017 и дифавтомат 6018 2D ───────────────────────────────────────
// Рисунок по скриншотам simbolos_2d.zip. Полюса с шагом 6: верхние клеммы на y = 0, нижние на y = 27,
// корпус от x = −3 шириной 6 на полюс. Подвижные части — группы .d2-off/.d2-on (см. realistic-2d.ts).

const HANDLE = "#6b6b6b";
const TINY = 0.85;

function screwX(x: number, y: number): SVGGElement {
  const d = 0.75;
  return group(
    "d2-screw",
    circle(x, y, 1.35, { fill: "#fff" }),
    path(`M ${x - d} ${y - d} L ${x + d} ${y + d} M ${x + d} ${y - d} L ${x - d} ${y + d}`, 0.6),
  );
}

function small(value: string, x: number, y: number, rotation: number, size = 1.3): SVGElement {
  return label(value, x, y, { size, anchor: "start", upright: rotation });
}

function handleRect(x: number, y: number, w: number, h: number, fill = HANDLE): SVGRectElement {
  return rect(x, y, w, h, { fill });
}

/** Корпус, отметки клемм и винты сверху и снизу (подписи клемм рисует общий код). */
function casing(n: number, lines: readonly number[]): SVGElement[] {
  const width = 6 * n;
  const out: SVGElement[] = [rect(-3, 0.6, width, 25.8, { fill: "#fff" })];
  const ticks: string[] = [];
  const rules = lines.map((y) => `M -3 ${y} H ${width - 3}`);
  for (let k = 0; k < n; k += 1) {
    const x = 6 * k;
    ticks.push(`M ${x} 0 V 0.6 M ${x} 26.4 V 27`);
    if (k < n - 1) rules.push(`M ${x + 3} 0.6 V 6.6 M ${x + 3} 20.4 V 26.4`);
    out.push(screwX(x, 3.6), screwX(x, 23.4));
  }
  out.push(path(ticks.join(" ")), path(rules.join(" "), 0.6));
  return out;
}

/** Мини-полюс внутренней схемы: в покое разомкнут, при включении замкнут. */
function miniPole(x: number, y1: number, y2: number, split: number, top: string, bottom: string, rotation: number): SVGElement[] {
  return [
    path(`M ${x} ${y1} V ${y1 + 0.8} M ${x} ${split} V ${y2}`, 0.5),
    group("d2-switch",
      group("d2-off", path(`M ${x} ${split} L ${x - 1.1} ${y1 + 1}`, 0.5)),
      group("d2-on", path(`M ${x} ${split} V ${y1 + 0.8}`, 0.5))),
    small(top, x + 0.3, y1 + 0.5, rotation, TINY),
    small(bottom, x + 0.3, y2 - 0.1, rotation, TINY),
  ];
}

function drawAutomatic(g: SVGGElement, variant: PoleVariant, rotation: number): void {
  const n = POLE_COUNT[variant];
  const labels = POLE_LABELS[variant];
  const width = 6 * n;
  const cx = 3 * (n - 1);
  const xs = Array.from({ length: n }, (_, k) => cx + (k - (n - 1) / 2) * 2.2);
  const inner = group(
    "d2-inner",
    ...xs.flatMap((x, k) => miniPole(x, 7, 10.3, 9.5, labels[k] ?? "", labels[n + k] ?? "", rotation)),
    // Расцепитель на фазных полюсах — квадратик справа от ножа.
    ...xs.flatMap((x, k) => (labels[k] === "N" ? [] : [rect(x + 0.15, 8.3, 0.55, 0.55, { fill: INK })])),
    dashed(`M ${xs[0]! - 0.9} 8.6 H ${xs[n - 1]! + 0.1}`, "0.5 0.4", 0.4),
  );
  g.append(
    ...casing(n, [6.6, 11.4, 16.4, 18.4, 20.4]),
    inner,
    group(
      "d2-switch",
      // Выключен: ручки внизу (квадраты над общей планкой); включён: планка поднята, квадраты под ней.
      group("d2-off", ...xs.map((_, k) => handleRect(6 * k - 2.2, 11.8, 4.4, 2.2)), handleRect(-2.6, 14, width - 0.8, 2)),
      group("d2-on", handleRect(-2.6, 10.6, width - 0.8, 2), ...xs.map((_, k) => handleRect(6 * k - 2.2, 12.8, 4.4, 2.4))),
    ),
  );
}

function drawDifferential(g: SVGGElement, variant: PoleVariant, rotation: number): void {
  const n = POLE_COUNT[variant];
  const labels = POLE_LABELS[variant];
  const xs = Array.from({ length: n }, (_, k) => 5.4 + k * 2.4);
  const first = xs[0]!;
  const last = xs[n - 1]!;
  const inner = group(
    "d2-inner",
    // Кнопка «Тест» с механической связью к полюсам.
    path("M 1.8 11.3 V 12.9 M 1.8 12.1 H 2.2 M 3 11.3 V 12.9 M 2.2 12.1 H 3.8", 0.45),
    rect(2.2, 11.3, 1.6, 1.6, { fill: "none" }),
    dashed(`M 3.8 12.3 H ${last + 0.4}`, "0.5 0.4", 0.4),
    ...xs.flatMap((x, k) => miniPole(x, 10.6, 18.6, 13.4, labels[k] ?? "", labels[n + k] ?? "", rotation)),
    // Тороид вокруг полюсов и связь расцепителя.
    rect(first - 0.7, 15.4, last - first + 1.4, 1.4, { fill: "none", rx: 0.7 }),
    dashed(`M ${first - 0.7} 16.1 H 3`, "0.5 0.4", 0.4),
    path("M 2.5 15.5 V 16.1 H 2.9", 0.45),
  );
  g.append(
    ...casing(n, [6.6, 20.4]),
    // Колонка рычага слева: сверху кнопка, ниже рычаг (выключен — белое окно сверху, включён — снизу).
    handleRect(-2.8, 7, 3.8, 2.8),
    group(
      "d2-switch",
      group("d2-off", handleRect(-2.8, 10, 3.8, 3.7, "#fff"), handleRect(-2.8, 13.8, 3.8, 2.8), handleRect(-2.8, 16.7, 3.8, 2.8)),
      group("d2-on", handleRect(-2.8, 10, 3.8, 2.7), handleRect(-2.8, 12.8, 3.8, 2.7), handleRect(-2.8, 15.6, 3.8, 3.9, "#fff")),
    ),
    inner,
  );
}

export function drawPoles2d(g: SVGGElement, element: SchemaElement, rotation: number): void {
  const variant = POLE_VARIANT_OF[element.typeCode] ?? "IN";
  if (isDifferential2d(element.typeCode)) drawDifferential(g, variant, rotation);
  else drawAutomatic(g, variant, rotation);
}
