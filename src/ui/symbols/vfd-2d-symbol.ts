import type { SchemaElement } from "@model/types";
import { VFD_2D_1PH_LABELS, VFD_2D_1PH_POINTS, VFD_2D_LABELS, VFD_2D_POINTS } from "@model/vfd";

import { circle, group, label, path, rect } from "./svg-primitives";

// ── Преобразователь частоты 2D (10240, только веб), рамка 48×90 ─────────────────────────────────────────
// Компактный трёхфазный преобразователь в тёмно-сером корпусе (по фото пользователя, без марки производителя):
// решётка вентилятора сверху, синяя полоса, панель с 5-разрядным дисплеем, светодиодами R/S F/R FAULT и Hz,
// ручкой задания частоты и кнопками PRG ▲ SET / RUN ▼ STOP; ниже крышка клемм со знаком «высокое напряжение».
// Корпус x 0…42, y 3…87; силовые клеммы сверху (R S T PE) и снизу (U V W PE), клеммы управления справа (x = 45).
// В симуляции (simulation/element-vfd.ts): .vfd2d-digits — частота, .vfd2d-led-* — светодиоды, .vfd2d-knob-mark —
// поворот ручки по заданию. Клики по [data-vfd-key] (run / stop / up / down / knob) — canvas-pointer-down.ts.

const BODY = "#3d4248";
const BODY_DARK = "#2c3035";
const EDGE = "#1f2226";
const PANEL = "#23272c";
const COVER = "#555b62";
const BLUE = "#1e88e5";

const t = (value: string, x: number, y: number, size: number, fill: string, anchor: "start" | "middle" | "end" = "middle") =>
  label(value, x, y, { size, anchor, fill });

function key(kind: string, x: number, y: number, fill: string, text: string, textSize = 1.7): SVGGElement {
  const node = group(
    `vfd2d-key vfd2d-key-${kind}`,
    circle(x, y, 3.1, { fill, stroke: "#0d0f12", "stroke-width": 0.35 }),
    circle(x - 0.5, y - 0.6, 2.2, { fill: "#ffffff", "fill-opacity": 0.16, stroke: "none" }),
    t(text, x, y + 0.05, textSize, "#ffffff"),
  );
  node.dataset.vfdKey = kind;
  return node;
}

function led(kind: string, x: number, y: number): SVGElement {
  const node = circle(x, y, 0.55, { fill: "#4b1d1d", stroke: "none" });
  node.classList.add("vfd2d-led", `vfd2d-led-${kind}`);
  return node;
}

