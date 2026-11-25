import { MECHANISM_SPECS, MECH_CROSS, MECH_PUSH, MECH_TWO_WAY } from "@model/mechanisms";

import { circle, group, label, path, rect } from "./svg-primitives";

// ── Вид сзади механизмов Niessen (8120…8123), рамка 24×30 как у вида спереди ─────────────────────────────
// По фото задней стороны: чёрный корпус с защёлками по бокам, посередине клеммный блок. У каждой клеммы —
// пара отверстий под провод (быстрое подключение), рядом маркировка клеммы, в центре напечатан схемный символ.
// Отверстия стоят над точками подключения (MECHANISM_SPECS), поэтому провода подходят прямо к ним.
// В симуляции символ переключается так же, как простой вид: группы .d2-switch .d2-on / .d2-off по is-d2-on.

const BODY = "#2a2c2f";
const BLOCK = "#36393d";
const PRINT = "#e4e6e8";
const HOLE = "#0b0c0d";

const text = (value: string, x: number, y: number, rotation: number) =>
  label(value, x, y, { size: 1.5, anchor: "middle", upright: rotation, fill: PRINT });

function body(): SVGElement[] {
  const clips = [0.9, 21.3].flatMap((x) => [
    rect(x, 7.4, 1.8, 4.6, { fill: "#4a4e53", stroke: "none", rx: 0.3 }),
    rect(x, 13.2, 1.8, 3.6, { fill: "#1a1c1e", stroke: "none", rx: 0.3 }),
    rect(x, 18, 1.8, 4.6, { fill: "#4a4e53", stroke: "none", rx: 0.3 }),
  ]);
  return [
    rect(0.3, 3.3, 23.4, 23.4, { fill: BODY, stroke: "#141518", "stroke-width": 0.4, rx: 1.4 }),
    ...clips,
    rect(3.4, 4.4, 17.2, 21.2, { fill: BLOCK, stroke: "#55595e", "stroke-width": 0.35, rx: 0.8 }),
  ];
}

/** Пара отверстий над каждой клеммой и маркировка клеммы рядом (сверху — под отверстиями, снизу — над ними). */
function terminals(code: number, rotation: number): SVGElement[] {
  const spec = MECHANISM_SPECS[code];
  if (!spec) return [];
  return spec.points.flatMap((p, k) => {
    const top = p.y === 0;
    const y = top ? 6.2 : 23.8;
    const hole = (x: number) => circle(x, y, 0.95, { fill: HOLE, stroke: "#5c6166", "stroke-width": 0.25 });
    return [hole(p.x - 1.15), hole(p.x + 1.15), text(spec.labels[k] ?? "", p.x, top ? 8.5 : 21.5, rotation)];
  });
}

const dot = (x: number, y: number) => circle(x, y, 0.45, { fill: PRINT, stroke: "none" });
const ink = (d: string, extra: Record<string, string | number> = {}) => path(d, 0.55, { stroke: PRINT, ...extra });
const state = (off: string, on: string) =>
  group("d2-switch", group("d2-off", ink(off)), group("d2-on", ink(on)));

/** Схемный символ, напечатанный в центре клеммного блока (y = 10.4…19.6). */
function printedSymbol(code: number): SVGElement[] {
  switch (code) {
    case MECH_TWO_WAY:
      return [
        ink("M 12 10.4 V 12.2 M 8 17.8 V 19.6 M 16 17.8 V 19.6"), dot(12, 12.2), dot(8, 17.8), dot(16, 17.8),
        state("M 12 12.2 L 8 17.8", "M 12 12.2 L 16 17.8"),
      ];
    case MECH_CROSS:
      return [
        ink("M 8 10.4 V 12.2 M 16 10.4 V 12.2 M 8 17.8 V 19.6 M 16 17.8 V 19.6"),
        ...[[8, 12.2], [16, 12.2], [8, 17.8], [16, 17.8]].map(([x, y]) => dot(x!, y!)),
        state("M 8 12.2 V 17.8 M 16 12.2 V 17.8", "M 8 12.2 L 16 17.8 M 16 12.2 L 8 17.8"),
        rect(6.4, 11, 11.2, 8, { fill: "none", stroke: PRINT, "stroke-width": 0.3, "stroke-dasharray": "0.8 0.8" }),
      ];
    default: {
      const parts = [ink("M 12 10.4 V 12 M 12 19.6 V 18"), dot(12, 18), state("M 12 18 L 9.4 12.4", "M 12 18 L 12 12")];
      // Кнопка: штриховая связь с толкателем, как в условном обозначении нажимного выключателя.
      if (code === MECH_PUSH) parts.push(ink("M 10.7 15.2 H 7.2 M 7.2 13.8 V 16.6", { "stroke-dasharray": "0.8 0.6" }));
      return parts;
    }
  }
}

export function drawMechanismBack(g: SVGGElement, code: number, rotation: number): void {
  const spec = MECHANISM_SPECS[code];
  const leads = spec?.points.map((p) => `M ${p.x} ${p.y} V ${p.y === 0 ? 3.3 : 26.7}`).join(" ") ?? "";
  g.append(path(leads), ...body(), ...terminals(code, rotation), ...printedSymbol(code));
}
