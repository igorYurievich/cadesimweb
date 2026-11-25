import type { SchemaElement } from "@model/types";
import {
  AUX_BLOCK_2D, BREAKER_2D, CONTACTOR_2D, PILOT_2D, PUSHBUTTON_2D, THERMAL_RELAY_2D,
} from "@model/realistic-2d-types";

import { group, label, path, rect } from "./svg-primitives";
import { screw } from "./realistic-2d";
import { drawPushbuttonColor } from "./realistic-2d-color-button";
import { drawPolesColor } from "./realistic-2d-color-poles";
import { drawPilotColor } from "./realistic-2d-pilot";
import { drawThermalRelayColor } from "./realistic-2d-color-thermal";
import { drawAuxBlockColor } from "./realistic-2d-color-aux";
import { drawSwitchColor } from "./realistic-2d-switch";
import { drawTerminalColor } from "./realistic-2d-terminal";

// ── Цветной вид контактора 7018 и дисюнтора 6015 ────────────────────────────
// По фото аппаратов: тёмные клеммные колодки сверху и снизу, светлый корпус, зелёная полоса.
// Координаты от клеммы 1, как у простого вида (realistic-2d.ts); клеммы те же.
// Состояние показывает флажок в окошке: группы .d2-off / .d2-on (класс is-d2-on — simulation/element-2d.ts).

export const COLOR = {
  body: "#ecebe6", edge: "#8d8c87", dark: "#2e2f31", cover: "#f7f6f2", window: "#b9b8b3",
  strip: "#d9d8d3", green: "#18a957", red: "#d9262c", blue: "#2f6fd6", text: "#222",
} as const;

const TINY = 0.85;

export const box = (x: number, y: number, w: number, h: number, fill: string, extra: Record<string, number> = {}) =>
  rect(x, y, w, h, { fill, stroke: COLOR.edge, "stroke-width": 0.5, ...extra });

export const note = (value: string, x: number, y: number, rotation: number, fill: string = COLOR.text, size = TINY) =>
  label(value, x, y, { size, anchor: "middle", upright: rotation, fill });

/** Тёмная клеммная колодка с винтами силовых клемм и надписями 1L1… или 2T1…. */
function powerBlock(y: number, labels: readonly string[], rotation: number): SVGElement[] {
  return [
    box(-6, y, 24, 4.4, COLOR.dark),
    ...[0, 6, 12].flatMap((x, k) => [
      screw(x, y + 2.2), note(labels[k] ?? "", x - 2.9, y + 2.4, rotation, "#fff", 0.75),
    ]),
  ];
}

function drawContactorColor(g: SVGGElement, rotation: number): void {
  g.append(
    path("M 0 0 V 6 M 6 0 V 6 M 12 0 V 6 M 15 3 V 6 M 3 3 V 6 M 9 3 V 6"),
    path("M 0 39 V 45 M 6 39 V 45 M 12 39 V 45 M 15 39 V 45 M 3 39 V 42 M 9 39 V 42"),
    ...powerBlock(6, ["1L1", "3L2", "5L3"], rotation),
    box(-6, 10.4, 24, 24.2, COLOR.body),
    note("13 NO", 3, 11.5, rotation), note("21 NC", 9, 11.5, rotation), note("A1", 15, 11.5, rotation),
    screw(3, 13.6), screw(9, 13.6), screw(15, 13.6),
    box(-4.5, 16, 21, 13, COLOR.cover, { rx: 0.6 }),
    rect(4, 17.6, 11, 0.8, { fill: COLOR.green, stroke: "none" }),
    box(-1, 20.5, 10, 6, COLOR.window),
    // Флажок в окошке: в покое слева белый, при включённой катушке справа красный.
    group("d2-switch",
      group("d2-off", rect(-0.2, 21.3, 3.6, 4.4, { fill: "#fff", stroke: COLOR.edge, "stroke-width": 0.4 })),
      group("d2-on", rect(4.6, 21.3, 3.6, 4.4, { fill: COLOR.red, stroke: COLOR.edge, "stroke-width": 0.4 }))),
    screw(3, 31.4), screw(9, 31.4), screw(15, 31.4),
    note("14 NO", 3, 33.6, rotation), note("22 NC", 9, 33.6, rotation), note("A2", 15, 33.6, rotation),
    ...powerBlock(34.6, ["2T1", "4T2", "6T3"], rotation),
  );
}

