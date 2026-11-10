import type { SchemaElement } from "@model/types";

import { INK, circle, dashed, group, label, path, shape } from "./svg-primitives";

// ── Двигатель ───────────────────────────────────────────────────────────────

/**
 * Параметры символов двигателей с окружностью радиуса 9 (панель «Motores»).
 * top: индексы верхних выводов, идущих к окружности; pe: индекс вывода PE; cy: центр окружности по y.
 */
export interface MotorSpec {
  top: readonly number[];
  pe: number;
  cy: number;
  phase: "1" | "3";
  /** Подпись слева сверху: Dah, I-II. */
  tag?: string;
  /** Двойная окружность (ротор с кольцами). */
  wound?: boolean;
  /** Конденсатор: на верхних выводах V1–W1 (1010) или на нижнем выводе U2 (1008). */
  capacitor?: "top" | "bottom";
}

export const MOTOR_R = 9;

export const MOTOR_SPECS: Readonly<Record<number, MotorSpec>> = {
  1000: { top: [0, 1, 2], pe: 3, cy: 12, phase: "3" },
  1001: { top: [0, 1, 2], pe: 3, cy: 12, phase: "3" },
  1002: { top: [0, 1], pe: 2, cy: 12, phase: "1" },
  1008: { top: [0, 1], pe: 2, cy: 13.5, phase: "1", capacitor: "bottom" },
  1010: { top: [0, 1, 2], pe: 3, cy: 15, phase: "3", capacitor: "top" },
  1003: { top: [0, 1, 2], pe: 3, cy: 12, phase: "3", tag: "Dah" },
  1005: { top: [0, 1, 2], pe: 3, cy: 12, phase: "3", tag: "I-II" },
  1004: { top: [0, 1, 2], pe: 3, cy: 12, phase: "3", wound: true },
};

export const inkFill = (d: string): SVGPathElement =>
  shape("path", {
    d,
    fill: INK,
    stroke: INK,
    "stroke-width": 0.3,
    "vector-effect": "non-scaling-stroke",
  });

/** Стрелка вращения двигателя. */
function motorRotor(cx: number, cy: number, s: number): SVGGElement {
  const acy = cy - 0.6 * s;
  const rotor = group("motor-rotor");
  rotor.append(shape("circle", { cx, cy: acy, r: 5.6 * s, fill: "none", stroke: "none" }));
  rotor.append(
    path(
      `M ${cx - 4.8 * s} ${acy - 2.5 * s} A ${5.4 * s} ${5.4 * s} 0 0 1 ${cx + 4.7 * s} ${acy - 2.6 * s}`,
      0.8,
    ),
  );
  rotor.append(
    inkFill(
      `M ${cx + 5.3 * s} ${acy - 1.2 * s} L ${cx + 3.5 * s} ${acy - 3.6 * s} L ${cx + 6.2 * s} ${acy - 3.9 * s} Z`,
    ),
  );
  return rotor;
}

/** Конденсатор на горизонтальном участке между x1 и x2 на высоте y (обкладки вертикальные). */
function capacitorH(x1: number, x2: number, y: number): SVGPathElement {
  const mid = (x1 + x2) / 2;
  return path(
    `M ${x1} ${y} H ${mid - 1} M ${mid - 1} ${y - 1.6} V ${y + 1.6} ` +
      `M ${mid + 1} ${y - 1.6} V ${y + 1.6} M ${mid + 1} ${y} H ${x2}`,
  );
}

