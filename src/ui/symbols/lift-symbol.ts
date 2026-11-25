import type { SchemaElement } from "@model/types";
import { LIFT_FLOOR_ROLES, liftRoleName } from "@model/lift";

import { circle, group, label, path, rect, shape } from "./svg-primitives";
import { COUNTERWEIGHT, SHAFT, SHEAVE, floorY } from "./lift-geometry";
import { drawLiftCabin, drawLiftMovingBack, led, tag } from "./lift-symbol-cabin";

// ── Лифт на 5 этажей (8300), рамка 66×156, без клемм ───────────────────────────────────────────────────
// Плоский вид анфас: шахта со стенами и приямком, сверху машинное помещение (шкаф с табло, лебёдка -M1),
// уровни этажей с номерами слева, датчики этажей -B1…-B5 на правой стене. Подвижные части — lift-symbol-cabin.ts.
// В симуляции: .lift-sheave поворачивается, .lift-indicator — номер этажа и стрелка, .lift-fault — авария.

const WALL_BACK = "#eef1f4";
const WALL_SIDE = "#d6dce3";
const CONCRETE = "#b9c0c8";
const EDGE = "#56606b";
const MOTOR = "#1d4ed8";
const MOTOR_DARK = "#1e3a8a";

const withClass = <T extends Element>(node: T, cls: string): T => { node.classList.add(cls); return node; };

const poly = (points: ReadonlyArray<readonly [number, number]>, fill: string, extra: Record<string, string | number> = {}) =>
  shape("polygon", {
    points: points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" "),
    fill, stroke: EDGE, "stroke-width": 0.35, "stroke-linejoin": "round", ...extra,
  });

const ROOF = 6;
const WALL = 2;
const THIN = { stroke: EDGE, "stroke-width": 0.3 };

/** Задняя стена шахты и машинного помещения, приямок с буферами. */
function boxInside(): SVGElement[] {
  const { left, right, bottom } = SHAFT;
  return [
    rect(left, ROOF, right - left, bottom - ROOF, { fill: WALL_BACK, stroke: "none" }),
    rect(left - WALL, bottom, right - left + 2 * WALL, 156 - bottom, { fill: CONCRETE, ...THIN }),
    rect(16, bottom - 3.4, 2.4, 3.4, { fill: "#facc15", ...THIN }),
    rect(33.6, bottom - 3.4, 2.4, 3.4, { fill: "#facc15", ...THIN }),
  ];
}

/** Направляющие противовеса. */
function rails(): SVGElement {
  const line = (x: number) => path(`M ${x} ${SHAFT.top + 3} V ${SHAFT.bottom}`, 0.7, { stroke: "#9aa3ad" });
  return group("lift-rails", line(COUNTERWEIGHT.x - 0.5), line(COUNTERWEIGHT.x + COUNTERWEIGHT.w + 0.5));
}

/** Уровень этажа (линия по задней стене) и номер слева от шахты. */
function level(floor: number): SVGElement[] {
  const y = floorY(floor);
  return [
    path(`M ${SHAFT.left} ${y} H ${SHAFT.right}`, 0.35, { stroke: "#9aa3ad" }),
    circle(3.2, y - 9, 2.2, { fill: "#ffffff", stroke: EDGE, "stroke-width": 0.35 }),
    label(String(floor + 1), 3.2, y - 8.9, { size: 2.8, anchor: "middle", fill: "#111827" }),
  ];
}

/** Индуктивный датчик этажа на правой стене (внутри шахты), светодиод и имя снаружи стены. */
function floorSensor(lift: SchemaElement, floor: number): SVGElement[] {
  const role = LIFT_FLOOR_ROLES[floor]!;
  const sy = floorY(floor) - 9.5;
  return [
    rect(SHAFT.right - 3.2, sy - 1.4, 3.2, 2.8, { fill: "#0ea5e9", stroke: "#075985", "stroke-width": 0.3, rx: 0.6 }),
    led(role, SHAFT.right + WALL + 1.2, sy),
    tag(liftRoleName(lift, role), SHAFT.right + WALL + 2.4, sy),
  ];
}

