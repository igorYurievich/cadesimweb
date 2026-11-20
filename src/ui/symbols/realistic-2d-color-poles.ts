import type { SchemaElement } from "@model/types";
import { POLE_COUNT, POLE_VARIANT_OF, isDifferential2d } from "@model/realistic-2d-types";

import { circle, group, label, path, rect } from "./svg-primitives";

// ── Цветной вид автомата 6017 и УЗО 6018 2D ─────────────────────────────────
// По фото модульных аппаратов: светло-серый корпус, круглые клеммы с винтами сверху и снизу, зелёная полоса.
// Геометрия как у простого вида (realistic-2d-poles.ts): полюса с шагом 6, клеммы на y = 0 и y = 27,
// корпус от x = −3 шириной 6 на полюс. Состояние — группы .d2-off / .d2-on (класс is-d2-on).

const BODY = "#e4e5e7";
const CELL = "#eeeff0";
const EDGE = "#9a9da2";
const GREEN = "#13a04a";
const RED = "#d9262c";
const DARK = "#2f3033";
const STEEL = "#cfd2d6";
const STEEL_DARK = "#6f7378";

const box = (x: number, y: number, w: number, h: number, fill: string, extra: Record<string, number> = {}) =>
  rect(x, y, w, h, { fill, stroke: EDGE, "stroke-width": 0.35, ...extra });

const tiny = (value: string, x: number, y: number, rotation: number, fill: string, size = 0.7) =>
  label(value, x, y, { size, anchor: "start", upright: rotation, fill });

/** Клемма: металлическое гнездо с крестовым винтом. */
function terminal(x: number, y: number): SVGGElement {
  return group(
    "d2-screw",
    circle(x, y, 1.9, { fill: "#f7f7f7", stroke: EDGE, "stroke-width": 0.3 }),
    circle(x, y, 1.35, { fill: STEEL, stroke: STEEL_DARK, "stroke-width": 0.35 }),
    path(`M ${x - 0.7} ${y} H ${x + 0.7} M ${x} ${y - 0.7} V ${y + 0.7}`, 0.4, { stroke: STEEL_DARK }),
  );
}

/** Корпус с ячейками клемм сверху и снизу и выводами к точкам подключения. */
function casing(n: number): SVGElement[] {
  const width = 6 * n;
  const out: SVGElement[] = [box(-3, 0.6, width, 25.8, BODY)];
  const leads: string[] = [];
  for (let k = 0; k < n; k += 1) {
    const x = 6 * k;
    leads.push(`M ${x} 0 V 0.6 M ${x} 26.4 V 27`);
    out.push(box(x - 2.8, 0.8, 5.6, 5.6, CELL), box(x - 2.8, 20.6, 5.6, 5.6, CELL));
    out.push(terminal(x, 3.6), terminal(x, 23.4));
  }
  out.push(path(leads.join(" ")));
  return out;
}

/** Белое гнездо рычага полюса. */
const handle = (x: number, y: number, h: number) => box(x - 2.4, y, 4.8, h, "#f8f8f8", { rx: 0.8 });

function drawAutomaticColor(g: SVGGElement, n: number): void {
  const width = 6 * n;
  const poles = (draw: (x: number) => SVGElement[]) => Array.from({ length: n }, (_, k) => draw(6 * k)).flat();
  g.append(
    ...casing(n),
    rect(-2.6, 7.3, width - 0.8, 0.7, { fill: GREEN }),
    // Таблички номинала на первом и третьем полюсе.
    ...[0, 2].filter((k) => k < n).map((k) => rect(6 * k - 1.6, 9.4, 2.4, 0.6, { fill: "#a89a94" })),
    group(
      "d2-switch",
      // Выключен: рычаги вверху с зелёной меткой сверху, чёрная планка под ними.
      group("d2-off",
        ...poles((x) => [handle(x, 11, 6.6), rect(x - 1.8, 11.6, 3.6, 1.2, { fill: GREEN })]),
        rect(-3, 17.6, width, 1.9, { fill: DARK })),
      // Включён: планка поднята, рычаги опущены, внизу красная метка.
      group("d2-on",
        rect(-3, 10.8, width, 1.9, { fill: DARK }),
        ...poles((x) => [handle(x, 12.7, 6.9), rect(x - 1.8, 17.4, 3.6, 1.2, { fill: RED })])),
    ),
  );
}

function drawDifferentialColor(g: SVGGElement, n: number, rotation: number): void {
  const right = 6 * n - 3;
  g.append(
    ...casing(n),
    rect(3, 7.3, right - 3.4, 0.6, { fill: GREEN }),
    // Слева: кнопка «Тест» сверху, окошко состояния и чёрный рычаг.
    box(-2.8, 7, 3.8, 3, DARK),
    tiny("T", -1.3, 8.8, rotation, "#fff", 0.9),
    box(-2.8, 10.2, 3.8, 9.8, "#f4f4f5"),
    group(
      "d2-switch",
      // Выключен: рычаг внизу, на нём тёмная полоса «0-OFF» с зелёной надписью.
      group("d2-off",
        rect(-2.5, 13.4, 3.2, 6.2, { fill: DARK, rx: 0.3 }),
        rect(-2.5, 15.4, 3.2, 1.1, { fill: "#1b1c1e" }), tiny("0-OFF", -2.3, 16.2, rotation, GREEN, 0.6)),
      // Включён: рычаг поднят, внизу рычага красная полоса.
      group("d2-on",
        rect(-2.5, 10.5, 3.2, 6.6, { fill: DARK, rx: 0.3 }),
        rect(-2.5, 15.6, 3.2, 1.3, { fill: RED })),
    ),
    // Справа надписи «ID», 230 V~ и окошко индикатора.
    tiny("ID", 2, 9.8, rotation, "#333", 1.2),
    path(`M 2 10.4 H ${Math.min(right - 0.6, 6.4)}`, 0.2, { stroke: "#555" }),
    rect(2, 11.6, 1.4, 0.8, { fill: "#9ea1a6" }),
    tiny(n > 2 ? "400V~" : "230V~", 4, 12.3, rotation, "#444", 0.6),
    tiny("30mA", 2, 14.2, rotation, "#444", 0.6),
  );
}

/** Цветной автомат или УЗО; false — у типа нет вариантов полюсов. */
export function drawPolesColor(g: SVGGElement, element: SchemaElement, rotation: number): boolean {
  const variant = POLE_VARIANT_OF[element.typeCode];
  if (!variant) return false;
  const n = POLE_COUNT[variant];
  if (isDifferential2d(element.typeCode)) drawDifferentialColor(g, n, rotation);
  else drawAutomaticColor(g, n);
  return true;
}
