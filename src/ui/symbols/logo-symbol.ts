import type { SchemaElement } from "@model/types";
import { LOGO_INPUTS, LOGO_OUTPUTS, LOGO_TYPE } from "@model/plc-types";
import { logoModelName, logoSupply, type LogoSupply } from "@model/plc-modules";
import { isSimpleView } from "@model/realistic-2d-types";

import { circle, group, label, path, rect } from "./svg-primitives";
import { logoScreen, type ScreenIo } from "./logo-screen";
import { logoScreenIo } from "./plc-address-registry";

// ── LOGO! 10202, 87×105 ─────────────────────────────────────────────────────
// Цветной вид по фото LOGO! 8 (24RCE): сине-серый корпус (палитра как у DM8), сверху клеммы X10 (P1 P2 I1…I8), слева экран с
// надписями SIEMENS и LOGO!, справа клавиатура, снизу клеммы X11 (выходы Q1…Q4, контакты 1-2).
// Простой вид — прямоугольник с подписями клемм. В симуляции: .logo-led-<операнд> получает is-on,
// а экран, пока модуль запитан, показывает входы, выходы и «RUN» (is-logo-run, element-plc.ts; logo-screen.ts).

const INPUT_X = [24, 30, 36, 42, 54, 60, 66, 72];
const OUTPUT_X = [12, 30, 48, 66];
const EDGE = "#33404a";
/** Палитра как у DM8 и на фото LOGO! 8: сине-серый корпус, светлые надписи и винты. */
const BODY = "#5d6d7a";
const STRIP = "#6a7b88";
const PANEL = "#55646f";
const INK = "#e8edf1";
/** Стрелки клавиш вверх, влево, вправо, вниз. */
const ARROWS = "M 69 38.4 L 67.4 41 H 70.6 Z M 60.4 46.8 L 63 45.2 V 48.4 Z "
  + "M 77.6 46.8 L 75 45.2 V 48.4 Z M 69 55.2 L 67.4 52.6 H 70.6 Z";

const t = (value: string, x: number, y: number, rotation: number, size: number, fill = INK,
  anchor: "start" | "middle" | "end" = "middle") => label(value, x, y, { size, anchor, upright: rotation, fill });

/** Лампочка состояния операнда (подложка под подписью клеммы). */
const led = (name: string, x: number, y: number, w = 3.6, h = 2.4) => rect(x - w / 2, y - h / 2, w, h, {
  class: `logo-led logo-led-${name}`, fill: "#22c55e", "fill-opacity": 0, stroke: "none", rx: 0.5,
});

function screw(x: number, y: number): SVGGElement {
  return group(
    "d2-screw",
    circle(x, y, 1.9, { fill: "#cfd8df", stroke: "#2c3842", "stroke-width": 0.35 }),
    path(`M ${x - 1.2} ${y + 0.6} L ${x + 1.2} ${y - 0.6}`, 0.45, { stroke: "#2c3842" }),
  );
}

function leads(): SVGPathElement {
  const top = [12, 18, ...INPUT_X].map((x) => `M ${x} 0 V 4`);
  const bottom = OUTPUT_X.flatMap((x) => [`M ${x} 98 V 102`, `M ${x + 6} 98 V 102`]);
  return path([...top, ...bottom].join(" "));
}

/** Подписи входов I1…I8 с лампочками состояния. */
const inputLabels = (rotation: number, fill = INK): SVGElement[] =>
  LOGO_INPUTS.flatMap((name, k) => {
    const x = INPUT_X[k] ?? 0;
    return [led(name, x, 7.4), t(name, x, 7.4, rotation, 1.7, fill)];
  });

function terminalRows(rotation: number): SVGElement[] {
  const inputs = inputLabels(rotation);
  const outputs = LOGO_OUTPUTS.flatMap((name, k) => {
    const x = OUTPUT_X[k] ?? 0;
    return [
      screw(x, 90), screw(x + 6, 90), t("1", x - 3, 90.2, rotation, 1.4), t("2", x + 9, 90.2, rotation, 1.4),
      led(name, x + 3, 95.2, 5, 2.6), t(name, x + 3, 95.2, rotation, 1.7),
      path(`M ${x + 1.4} 92.6 L ${x + 3.6} 91.4 M ${x + 3.6} 92.6 H ${x + 4.6}`, 0.35, { stroke: INK }),
    ];
  });
  return [
    t("P1", 12, 7.4, rotation, 1.7), t("P2", 18, 7.4, rotation, 1.7), ...inputs,
    ...[12, 18, ...INPUT_X].map((x) => screw(x, 11.2)), t("X10", 3, 11.3, rotation, 1.3, INK, "start"),
    t("X11", 2, 87.6, rotation, 1.3, INK, "start"), ...outputs,
  ];
}

function display(rotation: number, io: ScreenIo): SVGElement[] {
  return [
    rect(1, 22.5, 49, 49, { fill: "#1b2025", stroke: EDGE, "stroke-width": 0.35 }),
    rect(4, 25, 16, 4.4, { fill: "#d7e6e8", stroke: "none" }),
    t("SIEMENS", 12, 27.3, rotation, 2.2, "#0f8a94"),
    t("LOGO!", 46, 27.3, rotation, 3.2, "#ffffff", "end"),
    rect(5, 32, 40, 30, { fill: "#2b3137", stroke: "#11151a", "stroke-width": 0.4 }),
    // Блик на стекле экрана.
    rect(5.4, 32.4, 39.2, 8, { fill: "#4a535c", "fill-opacity": 0.55, stroke: "none" }),
    rect(5.4, 40.4, 39.2, 3, { fill: "#3a424a", "fill-opacity": 0.5, stroke: "none" }),
    logoScreen(rotation, io),
    t("LAN", 4, 66.5, rotation, 1.6, "#ffffff", "start"),
    rect(4, 68, 2.6, 2, { fill: "#22c55e", stroke: "none" }),
  ];
}