export function drawVfd2d(g: SVGGElement, element: SchemaElement): void {
  // Выводы клемм.
  for (const p of VFD_2D_POINTS) {
    if (p.y === 0) g.append(path(`M ${p.x} 0 V 3`, 0.8));
    else if (p.y === 90) g.append(path(`M ${p.x} 87 V 90`, 0.8));
    else g.append(path(`M 42 ${p.y} H 45`, 0.8));
  }
  // Корпус и решётка вентилятора.
  g.append(rect(0, 3, 42, 84, { fill: BODY, stroke: EDGE, "stroke-width": 0.5, rx: 1.6 }));
  g.append(rect(3, 7.2, 36, 6.6, { fill: BODY_DARK, stroke: EDGE, "stroke-width": 0.3, rx: 1 }));
  for (let x = 6; x <= 36; x += 3) g.append(path(`M ${x} 8.2 V 12.8`, 0.55, { stroke: "#5b6168" }));
  // Синяя полоса.
  g.append(rect(1.2, 15, 39.6, 2.2, { fill: BLUE, stroke: "none" }));
  g.append(t("VFD", 3.4, 16.15, 1.7, "#ffffff", "start"));
  // Панель.
  g.append(rect(3, 19, 36, 31, { fill: PANEL, stroke: "#14171a", "stroke-width": 0.4, rx: 1.2 }));
  // Дисплей.
  g.append(rect(9.5, 21.4, 19, 7.4, { fill: "#0b0d10", stroke: "#4b5563", "stroke-width": 0.3, rx: 0.6 }));
  const digits = t("", 19, 25.25, 5, "#3b0d0d");
  digits.classList.add("vfd2d-digits");
  digits.setAttribute("font-family", "ui-monospace, Consolas, monospace");
  g.append(digits);
  // Светодиоды состояния слева и единицы справа.
  g.append(t("R/S", 7.6, 22.6, 1.25, "#cbd5e1", "end"), led("run", 8.6, 22.6));
  g.append(t("F/R", 7.6, 25.1, 1.25, "#cbd5e1", "end"), led("rev", 8.6, 25.1));
  g.append(t("FLT", 7.6, 27.6, 1.25, "#cbd5e1", "end"), led("fault", 8.6, 27.6));
  g.append(led("hz", 29.6, 22.6), t("Hz", 30.4, 22.6, 1.25, "#cbd5e1", "start"));
  // Ручка задания частоты: клик слева — меньше, справа — больше (data-vfd-key="knob").
  const knob = group(
    "vfd2d-knob",
    circle(35.2, 25.2, 3.4, { fill: "#111316", stroke: "#000", "stroke-width": 0.3 }),
    circle(35.2, 25.2, 2.5, { fill: "#2b2f34", stroke: "#0b0c0e", "stroke-width": 0.3 }),
  );
  const mark = path("M 35.2 25.2 V 23", 0.7, { stroke: "#f8fafc" });
  mark.classList.add("vfd2d-knob-mark");
  knob.append(mark);
  knob.dataset.vfdKey = "knob";
  g.append(knob);
  // Кнопки.
  g.append(
    key("prg", 10.5, 35, "#1e88e5", "PRG", 1.35), key("up", 21, 35, "#1e88e5", "▲", 2.4), key("set", 31.5, 35, "#1e88e5", "SET", 1.35),
    key("run", 10.5, 44, "#22a447", "RUN", 1.35), key("down", 21, 44, "#1e88e5", "▼", 2.4), key("stop", 31.5, 44, "#e53935", "STOP", 1.2),
  );
  // Крышка клемм со знаком «высокое напряжение».
  g.append(rect(1.2, 53, 39.6, 28, { fill: COVER, stroke: EDGE, "stroke-width": 0.35, rx: 1 }));
  g.append(rect(4, 55.5, 8, 7, { fill: "#4a4f56", stroke: EDGE, "stroke-width": 0.3, rx: 0.6 }));
  g.append(path("M 31 66 L 35.5 74 H 26.5 Z", 0.5, { stroke: "#e5e7eb", fill: "none" }));
  g.append(t("!", 31, 71.6, 3.2, "#e5e7eb"));
  g.append(t("WARNING", 4, 70, 1.5, "#d1d5db", "start"), t("High voltage", 4, 72.4, 1.2, "#d1d5db", "start"));
  // Подписи клемм поверх корпуса: силовые — у верхнего и нижнего края, управления — справа у выводов.
  for (const [k, p] of VFD_2D_POINTS.entries()) {
    const text = element.terminals[k]?.label ?? VFD_2D_LABELS[k] ?? "";
    if (p.y === 0) g.append(t(text, p.x, 5.4, 1.8, "#f1f5f9"));
    else if (p.y === 90) g.append(t(text, p.x, 84.8, 1.8, "#f1f5f9"));
    else g.append(t(text, 40.6, p.y, 1.6, "#f1f5f9", "end"));
  }
}

// ── Однофазный преобразователь 2D (10241): чёрный корпус, сверху над дисплеем светодиоды MOD ALM FWD REV,
// 4-разрядный дисплей с A / Hz справа; кнопки RUN, STOP/RESET и ручка; SHIFT, REV/JOG, ENTER/DATA; ESC/MENU, ▲, ▼.
// Ручка: data-cx/data-cy центра для поворота метки (element-vfd.ts). REV/JOG — data-vfd-key="rev".

function key2(kind: string, x: number, y: number, fill: string, top: string, bottom?: string): SVGGElement {
  const node = group(
    `vfd2d-key vfd2d-key-${kind}`,
    circle(x, y, 3.2, { fill, stroke: "#050506", "stroke-width": 0.35 }),
    circle(x - 0.5, y - 0.7, 2.2, { fill: "#ffffff", "fill-opacity": 0.12, stroke: "none" }),
  );
  if (bottom) {
    node.append(t(top, x, y - 0.75, 1.15, "#ffffff"), path(`M ${x - 1.8} ${y} H ${x + 1.8}`, 0.18, { stroke: "#ffffff" }), t(bottom, x, y + 0.85, 1.15, "#ffffff"));
  } else node.append(t(top, x, y + 0.05, top.length > 2 ? 1.3 : 2.4, "#ffffff"));
  node.dataset.vfdKey = kind;
  return node;
}