/** Лебёдка: рама, шкив (поворачивается), вал, редуктор, тормоз и мотор -M1 с рёбрами и клеммной коробкой. */
function winch(lift: SchemaElement): SVGElement[] {
  const { cx, cy, r } = SHEAVE;
  const spokes = [0, 60, 120].map((angle) => {
    const a = (angle * Math.PI) / 180;
    return path(`M ${cx - r * Math.cos(a)} ${cy - r * Math.sin(a)} L ${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`,
      0.45, { stroke: "#374151" });
  });
  const g = cx + r + 1.2; // левый край редуктора
  const m = g + 6.6; // левый край мотора
  const fins = Array.from({ length: 4 }, (_, k) => path(`M ${m + 0.5} ${12.4 + k * 1.6} H ${m + 5.5}`, 0.35, { stroke: MOTOR_DARK }));
  const bolts = [[g + 0.7, 12.3], [g + 3.7, 12.3], [g + 0.7, 18.2], [g + 3.7, 18.2]]
    .map(([x, y]) => circle(x!, y!, 0.3, { fill: "#d1d5db", stroke: "#374151", "stroke-width": 0.15 }));
  return [
    rect(cx - r - 1, 19.6, m + 8.5 - (cx - r - 1), 1.8, { fill: "#4b5563", ...THIN }),
    poly([[cx - 2.6, 19.6], [cx + 2.6, 19.6], [cx + 1.4, cy + 1.6], [cx - 1.4, cy + 1.6]], "#6b7280"),
    circle(cx, cy, r + 0.6, { fill: "#374151", ...THIN }),
    group("lift-sheave", circle(cx, cy, r, { fill: "#9ca3af", stroke: "#374151", "stroke-width": 0.35 }),
      circle(cx, cy, r - 0.8, { fill: "none", stroke: "#6b7280", "stroke-width": 0.25 }), ...spokes,
      circle(cx + r * 0.62, cy, 0.5, { fill: "#f59e0b", stroke: "none" })),
    circle(cx, cy, 0.8, { fill: "#e5e7eb", stroke: "#374151", "stroke-width": 0.3 }),
    rect(cx + r, cy - 0.5, 1.2, 1, { fill: "#9ca3af", ...THIN }),
    rect(g, 11.6, 4.4, 8, { fill: "#64748b", stroke: "#334155", "stroke-width": 0.35, rx: 0.8 }),
    ...bolts,
    rect(g + 4.4, 13, 2.2, 5, { fill: "#d1d5db", ...THIN, rx: 0.4 }),
    rect(g + 4.5, 12.4, 2, 0.7, { fill: "#991b1b", stroke: "none" }),
    rect(g + 4.5, 17.9, 2, 0.7, { fill: "#991b1b", stroke: "none" }),
    rect(m, 11.2, 6, 8.4, { fill: MOTOR, stroke: MOTOR_DARK, "stroke-width": 0.4, rx: 1.2 }),
    ...fins,
    rect(m + 0.5, 11.7, 5, 0.9, { fill: "#93c5fd", stroke: "none", "fill-opacity": 0.6, rx: 0.4 }),
    rect(m + 6, 11.8, 1.5, 7.2, { fill: "#1e40af", stroke: MOTOR_DARK, "stroke-width": 0.3, rx: 0.9 }),
    rect(m + 1.2, 8.8, 3.6, 2.4, { fill: "#1e40af", stroke: MOTOR_DARK, "stroke-width": 0.3, rx: 0.4 }),
    tag(liftRoleName(lift, "hoist"), m - 0.6, 10, "end"),
  ];
}

/** Шкаф управления с табло этажа (номер и стрелка) в машинном помещении. */
function controlCabinet(): SVGElement[] {
  return [
    rect(9.4, 7.4, 8.6, 13, { fill: "#d1d5db", stroke: EDGE, "stroke-width": 0.35, rx: 0.6 }),
    rect(10.2, 8.6, 7, 5, { fill: "#0b1220", stroke: "#111827", "stroke-width": 0.3, rx: 0.5 }),
    withClass(label("1", 12.6, 12.2, { size: 4.2, anchor: "middle", fill: "#22c55e" }), "lift-floor-number"),
    withClass(label("", 15.9, 12.2, { size: 3, anchor: "middle", fill: "#22c55e" }), "lift-arrow"),
    circle(11.4, 16.4, 0.7, { fill: "#22c55e", stroke: "#14532d", "stroke-width": 0.2 }),
    circle(13.6, 16.4, 0.7, { fill: "#f59e0b", stroke: "#78350f", "stroke-width": 0.2 }),
  ];
}

/** Перекрытие между машинным помещением и шахтой (поверх кабины у верхнего этажа). */
function machineFloor(): SVGElement[] {
  const { left, right, top } = SHAFT;
  return [rect(left, top, right - left, 3, { fill: "#aab2bb", ...THIN })];
}

/** Стены, крыша и контур: замыкают рисунок поверх всего остального. */
function boxOutside(): SVGElement[] {
  const { left, right, bottom } = SHAFT;
  return [
    rect(left - WALL, ROOF, WALL, bottom - ROOF, { fill: WALL_SIDE, ...THIN }),
    rect(right, ROOF, WALL, bottom - ROOF, { fill: WALL_SIDE, ...THIN }),
    rect(left - WALL, ROOF - WALL, right - left + 2 * WALL, WALL, { fill: CONCRETE, ...THIN }),
  ];
}

/** Табличка аварии над шахтой (видна в симуляции при аварии). */
function faultBanner(): SVGGElement {
  const banner = group("lift-fault",
    rect(2, 60, 60, 11, { fill: "#fee2e2", stroke: "#dc2626", "stroke-width": 0.6, rx: 1.6 }),
    label("⚠", 7, 65.6, { size: 5, anchor: "middle", fill: "#dc2626" }),
    withClass(label("", 12, 65.6, { size: 2.6, anchor: "start", fill: "#991b1b" }), "lift-fault-text"));
  banner.setAttribute("visibility", "hidden");
  return banner;
}

export function drawLift(g: SVGGElement, lift: SchemaElement): void {
  const floors = [0, 1, 2, 3, 4];
  g.append(
    ...boxInside(), rails(), ...floors.flatMap(level),
    ...drawLiftMovingBack(),
    ...drawLiftCabin(lift),
    ...machineFloor(), ...controlCabinet(), ...winch(lift),
    ...boxOutside(), ...floors.flatMap((floor) => floorSensor(lift, floor)),
    faultBanner(),
  );
}
