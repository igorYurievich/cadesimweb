import type { SchemaElement } from "@model/types";
import { liftRoleName } from "@model/lift";
import { LIFT_START } from "@engine/lift";

import { circle, group, label, path, rect } from "./svg-primitives";
import {
  CABIN, COUNTERWEIGHT, DOOR, SHEAVE, cabinRopePoint, counterweightRopePoint, floorY, ropePath,
} from "./lift-geometry";

// ── Подвижные части лифта: кабина с дверями, противовес, канаты, человек у входа ───────────────────────
// Нарисованы для кабины на первом этаже; в симуляции их двигает simulation/element-lift.ts:
// .lift-cabin-move и .lift-cw-move — transform, .lift-door-l / -r — сдвиг створок, канаты — атрибут d,
// [data-lift-led] — цвет светодиодов датчиков.

const STEEL = "#c7ced6";
const STEEL_DARK = "#8d96a1";
const STEEL_LIGHT = "#e6ebf0";
const EDGE = "#56606b";
const LED_OFF = "#3b434c";

export const LED_COLORS = { off: LED_OFF, on: "#ff3b30" } as const;

/** Метка встроенного элемента: имя мелким шрифтом на табличке. */
export function tag(value: string, x: number, y: number, anchor: "start" | "middle" | "end" = "start"): SVGElement {
  return label(value, x, y, { size: 2.3, anchor, fill: "#1f2937", halo: true });
}

export const led = (role: string, x: number, y: number): SVGCircleElement =>
  circle(x, y, 0.75, { fill: LED_OFF, stroke: "#11161c", "stroke-width": 0.25, "data-lift-led": role });

/** Корпус кабины с флажком справа для датчиков этажей. */
function cabinBox(): SVGElement[] {
  const top = floorY(0) - CABIN.h;
  const bottom = floorY(0);
  return [
    rect(CABIN.x0, top, CABIN.x1 - CABIN.x0, CABIN.h, { fill: STEEL, stroke: EDGE, "stroke-width": 0.4 }),
    rect(CABIN.x0, top, CABIN.x1 - CABIN.x0, 1.2, { fill: STEEL_LIGHT, stroke: EDGE, "stroke-width": 0.3 }),
    // Флажок на боку кабины: его видят индуктивные датчики этажей на правой стене.
    rect(CABIN.x1, bottom - 11, 1.8, 3, { fill: "#f2c230", stroke: EDGE, "stroke-width": 0.3 }),
    // Порог.
    rect(CABIN.x0 - 0.4, bottom - 0.8, CABIN.x1 - CABIN.x0 + 0.8, 1.2, { fill: STEEL_DARK, stroke: EDGE, "stroke-width": 0.3 }),
  ];
}

