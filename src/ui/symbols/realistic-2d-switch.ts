import type { SchemaElement } from "@model/types";
import { SWITCH_2D_SPECS, isSeccionador2d, switch2dPoleXs } from "@model/switch-2d";
import type { Switch2dSpec } from "@model/switch-2d";

import { circle, dashed, group, label, path, rect, shape } from "./svg-primitives";

// ── Interruptor 6019 / 60191 и Seccionador 6020 / 60201 2D ──────────────────
// Рисунок по скриншоту пользователя из CADe_SIMU 4.2: квадратная панель с поворотной ручкой. Координаты от
// клеммы N (x = 0): верхние клеммы на y = 0, нижние на spec.bottom (switch-2d.ts). Панель нарисована в эталонном
// размере 47 с центром в нуле и масштабируется под вариант. Ручка в OFF лежит горизонтально, в ON повёрнута
// на 90° (группы .d2-off / .d2-on).

const REF = 47;
const HALF = REF / 2;

const text = (value: string, x: number, y: number, rotation: number, fill: string, size: number) =>
  label(value, x, y, { size, anchor: "middle", upright: rotation, fill });

/** Центр панели: посередине между крайними полюсами и между рядами клемм. */
const centerOf = (spec: Switch2dSpec) => ({ cx: ((spec.poles - 1) * spec.pitch) / 2, cy: spec.bottom / 2 });

/** Выводы от краёв панели к клеммам (у маленькой панели края совпадают с клеммами). */
function leads(spec: Switch2dSpec): SVGPathElement {
  const { cy } = centerOf(spec);
  const top = cy - spec.panel / 2;
  const bottom = cy + spec.panel / 2;
  return path(switch2dPoleXs(spec).map((x) => `M ${x} 0 V ${top} M ${x} ${bottom} V ${spec.bottom}`).join(" "));
}

/** Ручка в двух положениях: OFF как нарисована, ON — повёрнута на angle градусов вокруг центра. */
function knobPositions(draw: () => SVGElement[], angle: number): SVGGElement {
  const turned = shape("g", { transform: `rotate(${angle} 0 0)` });
  turned.append(...draw());
  return group("d2-switch", group("d2-off", ...draw()), group("d2-on", turned));
}

/** Нержавеющая панель, чёрный диск, чёрная ручка с красным концом (Interruptor). */
function interruptorPanel(rotation: number): SVGElement[] {
  const handle = (): SVGElement[] => [
    rect(-14.6, -3.4, 30, 6.8, { fill: "#1f2022", stroke: "#000", "stroke-width": 0.4, rx: 3 }),
    rect(-14.6, -3.4, 4.2, 6.8, { fill: "#e3181f", stroke: "none", rx: 1.5 }),
    circle(11, 0, 1.6, { fill: "#b9bcc0", stroke: "#555", "stroke-width": 0.3 }),
  ];
  return [
    rect(-HALF, -HALF, REF, REF, { fill: "#2a2b2d", stroke: "#111", "stroke-width": 0.5, rx: 1.6 }),
    rect(1 - HALF, 1 - HALF, REF - 2, REF - 2, { fill: "#c9cdd1", stroke: "#8d9196", "stroke-width": 0.4, rx: 1 }),
    text("ON", 0, 4 - HALF, rotation, "#111", 2.6),
    text("OFF", 4.6 - HALF, 1.4, rotation, "#111", 2.6),
    circle(0, 0, 12.5, { fill: "#1c1d1f", stroke: "#000", "stroke-width": 0.4 }),
    // Красный конец ручки смотрит на OFF (влево), при включении — на ON (вверх).
    knobPositions(handle, 90),
  ];
}

/** Жёлтая панель, большой красный диск с рычагом (Seccionador, аварийный выключатель). */
function seccionadorPanel(rotation: number): SVGElement[] {
  const handle = (): SVGElement[] => [
    path("M -9 0 L -4 -3.6 H 21 V 3.6 H -4 Z", 0.4, { fill: "#e8231d", stroke: "#8f1210" }),
    circle(1.5, 0, 1.4, { fill: "#b9bcc0", stroke: "#555", "stroke-width": 0.3 }),
  ];
  return [
    rect(-HALF, -HALF, REF, REF, { fill: "#f4e21c", stroke: "#b9a90f", "stroke-width": 0.4, rx: 1.2 }),
    circle(0, 0, 23.2, { fill: "#d8211b", stroke: "#a11612", "stroke-width": 0.5 }),
    circle(0, 0, 19.5, { fill: "#cf1f19", stroke: "#b01a15", "stroke-width": 0.4 }),
    text("I", 0, 7 - HALF, rotation, "#9e1713", 2.4),
    text("ON", 0, 9.6 - HALF, rotation, "#9e1713", 1.6),
    text("0", -13.6, -1.2, rotation, "#5a0b09", 2),
    text("OFF", -13.6, 1.6, rotation, "#5a0b09", 1.4),
    // Длинное плечо рычага в OFF лежит вправо, при включении поднимается к «I ON».
    knobPositions(handle, -90),
  ];
}

/** Цветной вид Interruptor / Seccionador 2D; false — тип не этот. */
export function drawSwitchColor(g: SVGGElement, element: SchemaElement, rotation: number): boolean {
  const spec = SWITCH_2D_SPECS[element.typeCode];
  if (!spec) return false;
  const { cx, cy } = centerOf(spec);
  const panel = shape("g", { transform: `translate(${cx} ${cy}) scale(${spec.panel / REF})` });
  panel.append(...(isSeccionador2d(element.typeCode) ? seccionadorPanel(rotation) : interruptorPanel(rotation)));
  g.append(leads(spec), panel);
  return true;
}

/** Простой вид: рамка, полюса с ножами и механическая связь между ними. */
export function drawSwitchSimple(g: SVGGElement, element: SchemaElement): void {
  const spec = SWITCH_2D_SPECS[element.typeCode];
  if (!spec) return;
  const { cx, cy } = centerOf(spec);
  const xs = switch2dPoleXs(spec);
  const half = spec.panel / 2;
  const open = cy - spec.bottom * 0.2;
  const hinge = cy + spec.bottom * 0.15;
  const lean = Math.min(spec.pitch * 0.45, 4);
  const blades = (on: boolean) =>
    path(xs.map((x) => on ? `M ${x} ${hinge} V ${open}` : `M ${x} ${hinge} L ${x - lean} ${open + 0.5}`).join(" "));
  const link = (on: boolean) => {
    const y = (open + hinge) / 2;
    const shift = on ? 0 : -lean / 2;
    return dashed(`M ${xs[0]! + shift - 1.5} ${y} H ${xs.at(-1)! + shift}`);
  };
  g.append(
    rect(cx - half, cy - half, spec.panel, spec.panel, { fill: "#fff" }),
    path(xs.map((x) => `M ${x} 0 V ${open} M ${x} ${hinge} V ${spec.bottom}`).join(" ")),
    group("d2-switch", group("d2-off", blades(false), link(false)), group("d2-on", blades(true), link(true))),
  );
}