function keypad(rotation: number, supply: LogoSupply): SVGElement[] {
  const key = (x: number, y: number, fill = "#8796a2") =>
    rect(x, y, 6, 5.6, { fill, stroke: "#3a4650", "stroke-width": 0.35, rx: 0.6 });
  return [
    rect(50, 22.5, 36, 49, { fill: STRIP, stroke: EDGE, "stroke-width": 0.35 }),
    rect(55, 24.5, 20, 6, { fill: "#7c8c98", stroke: "#3a4650", "stroke-width": 0.3 }),
    rect(62, 29.4, 6, 0.8, { fill: "#1f2327" }),
    t("X50", 55, 33.4, rotation, 1.2, INK, "start"),
    t(logoModelName(LOGO_TYPE, supply), 85, 34.6, rotation, 1.4, INK, "end"),
    key(66, 37), key(59, 44), key(73, 44), key(66, 51),
    path(ARROWS, 0.3, { fill: "#3a4650", stroke: "none" }),
    key(54, 59), t("ESC", 57, 61.9, rotation, 1.3, "#1f2830"),
    key(76, 59, "#3ddc84"), t("OK", 79, 61.9, rotation, 1.4, "#ffffff"),
    t(ORDER_NUMBER[supply], 85, 69.4, rotation, 1.1, INK, "end"),
  ];
}

function drawLogoColor(g: SVGGElement, rotation: number, io: ScreenIo, supply: LogoSupply): void {
  g.append(
    leads(),
    rect(1, 4, 85, 94, { fill: BODY, stroke: EDGE, "stroke-width": 0.5, rx: 1.5 }),
    rect(1, 4, 85, 11, { fill: STRIP, stroke: EDGE, "stroke-width": 0.35 }),
    rect(1, 15, 85, 7.5, { fill: BODY, stroke: EDGE, "stroke-width": 0.35 }),
    rect(55, 16.6, 26, 4.2, { fill: "none", stroke: INK, "stroke-width": 0.35 }),
    ...display(rotation, io), ...keypad(rotation, supply),
    rect(1, 71.5, 85, 14.5, { fill: PANEL, stroke: EDGE, "stroke-width": 0.35 }),
    t("MAC ADDRESS", 4, 75, rotation, 1.3, INK, "start"),
    rect(19, 74.2, 13, 1.6, { fill: "none", stroke: INK, "stroke-width": 0.25 }),
    t("OUTPUT 4xRELAY/10A", 4, 79, rotation, 1.3, INK, "start"),
    t("X12", 46, 75.6, rotation, 1.2), t("3|4", 46, 77.8, rotation, 1.2),
    circle(54, 74.6, 1.7, { fill: "#cfd8df", stroke: "#2c3842", "stroke-width": 0.3 }),
    path("M 52.4 78.4 H 55.6 M 53 79.2 H 55 M 54 76.6 V 78.4", 0.3, { stroke: INK }),
    t("X1 P1", 70, 75, rotation, 1.2), t("IE(LAN)", 70, 77.2, rotation, 1.2),
    rect(1, 86, 85, 12, { fill: "#4f5d69", stroke: EDGE, "stroke-width": 0.35 }),
    ...terminalRows(rotation),
  );
}

const DARK = "#2b2f33";

/** Заказной номер на корпусе: LOGO! 8 24RCE и 230RCE. */
const ORDER_NUMBER: Readonly<Record<LogoSupply, string>> = { 24: "6ED1052-1HB00-0BA8", 230: "6ED1052-1FB00-0BA8" };

function drawLogoSimple(g: SVGGElement, rotation: number, supply: LogoSupply): void {
  g.append(
    leads(),
    rect(1, 4, 85, 94, { fill: "#fff", stroke: "#4b5563", "stroke-width": 0.6 }),
    path("M 1 15 H 86 M 1 86 H 86", 0.4, { stroke: "#4b5563" }),
    t("LOGO!", 43.5, 50, rotation, 5, "#4b5563"),
    t(logoModelName(LOGO_TYPE, supply), 43.5, 54.4, rotation, 2, "#4b5563"),
    group("logo-run", t("RUN", 43.5, 60, rotation, 2.6, "#16a34a")),
    ...inputLabels(rotation, DARK),
    t("P1", 12, 7.4, rotation, 1.7, DARK), t("P2", 18, 7.4, rotation, 1.7, DARK),
    ...LOGO_OUTPUTS.flatMap((name, k) => {
      const x = OUTPUT_X[k] ?? 0;
      return [
        t("1", x, 94.6, rotation, 1.4, DARK), t("2", x + 6, 94.6, rotation, 1.4, DARK),
        led(name, x + 3, 89.4, 5, 2.6), t(name, x + 3, 89.4, rotation, 1.7, DARK),
      ];
    }),
  );
}

export function drawLogo(g: SVGGElement, element: SchemaElement, rotation: number): void {
  const supply = logoSupply(element);
  if (isSimpleView(element)) drawLogoSimple(g, rotation, supply);
  else drawLogoColor(g, rotation, logoScreenIo(element), supply);
}