export function drawMotor(g: SVGGElement, element: SchemaElement): void {
  const spec = MOTOR_SPECS[element.typeCode] ?? (MOTOR_SPECS[1000] as MotorSpec);
  const at = (index: number): { x: number; y: number } => element.terminals[index]?.offset ?? { x: 0, y: 0 };
  const topXs = spec.top.map((index) => at(index).x);
  const cx = ((topXs[0] ?? 0) + (topXs[topXs.length - 1] ?? 0)) / 2;
  const cy = spec.cy;
  const r = MOTOR_R;
  const rimDy = (x: number): number => Math.sqrt(Math.max(0, r * r - (x - cx) ** 2));
  const body = group("motor-body");
  body.append(circle(cx, cy, r, { "stroke-width": 0.9 }));
  if (spec.wound) body.append(circle(cx, cy, r - 1.8, { "stroke-width": 0.7, fill: "none" }));
  drawMotorUpperLeads(g, spec, at, cy, rimDy);
  drawMotorLowerLeads(g, element, spec, topXs, cy, rimDy);
  const pe = element.terminals[spec.pe]?.offset;
  if (pe) {
    const edge = cx + r;
    g.append(path(`M ${pe.x} 0 V ${cy} H ${edge + 1.5}`));
    appendMotorEarthMark(body, edge, cy);
  }
  appendMotorFace(body, spec, cx, cy);
  g.append(body);
}

function drawMotorUpperLeads(
  g: SVGGElement,
  spec: MotorSpec,
  at: (index: number) => { x: number; y: number },
  cy: number,
  rimDy: (x: number) => number,
): void {
  for (const index of spec.top) {
    const x = at(index).x;
    g.append(path(`M ${x} 0 V ${cy - rimDy(x)}`));
  }
  if (spec.capacitor === "top") {
    const [, v1, w1] = spec.top.map((index) => at(index).x);
    if (v1 !== undefined && w1 !== undefined) g.append(capacitorH(v1, w1, 4.8));
  }
}

function drawMotorLowerLeads(
  g: SVGGElement,
  element: SchemaElement,
  spec: MotorSpec,
  topXs: number[],
  cy: number,
  rimDy: (x: number) => number,
): void {
  element.terminals.forEach((terminal, index) => {
    if (spec.top.includes(index) || index === spec.pe || terminal.offset.y <= 0) return;
    const x = terminal.offset.x;
    const rim = cy + rimDy(x);
    if (spec.capacitor === "bottom" && x === topXs[0]) {
      const y = terminal.offset.y;
      const plates = (rim + y) / 2;
      g.append(
        path(
          `M ${x} ${y} V ${plates + 1} M ${x - 2.4} ${plates + 1} H ${x + 2.4} ` +
            `M ${x - 2.4} ${plates - 1} H ${x + 2.4} M ${x} ${plates - 1} V ${rim}`,
        ),
      );
    } else {
      g.append(path(`M ${x} ${terminal.offset.y} V ${rim}`));
    }
  });
}

function appendMotorEarthMark(body: SVGGElement, edge: number, cy: number): void {
  body.append(path(`M ${edge + 0.5} ${cy - 2.4} Q ${edge + 1.9} ${cy} ${edge + 0.5} ${cy + 2.4}`, 0.8));
  body.append(path(`M ${edge + 1.4} ${cy - 1.8} Q ${edge + 2.4} ${cy} ${edge + 1.4} ${cy + 1.8}`, 0.5));
}

function appendMotorFace(body: SVGGElement, spec: MotorSpec, cx: number, cy: number): void {
  body.append(motorRotor(cx, cy, 1));
  body.append(label("M", cx, cy - 2.4, { size: 3.8, anchor: "middle", fill: "#222" }));
  body.append(
    label(spec.phase, cx - 3.4, cy + 2, {
      size: 3.4,
      anchor: "middle",
      fill: "#222",
    }),
  );
  body.append(path(`M ${cx + 1.4} ${cy + 2.3} q 0.9 -1.7 1.8 0 t 1.8 0`, 0.7));
  if (spec.tag) {
    body.append(label(spec.tag, -9, 1.5, { size: 2.7, anchor: "middle", fill: "#222" }));
  }
}