export function drawVfd2dMono(g: SVGGElement, element: SchemaElement): void {
  for (const p of VFD_2D_1PH_POINTS) {
    if (p.y === 0) g.append(path(`M ${p.x} 0 V 3`, 0.8));
    else if (p.y === 90) g.append(path(`M ${p.x} 87 V 90`, 0.8));
    else g.append(path(`M 42 ${p.y} H 45`, 0.8));
  }
  g.append(rect(0, 3, 42, 84, { fill: "#1d1f22", stroke: "#0a0b0c", "stroke-width": 0.5, rx: 1.4 }));
  g.append(rect(1.4, 4.4, 39.2, 52, { fill: "#16181a", stroke: "#2c2f33", "stroke-width": 0.35, rx: 1.2 }));
  g.append(rect(3, 6, 36, 48.5, { fill: "#101113", stroke: "#000", "stroke-width": 0.35, rx: 1 }));
  // Светодиоды над дисплеем.
  for (const [kind, text, x] of [["mod", "MOD", 9], ["alm", "ALM", 16], ["fwd", "FWD", 23], ["rev", "REV", 30]] as const) {
    g.append(led(kind, x, 8.6), t(text, x, 10.6, 1.15, "#d1d5db"));
  }
  g.append(rect(6.5, 12.4, 23, 8.6, { fill: "#050607", stroke: "#3f444a", "stroke-width": 0.3, rx: 0.5 }));
  const digits = t("", 18, 16.75, 5.4, "#3b0d0d");
  digits.classList.add("vfd2d-digits");
  digits.dataset.decimals = "1";
  digits.setAttribute("font-family", "ui-monospace, Consolas, monospace");
  g.append(digits);
  g.append(led("amp", 32.5, 14), t("A", 34, 14, 1.2, "#d1d5db", "start"));
  g.append(led("hz", 32.5, 19.2), t("Hz", 34, 19.2, 1.2, "#d1d5db", "start"));
  g.append(path("M 35.8 13.6 H 36.6 V 19.6 H 35.8", 0.2, { stroke: "#d1d5db", fill: "none" }), t("V", 37.4, 16.6, 1.1, "#d1d5db", "start"));
  // Кнопки и ручка.
  const knob = group(
    "vfd2d-knob",
    circle(31.5, 26.5, 3.6, { fill: "#0b0c0d", stroke: "#000", "stroke-width": 0.3 }),
    circle(31.5, 26.5, 2.7, { fill: "#24272b", stroke: "#08090a", "stroke-width": 0.3 }),
  );
  const mark = path("M 31.5 26.5 V 24.1", 0.7, { stroke: "#f8fafc" });
  mark.classList.add("vfd2d-knob-mark");
  mark.dataset.cx = "31.5";
  mark.dataset.cy = "26.5";
  knob.append(mark);
  knob.dataset.vfdKey = "knob";
  g.append(
    key2("run", 10.5, 26.5, "#1f9d55", "RUN"), key2("stop", 21, 26.5, "#e0262f", "STOP", "RESET"), knob,
    key2("shift", 10.5, 36, "#5b6168", "SHIFT"), key2("rev", 21, 36, "#5b6168", "REV", "JOG"), key2("enter", 31.5, 36, "#5b6168", "ENTER", "DATA"),
    key2("menu", 10.5, 45.5, "#5b6168", "ESC", "MENU"), key2("up", 21, 45.5, "#5b6168", "▲"), key2("down", 31.5, 45.5, "#5b6168", "▼"),
  );
  // Надпись на корпусе и предупреждение на крышке клемм.
  g.append(t("VFD", 21, 59.5, 3.4, "#f3f4f6"));
  g.append(rect(1.4, 63, 39.2, 21.5, { fill: "#141517", stroke: "#2c2f33", "stroke-width": 0.3, rx: 0.8 }));
  g.append(path("M 6 70.5 L 8.4 66.3 L 10.8 70.5 Z", 0.25, { stroke: "#000", fill: "#f5b301" }), t("!", 8.4, 69.3, 1.8, "#000"));
  g.append(t("WARNING", 12.2, 68.6, 2.3, "#f3f4f6", "start"));
  g.append(t("Do not connect AC power to U V W", 4, 73.2, 1.15, "#d1d5db", "start"));
  g.append(t("Do not open while power is applied", 4, 75.4, 1.15, "#d1d5db", "start"));
  g.append(rect(9, 78.4, 24, 3.4, { fill: "#2a2d31", stroke: "none", rx: 0.4 }), t("1PH 230V~", 21, 80.1, 1.6, "#9ca3af"));
  for (const [k, p] of VFD_2D_1PH_POINTS.entries()) {
    const text = element.terminals[k]?.label ?? VFD_2D_1PH_LABELS[k] ?? "";
    if (p.y === 0) g.append(t(text, p.x, 5.4, 1.8, "#f1f5f9"));
    else if (p.y === 90) g.append(t(text, p.x, 84.8, 1.8, "#f1f5f9"));
    else g.append(t(text, 40.6, p.y, 1.6, "#f1f5f9", "end"));
  }
}
