import type { SchemaElement } from "@model/types";
import type { MotorSpec } from "./motors";
import { MOTOR_R } from "./motors";
import { shape } from "./svg-primitives";

interface HitFrame {
  x: number;
  y: number;
  w: number;
  h: number;
}

const FRAME_HIT: Readonly<Record<number, HitFrame>> = {
  2009: { x: 0, y: -2, w: 24, h: 7 },
  3015: { x: -2, y: -1, w: 10, h: 11 },
  3020: { x: -1, y: 1, w: 11, h: 15 },
  8023: { x: -0.5, y: -0.5, w: 7, h: 7 },
  1006: { x: -1, y: -11, w: 20, h: 18.5 },
  1007: { x: -1, y: -13.5, w: 20, h: 18.5 },
  1011: { x: -6, y: -1, w: 22, h: 19 },
  1012: { x: -6, y: -1, w: 22, h: 19 },
  1009: { x: -7, y: -1, w: 26, h: 12 },
  9003: { x: -5, y: -1, w: 16, h: 14 },
  9009: { x: -4, y: -1, w: 14, h: 14 },
  9010: { x: -2, y: -1, w: 11, h: 14 },
  9011: { x: -2, y: -1, w: 10, h: 14 },
  9012: { x: -2, y: -1, w: 12, h: 14 },
  9013: { x: -3, y: -1, w: 13, h: 14 },
};

function hitRect(frame: HitFrame): SVGRectElement {
  return shape("rect", {
    class: "hit-area",
    x: frame.x,
    y: frame.y,
    width: frame.w,
    height: frame.h,
    fill: "#000",
    "fill-opacity": 0,
    stroke: "none",
  });
}

function defaultHitRect(canonical: SchemaElement, motorSpec?: MotorSpec): SVGRectElement {
  const xs = canonical.terminals.map((terminal) => terminal.offset.x);
  const ys = canonical.terminals.map((terminal) => terminal.offset.y);
  const left = Math.min(0, ...xs) - 3;
  const right = Math.max(0, ...xs) + 4;
  const bottom = motorSpec ? Math.max(0, ...ys, motorSpec.cy + MOTOR_R + 1) : Math.max(0, ...ys);
  return hitRect({ x: left, y: -1, w: right - left, h: bottom + 2 });
}

function frameHit(element: SchemaElement): HitFrame | undefined {
  if (element.typeCode === 8) {
    return {
      x: 0,
      y: -element.size.h,
      w: Math.max(element.size.w, 3),
      h: Math.max(element.size.h, 3),
    };
  }
  return FRAME_HIT[element.typeCode];
}

function appendActuatorHitAreas(root: SVGGElement, element: SchemaElement, canonical: SchemaElement): void {
  const terminalsX = canonical.terminals.map((terminal) => terminal.offset.x);
  if ([2003, 2004, 2005, 2007].includes(element.typeCode)) {
    const left = Math.min(...terminalsX, 0);
    root.append(hitRect({ x: left - 10, y: 2, w: 10, h: 8 }));
  }
  const actuatorTypes = [
    8000, 8001, 8002, 8003, 8004, 8005, 8006, 8007, 8008, 8009, 8010, 8011, 8012, 8013, 8014, 8015, 8020,
    8021, 8022,
  ];
  if (actuatorTypes.includes(element.typeCode)) {
    const left = Math.min(...terminalsX, 0);
    root.append(hitRect({ x: left - 9, y: 1, w: 9, h: 10 }));
  }
}

export function appendHitAreas(
  root: SVGGElement,
  element: SchemaElement,
  canonical: SchemaElement,
  motorSpec?: MotorSpec,
): void {
  const frame = frameHit(element);
  root.append(frame ? hitRect(frame) : defaultHitRect(canonical, motorSpec));
  appendActuatorHitAreas(root, element, canonical);
}