/** Проём, створки дверей, привод дверей -M2 с датчиками -B6/-B7 и фотоэлемент -B8 на стойках. */
function cabinDoors(lift: SchemaElement): SVGElement[] {
  const top = floorY(0) - CABIN.h + DOOR.top;
  const bottom = floorY(0) - 0.8;
  const mid = (DOOR.x0 + DOOR.x1) / 2;
  const panel = (x: number, cls: string) => group(cls,
    rect(x, top, mid - DOOR.x0, bottom - top, { fill: "#dde3ea", stroke: EDGE, "stroke-width": 0.35 }),
    path(`M ${x + 0.8} ${top + 1} V ${bottom - 1}`, 0.3, { stroke: "#ffffff", "stroke-opacity": 0.8 }));
  const opTop = floorY(0) - CABIN.h - 2.6;
  return [
    rect(DOOR.x0, top, DOOR.x1 - DOOR.x0, bottom - top, { fill: "#3d4650", stroke: EDGE, "stroke-width": 0.3 }),
    rect(DOOR.x0 + 1, top + 1, DOOR.x1 - DOOR.x0 - 2, bottom - top - 2, { fill: "#f4e7c5", stroke: "none" }),
    path(`M ${DOOR.x0 + 1.5} ${top + 8} H ${DOOR.x1 - 1.5}`, 0.6, { stroke: "#9aa3ad" }),
    panel(DOOR.x0, "lift-door-l"),
    panel(mid, "lift-door-r"),
    // Фотоэлемент: стойки у проёма и луч между ними.
    rect(DOOR.x0 - 1, top, 0.9, bottom - top, { fill: "#2b3138", stroke: "none" }),
    rect(DOOR.x1 + 0.1, top, 0.9, bottom - top, { fill: "#2b3138", stroke: "none" }),
    path(`M ${DOOR.x0} ${bottom - 4} H ${DOOR.x1}`, 0.5,
      { stroke: "#ff3b30", "stroke-dasharray": "0.8 0.8", "stroke-opacity": 0.85, class: "lift-beam" }),
    led("photo", DOOR.x1 + 0.55, bottom - 4),
    tag(liftRoleName(lift, "photo"), CABIN.x0 + 0.6, bottom - 6, "start"),
    // Привод дверей на крыше кабины.
    rect(DOOR.x0 - 1, opTop, DOOR.x1 - DOOR.x0 + 2, 2.6, { fill: "#4b5563", stroke: EDGE, "stroke-width": 0.3 }),
    circle(DOOR.x0 + 1.4, opTop + 1.3, 0.95, { fill: "#94a3b8", stroke: EDGE, "stroke-width": 0.25, class: "lift-door-motor" }),
    led("doorOpen", DOOR.x0 + 4.2, opTop + 1.3),
    led("doorClosed", DOOR.x1 - 0.6, opTop + 1.3),
    tag(liftRoleName(lift, "door"), DOOR.x0 - 1.6, opTop + 1.3, "end"),
    tag(`${liftRoleName(lift, "doorOpen")} / ${liftRoleName(lift, "doorClosed")}`, DOOR.x1 + 1.6, opTop + 1.3, "start"),
  ];
}

/** Противовес у задней стены: рама и пакет грузов. */
function counterweight(): SVGGElement {
  const { x, w, h, top } = COUNTERWEIGHT;
  const plates = Array.from({ length: 5 }, (_, k) =>
    rect(x + 0.6, top + 1.2 + k * 2.9, w - 1.2, 2.3, { fill: "#5b6470", stroke: "#2f363e", "stroke-width": 0.25 }));
  return group("lift-cw-move",
    rect(x, top, w, h, { fill: "#8a939d", stroke: EDGE, "stroke-width": 0.4 }),
    ...plates,
    circle(x + w / 2, top, 0.7, { fill: "#d1d5db", stroke: EDGE, "stroke-width": 0.25 }));
}

/** Канаты от шкива к кабине и к противовесу. */
function ropes(): SVGElement[] {
  const style = { stroke: "#2b2f36", "stroke-width": 0.55 };
  return [
    path(ropePath(SHEAVE.cx - SHEAVE.r, cabinRopePoint(LIFT_START.pos)), 0.55, { ...style, class: "lift-rope-cabin" }),
    path(ropePath(SHEAVE.cx + SHEAVE.r, counterweightRopePoint(LIFT_START.pos)), 0.55, { ...style, class: "lift-rope-cw" }),
  ];
}

/** Человек у входа в кабину (виден, когда его поставили кликом в симуляции). */
function person(): SVGGElement {
  const x = DOOR.x0 + 3;
  const base = floorY(0) - 0.8;
  const body = group("lift-person",
    circle(x, base - 11.5, 1.5, { fill: "#f1c27d", stroke: "#7c5a2c", "stroke-width": 0.3 }),
    rect(x - 1.6, base - 9.8, 3.2, 5.4, { fill: "#2563eb", stroke: "#1e3a8a", "stroke-width": 0.3, rx: 0.8 }),
    path(`M ${x - 0.8} ${base - 4.4} L ${x - 1.1} ${base} M ${x + 0.8} ${base - 4.4} L ${x + 1.1} ${base}`, 0.9,
      { stroke: "#1f2937" }),
    path(`M ${x + 1.5} ${base - 9} L ${x + 4} ${base - 6.5}`, 0.8, { stroke: "#2563eb" }));
  body.setAttribute("visibility", "hidden");
  return body;
}

/** Задний план подвижных частей (противовес и канаты) и кабина поверх них. */
export function drawLiftMovingBack(): SVGElement[] {
  return [counterweight(), ...ropes()];
}

export function drawLiftCabin(lift: SchemaElement): SVGElement[] {
  return [group("lift-cabin-move", ...cabinBox(), ...cabinDoors(lift)), person()];
}
