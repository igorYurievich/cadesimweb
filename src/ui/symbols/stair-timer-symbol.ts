import type { SchemaElement } from "@model/types";
import { isSimpleView } from "@model/realistic-2d-types";
import { STAIR_TIMER_DIAL, dialLabel, stairTimerMinutes, stairTimerWiring } from "@model/stair-timer";

import { circle, group, label, path, rect } from "./svg-primitives";

// ── Минутник Alst 8 (8110), рисунок 15×45: P (3, 0) и 3 (12, 0) сверху, N (3, 42) и 4 (12, 42) снизу ─────
// На схеме рисунок сжат до размера автомата 1P+N 2D (рамка 15×30, клеммы (3, 0) (9, 0) (3, 27) (9, 27)):
// x' = 1 + 2/3·x, y' = 27/42·y (drawStairTimer).
// Цветной вид по фото: светло-серый корпус 1 TE, схема клемм на крышке, синий движок «◎ авто / ☼ постоянно»,
// синее колесо выдержки с отметкой в окошке и «<min», прозрачное окно с шестернёй и медной катушкой реле.
// В симуляции: .d2-on / .d2-off в окне — контакт P–3 (класс is-d2-on), .stair-auto / .stair-perm — положение
// движка (is-stair-permanent), .stair-badge — табличка «☼ ON», .timer-readout — сколько осталось
// (simulation/element-2d.ts). Постоянный свет переключает только клик по .stair-slider (canvas-pointer-down.ts).

const BODY = "#e9eaec";
const CELL = "#f3f4f5";
const EDGE = "#9a9da2";
const BLUE = "#1f63c9";
const BLUE_DARK = "#174a99";
const INK = "#26282b";
const STEEL = "#cfd2d6";
const STEEL_DARK = "#6f7378";

const box = (x: number, y: number, w: number, h: number, fill: string, extra: Record<string, string | number> = {}) =>
  rect(x, y, w, h, { fill, stroke: EDGE, "stroke-width": 0.35, ...extra });

const t = (value: string, x: number, y: number, rotation: number, size: number, fill = INK,
  anchor: "start" | "middle" | "end" = "middle") => label(value, x, y, { size, anchor, upright: rotation, fill });

/** Сколько осталось до отключения (видно только в симуляции, класс timer-readout). */
function readout(x: number, y: number, rotation: number, size: number, anchor: "start" | "middle"): SVGTextElement {
  const node = t("", x, y, rotation, size, "#6b7280", anchor);
  node.classList.add("timer-readout");
  return node;
}

function screw(x: number, y: number): SVGGElement {
  return group(
    "d2-screw",
    circle(x, y, 1.9, { fill: "#fafafa", stroke: EDGE, "stroke-width": 0.3 }),
    circle(x, y, 1.35, { fill: STEEL, stroke: STEEL_DARK, "stroke-width": 0.35 }),
    path(`M ${x - 0.7} ${y} H ${x + 0.7} M ${x} ${y - 0.7} V ${y + 0.7}`, 0.4, { stroke: STEEL_DARK }),
  );
}

/** Ячейки клемм с винтами (сверху — P и 3, снизу — N и 4). */
const terminals = (y: number): SVGElement[] => [
  box(0.3, y, 5.4, 5.6, CELL), box(9.3, y, 5.4, 5.6, CELL), screw(3, y + 2.8), screw(12, y + 2.8),
];

/** Схема на крышке: P 3 / N 4 в кружках и под ними L N ◎ ⊗. */
function pictogram(rotation: number): SVGElement[] {
  const mark = (value: string, x: number, y: number) => [
    circle(x, y, 0.85, { fill: "#fff", stroke: INK, "stroke-width": 0.2 }), t(value, x, y + 0.32, rotation, 0.9),
  ];
  return [
    ...mark("P", 3.2, 8), ...mark("3", 5.6, 8), ...mark("N", 3.2, 10.2), ...mark("4", 5.6, 10.2),
    path("M 3.2 11 V 12.4 M 5.6 11 V 12.4 M 6.4 8 H 8.6 V 12.4", 0.18, { stroke: INK }),
    t("L N", 2.6, 13.6, rotation, 0.85, INK, "start"),
    circle(6.8, 13.3, 0.45, { fill: "none", stroke: INK, "stroke-width": 0.18 }),
    path("M 8.3 12.9 L 9.1 13.7 M 9.1 12.9 L 8.3 13.7", 0.18, { stroke: INK }),
  ];
}