export function drawDcMotor(g: SVGGElement, element: SchemaElement): void {
  const independent = element.typeCode === 1007;
  const cx = 9;
  const cy = independent ? -3 : 0;
  const r = 6;
  const body = group("motor-body");
  body.append(circle(cx, cy, r, { "stroke-width": 0.9 }));
  // Якорь: выводы A1 и A2 к щёткам (чёрные прямоугольники по бокам окружности).
  g.append(path(`M 0 ${cy} H 1.4 M ${cx + r + 1.6} ${cy} H 18`));
  for (const x of [cx - r - 1.6, cx + r]) {
    body.append(
      shape("rect", {
        x,
        y: cy - 1.7,
        width: 1.6,
        height: 3.4,
        fill: INK,
        stroke: INK,
        "stroke-width": 0.3,
        "vector-effect": "non-scaling-stroke",
      }),
    );
  }
  body.append(motorRotor(cx, cy - 0.4, r / MOTOR_R));
  body.append(label("M", cx, cy - 1.6, { size: 3.4, anchor: "middle", fill: "#222" }));
  // Знак постоянного тока: сплошная и пунктирная линии.
  body.append(path(`M ${cx - 2.4} ${cy + 1.5} H ${cx + 2.4}`, 0.7));
  body.append(dashed(`M ${cx - 2.4} ${cy + 2.7} H ${cx + 2.4}`, "1 0.8", 0.6));
  appendDcExcitation(g, body, independent, cx, cy);
  g.append(body);
}

function appendDcExcitation(
  g: SVGGElement,
  body: SVGGElement,
  independent: boolean,
  cx: number,
  cy: number,
): void {
  if (independent) {
    g.append(path(`M 0 -12 H 5 M 13 -12 H 18`));
    body.append(
      shape("rect", {
        x: 5,
        y: -12.8,
        width: 8,
        height: 1.6,
        fill: INK,
        stroke: INK,
        "stroke-width": 0.3,
        "vector-effect": "non-scaling-stroke",
      }),
    );
    return;
  }
  g.append(path(`M ${cx - 3.2} ${cy - 8.4} V ${cy - 5.1} M ${cx + 3.2} ${cy - 8.4} V ${cy - 5.1}`));
  body.append(
    shape("rect", {
      x: cx - 3.8,
      y: cy - 10,
      width: 7.6,
      height: 1.6,
      fill: INK,
      stroke: INK,
      "stroke-width": 0.3,
      "vector-effect": "non-scaling-stroke",
    }),
  );
}

/** Шаговые двигатели 1011 и 1012. */
export function drawStepper(g: SVGGElement, element: SchemaElement): void {
  const unipolar = element.typeCode === 1011;
  const cx = 9;
  const cy = 3;
  const r = 5;
  const body = group("motor-body");
  body.append(circle(cx, cy, r, { "stroke-width": 0.9 }));
  // Левая обмотка: выводы слева (x = −3) и четыре витка радиуса 1,5 вдоль x = 0; у униполярного вывод 5 посередине.
  g.append(path(`M -3 0 H 0 M -3 12 H 0${unipolar ? " M -3 6 H 0" : ""}`));
  g.append(path(`M 0 0${" a 1.5 1.5 0 0 1 0 3".repeat(4)}`));
  // Нижняя обмотка: четыре витка по y = 15 (вывод 6 посередине у униполярного).
  g.append(path(`M 0 15${" a 1.5 1.5 0 0 1 3 0".repeat(4)}`));
  body.append(motorRotor(cx, cy, r / MOTOR_R));
  body.append(label("M", cx, cy - 1.2, { size: 3, anchor: "middle", fill: "#222" }));
  body.append(
    path(`M ${cx - 2.8} ${cy + 3} H ${cx - 1.2} V ${cy + 1.4} H ${cx + 1.2} V ${cy + 3} H ${cx + 2.8}`, 0.6),
  );
  g.append(body);
}

/** Тормоз 1009: три вывода и трапеция. Только символ. */
export function drawBrake(g: SVGGElement, element: SchemaElement): void {
  for (const terminal of element.terminals) g.append(path(`M ${terminal.offset.x} 0 V 3`));
  g.append(path("M -2 3 H 14 L 17.5 9 H -5.5 Z", 0.9, { fill: "#fff" }));
}