function drawBreakerColor(g: SVGGElement, rotation: number): void {
  g.append(
    path("M 0 0 V 6 M 6 0 V 6 M 12 0 V 6 M -3 3 V 6 M 3 3 V 6 M 9 3 V 6 M 15 3 V 6"),
    path("M 0 45 V 51 M 6 45 V 51 M 12 45 V 51"),
    ...powerBlock(6, ["1L1", "3L2", "5L3"], rotation),
    box(-6, 10.4, 24, 30.2, COLOR.body),
    // Вспомогательные контакты 21-22 НЗ и 13-14 НО на полосе под колодкой.
    box(-6, 10.4, 24, 5, COLOR.strip),
    screw(-4.5, 12.6), screw(-0.5, 12.6), screw(7.5, 12.6), screw(11.5, 12.6),
    note("21  NC  22", -2.5, 14.7, rotation, COLOR.text, 0.7), note("13  NO  14", 9.5, 14.7, rotation, COLOR.text, 0.7),
    // Регулятор тока, красная кнопка STOP и чёрная START.
    box(-5.4, 16.6, 5.4, 11, COLOR.strip),
    rect(-4.4, 18.2, 3.4, 3.4, { fill: "#f4f4f4", stroke: COLOR.edge, "stroke-width": 0.4, rx: 1.7 }),
    path("M -3.6 19.9 H -1.8 M -2.7 19 V 20.8", 0.4, { stroke: COLOR.text }),
    note("0.5-4A", -2.7, 25.4, rotation, COLOR.text, 0.65),
    box(0.8, 16.6, 6.4, 11, COLOR.red, { rx: 0.5 }), note("STOP", 4, 25.6, rotation, "#fff", 0.8),
    box(8.4, 16.6, 6.4, 11, COLOR.dark, { rx: 0.5 }), note("START", 11.6, 25.6, rotation, "#fff", 0.8),
    // Окошко состояния: «O» выключен, «I» на красном — включён.
    box(1, 29.4, 5, 2.8, "#fff"),
    group("d2-switch",
      group("d2-off", note("O", 3.5, 30.9, rotation, COLOR.text, 1.6)),
      group("d2-on", rect(1, 29.4, 5, 2.8, { fill: COLOR.red, stroke: COLOR.edge, "stroke-width": 0.5 }),
        note("I", 3.5, 30.9, rotation, "#fff", 1.6))),
    rect(-4, 34, 20, 0.8, { fill: COLOR.green, stroke: "none" }),
    ...powerBlock(40.6, ["2T1", "4T2", "6T3"], rotation),
  );
}

/** Рисует цветной вид, если он есть у типа; иначе false (рисуется простой вид). */
export function drawColor2d(g: SVGGElement, element: SchemaElement, rotation: number): boolean {
  if (element.typeCode === CONTACTOR_2D) drawContactorColor(g, rotation);
  else if (element.typeCode === BREAKER_2D) drawBreakerColor(g, rotation);
  else if (element.typeCode === PUSHBUTTON_2D) drawPushbuttonColor(g, element);
  else if (element.typeCode === PILOT_2D) drawPilotColor(g, element);
  else if (element.typeCode === THERMAL_RELAY_2D) drawThermalRelayColor(g, element, rotation);
  else if (element.typeCode === AUX_BLOCK_2D) drawAuxBlockColor(g, element, rotation);
  else return drawPolesColor(g, element, rotation) || drawSwitchColor(g, element, rotation)
    || drawTerminalColor(g, element, rotation);
  return true;
}