/** Синий движок: вверху — авто (◎), внизу — постоянный свет (☼). */
function slider(): SVGElement[] {
  const rays = [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
    const a = (deg * Math.PI) / 180;
    const at = (r: number) => `${2.3 + Math.cos(a) * r} ${18.7 + Math.sin(a) * r}`;
    return `M ${at(0.75)} L ${at(1.15)}`;
  }).join(" ");
  const knob = (y: number) => [box(4.4, y, 4.8, 2.6, BLUE, { stroke: BLUE_DARK, rx: 0.3 }),
    path(`M 5.2 ${y + 0.9} H 8.4 M 5.2 ${y + 1.7} H 8.4`, 0.2, { stroke: "#7fa8e8" })];
  return [group(
    "stair-slider",
    rect(0.8, 14.2, 9, 6.2, { fill: "transparent", stroke: "none" }),
    circle(2.3, 15.8, 0.85, { fill: "none", stroke: INK, "stroke-width": 0.25 }),
    circle(2.3, 15.8, 0.35, { fill: INK, stroke: "none" }),
    circle(2.3, 18.7, 0.45, { fill: "none", stroke: INK, "stroke-width": 0.22 }), path(rays, 0.18, { stroke: INK }),
    box(4.2, 14.4, 5.2, 5.8, "#d4d6d9"),
    group("stair-auto", ...knob(14.6)), group("stair-perm", ...knob(17.4)),
  )];
}

/** Табличка «☼ ON» поверх отсчёта, пока движок в положении постоянного света. */
const permanentBadge = (x: number, y: number, w: number, rotation: number): SVGGElement => group(
  "stair-badge",
  rect(x, y, w, 2.4, { fill: "#f59e0b", stroke: "#b45309", "stroke-width": 0.25, rx: 0.6 }),
  t("☼ ON", x + w / 2, y + 1.75, rotation, 1.45, "#1f2937"),
);

/** Колесо выдержки: выбранная отметка в окошке, соседние видны по краям. */
function dial(minutes: number, rotation: number): SVGElement[] {
  const k = STAIR_TIMER_DIAL.indexOf(minutes);
  const prev = STAIR_TIMER_DIAL[k - 1];
  const next = STAIR_TIMER_DIAL[k + 1];
  const ribs = Array.from({ length: 9 }, (_, i) => `M 1.7 ${21.6 + i * 0.9} H 2.4`).join(" ");
  return [
    box(1.1, 21, 5.6, 8.6, "#d4d6d9"),
    rect(1.5, 21.3, 4.8, 8, { fill: BLUE, stroke: BLUE_DARK, "stroke-width": 0.3, rx: 0.6 }),
    path(ribs, 0.2, { stroke: "#5f8fdc" }),
    ...(prev !== undefined ? [t(dialLabel(prev), 4.2, 22.7, rotation, 1.05, "#bcd2f5")] : []),
    t(dialLabel(minutes), 4.2, 26.1, rotation, 2.1, "#ffffff"),
    ...(next !== undefined ? [t(dialLabel(next), 4.2, 28.7, rotation, 1.05, "#bcd2f5")] : []),
    t("<min", 7.2, 25.8, rotation, 1.45, INK, "start"),
    readout(7.2, 28.4, rotation, 1.05, "start"),
    permanentBadge(6.9, 26.9, 7.7, rotation),
  ];
}

/** Прозрачное окно справа: шестерня, медная катушка и контакт реле P–3. */
function relayWindow(): SVGElement[] {
  const teeth = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30 * Math.PI) / 180;
    const at = (r: number) => `${12.1 + Math.cos(a) * r} ${11 + Math.sin(a) * r}`;
    return `M ${at(1.7)} L ${at(2.2)}`;
  }).join(" ");
  return [
    rect(9.8, 6.9, 4.9, 23.4, { fill: "#dfe7ec", "fill-opacity": 0.85, stroke: "#b5c0c7", "stroke-width": 0.3 }),
    circle(12.1, 11, 1.8, { fill: "#f4f1ea", stroke: "#b8b2a6", "stroke-width": 0.3 }),
    path(teeth, 0.35, { stroke: "#c9c2b4" }),
    circle(12.1, 16.6, 1.1, { fill: "#cfd5d9", stroke: "#8e989f", "stroke-width": 0.3 }),
    rect(10.5, 19.4, 3.2, 4.2, { fill: "#c47a3a", stroke: "#8a4f1f", "stroke-width": 0.3, rx: 0.4 }),
    path("M 10.5 20.4 H 13.7 M 10.5 21.5 H 13.7 M 10.5 22.6 H 13.7", 0.15, { stroke: "#8a4f1f" }),
    group(
      "d2-switch",
      group("d2-off", path("M 10.8 28.4 H 11.8 L 13.4 26.8 M 13.2 28.4 H 13.9", 0.35, { stroke: "#5c6369" })),
      group("d2-on",
        rect(10.4, 19.2, 3.4, 4.6, { fill: "#ff9b3d", "fill-opacity": 0.45, stroke: "none", rx: 0.6 }),
        path("M 10.8 28.4 H 13.9", 0.4, { stroke: "#d97706" })),
    ),
  ];
}

