import type { SchemaElement } from "@model/types";
import { EMITTER_TYPE, detectorSpec } from "@model/detector-types";
import type { DetectorKind, DetectorWiring } from "@model/detector-types";

import { INK, group, label, path, rect, shape } from "./svg-primitives";

// ── Детекторы панели «Detectores» ───────────────────────────────────────────
// Геометрия снята со скриншота CADe_SIMU (образец detectores.cad): корпус 12×6 (4×2 клетки).
// Сверху/снизу: корпус от (−6, 3), выводы + (0, 0), − (0, 12), S (9, 6).
// Сбоку: корпус от (−15, 0), выводы справа на x = 3: + (y 0), S (y 3), − (y 6).
// Внутренности рисуются в системе корпуса (0..12 × 0..6).

const BODY_W = 12;
const BODY_H = 6;

function bodyOrigin(wiring: DetectorWiring): { x: number; y: number } {
  return wiring.endsWith("side") ? { x: -15, y: 0 } : { x: -6, y: 3 };
}

function filled(points: string): SVGPolygonElement {
  return shape("polygon", { points, fill: INK, stroke: "none" });
}

/** Выводы: сверху/снизу прямые, сбоку — отводы под углом к правому краю корпуса. */
function leads(wiring: DetectorWiring): SVGPathElement {
  const threeWire = wiring === "3" || wiring === "3-side";
  if (wiring.endsWith("side")) {
    return path(`M -3 1.5 L 0 0 H 3 M -3 4.5 L 0 6 H 3${threeWire ? " M -3 3 H 3" : ""}`);
  }
  return path(`M 0 0 V 3 M 0 9 V 12${threeWire ? " M 6 6 H 9" : ""}`);
}

/** Значок контакта: разомкнут «\ '», замкнут «7». Положение переключает CSS по классу is-sim-pressed. */
function contactMark(nc: boolean): SVGGElement {
  const open = group("blade-open", path("M 10.2 1.1 V 2 M 8.9 2 L 10 3.9 V 4.9"));
  const closed = group("blade-closed", path("M 10 1 V 1.9 H 11.2 M 11.1 1.6 L 10 3.8 V 4.9"));
  return group(`contact by-pressed${nc ? " rest-closed" : ""}`, open, closed);
}

function principleMark(kind: Exclude<DetectorKind, "receiver">): SVGElement {
  if (kind === "inductive") return group("principle", path("M 2 1 V 4.9"), rect(1.35, 2, 1.3, 2.1, { fill: INK }));
  if (kind === "capacitive") return path("M 2 1 V 2.55 M 1.1 2.55 H 2.9 M 1.1 3.45 H 2.9 M 2 3.45 V 5");
  return filled("1.3,2.2 2.7,2.2 2.7,3.9 1.3,3.9 1.3,3.35 2,3.35 2,2.75 1.3,2.75");
}

/** Ромб датчика с двумя чертами внутри. */
function sensorDiamond(): SVGPathElement {
  return path("M 6 1 L 8.1 3.1 L 6 5.2 L 3.9 3.1 Z M 5.05 1.95 V 4.25 M 6.95 1.95 V 4.25");
}

/** Приёмник барьера: луч приходит слева, фототранзистор и буква R. */
function receiverMarks(rotation: number): SVGElement[] {
  return [
    path("M -3 3.1 H -1.4"),
    filled("-0.3,3.1 -1.6,2.5 -1.6,3.7"),
    path("M 1.3 1.2 V 4.8 M 1.3 2.6 L 2.6 1.3 M 1.3 3.4 L 2.3 4.4"),
    filled("2.8,4.9 1.9,4.6 2.5,4"),
    label("R", 6, 3.1, { size: 2.2, anchor: "middle", upright: rotation }),
  ];
}

/** Излучатель барьера: буква E, светодиод и луч наружу вправо. */
function emitterMarks(rotation: number): SVGElement[] {
  return [
    label("E", 3.3, 3.1, { size: 2.2, anchor: "middle", upright: rotation }),
    path("M 8.5 1 V 2 M 7.7 3.6 H 9.3 M 8.5 3.6 V 5"),
    filled("7.7,2 9.3,2 8.5,3.6"),
    path("M 12.6 3.1 H 14.2"),
    filled("15.4,3.1 14,2.5 14,3.7"),
  ];
}

export function drawDetector(g: SVGGElement, element: SchemaElement, rotation: number): void {
  const spec = detectorSpec(element.typeCode);
  const wiring = spec?.wiring ?? "2";
  const origin = bodyOrigin(wiring);
  const inner = shape("g", { transform: `translate(${origin.x} ${origin.y})` });
  inner.append(rect(0, 0, BODY_W, BODY_H, { class: "sensor-body" }));
  if (element.typeCode === EMITTER_TYPE || !spec) inner.append(...emitterMarks(rotation));
  else if (spec.kind === "receiver") inner.append(...receiverMarks(rotation), contactMark(spec.nc));
  else inner.append(principleMark(spec.kind), sensorDiamond(), contactMark(spec.nc));
  g.append(leads(wiring), inner);
}