/** Табличка: Alst 8, катушка 230V~ и контакт 16/230V~. */
function plate(rotation: number): SVGElement[] {
  return [
    t("Alst 8", 1.2, 31.9, rotation, 1.5, INK, "start"),
    rect(1.4, 32.7, 1.6, 1.2, { fill: "none", stroke: INK, "stroke-width": 0.18 }),
    path("M 1.4 33.9 L 3 32.7", 0.18, { stroke: INK }), t("230V~", 3.6, 33.6, rotation, 0.75, INK, "start"),
    path("M 1.2 35 H 1.9 L 2.8 34.3 M 2.8 35 H 3.3", 0.18, { stroke: INK }),
    t("16/230V ~", 3.6, 35.2, rotation, 0.75, INK, "start"),
  ];
}

function drawColor(g: SVGGElement, element: SchemaElement, rotation: number): void {
  g.append(
    path("M 3 0 V 0.6 M 12 0 V 0.6 M 3 41.4 V 42 M 12 41.4 V 42"),
    box(0, 0.6, 15, 40.8, BODY),
    ...terminals(0.8), ...pictogram(rotation), ...relayWindow(), ...slider(),
    ...dial(stairTimerMinutes(element), rotation), ...plate(rotation),
    ...terminals(35.6),
  );
}

/**
 * Простой вид: контакт P–3 сверху, ниже катушка реле времени. У «3 hilos» катушка между P и 4 (кнопки на N),
 * у «4 hilos» — между 4 и N (кнопки на фазу). Справа — переключатель постоянного света «☼».
 */
function drawSimple(g: SVGGElement, element: SchemaElement, rotation: number): void {
  const minutes = dialLabel(stairTimerMinutes(element));
  const coilTop = stairTimerWiring(element) === 4 ? "M 7.5 22 V 18 H 3 V 38" : "M 3 9 V 16 H 7.5 V 22 M 3 34 V 38";
  g.append(
    path("M 3 0 V 4 M 12 0 V 13 M 3 38 V 42 M 12 38 V 42"),
    rect(0, 4, 15, 34, { fill: "#fff", stroke: "#4b5563", "stroke-width": 0.6 }),
    // Контакт P–3: P заходит слева сверху, подвижный контакт к 3.
    path("M 3 4 V 9 H 7 M 7 9 L 11 6.6 M 12 9 V 13", 0.5, { stroke: "#4b5563" }),
    group("d2-switch", group("d2-on", path("M 7 9 H 12", 0.6, { stroke: "#d97706" }))),
    // Катушка с выдержкой (прямоугольник с закрашенной половиной, как реле времени): сверху к P или к N, снизу к 4.
    rect(4.5, 22, 6, 5, { fill: "#fff", stroke: "#4b5563", "stroke-width": 0.5 }),
    rect(4.5, 22, 2.2, 5, { fill: "#4b5563", stroke: "none" }),
    path(`M 7.5 27 V 30 H 12 V 38 ${coilTop}`, 0.45, { stroke: "#4b5563" }),
    group(
      "stair-slider",
      rect(9.4, 14.4, 4.6, 4.2, { fill: "#eef2ff", stroke: "#4b5563", "stroke-width": 0.4, rx: 0.5 }),
      t("☼", 11.7, 17.4, rotation, 2.4, "#2b2f33"),
    ),
    t(`${minutes} min`, 7.5, 33.4, rotation, 1.6, "#2b2f33"),
    readout(7.5, 36.3, rotation, 1.1, "middle"),
    permanentBadge(2.6, 34.4, 9.8, rotation),
  );
}

export function drawStairTimer(g: SVGGElement, element: SchemaElement, rotation: number): void {
  const inner = group("stair-scale");
  inner.setAttribute("transform", `translate(1 0) scale(${2 / 3} ${27 / 42})`);
  if (isSimpleView(element)) drawSimple(inner, element, rotation);
  else drawColor(inner, element, rotation);
  g.append(inner);
}
