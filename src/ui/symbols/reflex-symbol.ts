import { INK, group, path, rect, shape } from "./svg-primitives";

// ── Фотоэлектрический датчик Réflex 24 V (только веб, model/reflex-sensor.ts) ──────────────────────────
// Символ по рисунку автора: квадратный корпус 12×12 от (−6, 3), + (0, 0) сверху, − (0, 18) снизу,
// выход S (9, 6) справа от коллектора. Внутри: ромб (рефлекс), светодиод → фототранзистор, контакт НО.
// Внутренности рисуются в системе корпуса (0..12 × 0..12).

const BODY = { x: -6, y: 3, size: 12 } as const;

function filled(points: string): SVGPolygonElement {
  return shape("polygon", { points, fill: INK, stroke: "none" });
}

/** Ромб датчика с двумя чертами внутри: знак отражения от объекта. */
function reflexDiamond(): SVGPathElement {
  return path("M 6 0.7 L 7.7 2.4 L 6 4.1 L 4.3 2.4 Z M 5.3 1.7 V 3.1 M 6.7 1.7 V 3.1");
}

/** Излучатель: светодиод (треугольник с чертой) и две стрелки света к приёмнику. */
function emitterLed(): SVGElement[] {
  return [
    filled("1.1,5.3 3.3,5.3 2.2,7"),
    path("M 1.1 7 H 3.3"),
    path("M 3.9 5.6 H 5.1 M 3.9 6.8 H 5.1"),
    filled("6,5.6 5,5.1 5,6.1"),
    filled("6,6.8 5,6.3 5,7.3"),
  ];
}

/** Приёмник: фототранзистор, коллектор поднимается к выходу S. */
function phototransistor(): SVGElement[] {
  return [
    path("M 7 4.6 V 8.2 M 7 5.5 L 9.4 4.3 V 3 H 12 M 7 7.3 L 9 8.4"),
    filled("9.6,8.8 8.4,8.6 8.9,7.8"),
  ];
}

/** Контакт НО внизу корпуса. Положение переключает CSS по классу is-sim-pressed (как у детекторов). */
function contactNo(): SVGGElement {
  const fixed = path("M 1.5 10.4 H 4.6 M 8.4 10.4 H 10.5");
  const open = group("blade-open", path("M 4.6 10.4 L 8.6 9.1"));
  const closed = group("blade-closed", path("M 4.6 10.4 H 8.4"));
  return group("contact by-pressed", fixed, open, closed);
}

export function drawReflexSensor(g: SVGGElement): void {
  const inner = shape("g", { transform: `translate(${BODY.x} ${BODY.y})` });
  inner.append(
    rect(0, 0, BODY.size, BODY.size, { class: "sensor-body" }),
    reflexDiamond(),
    ...emitterLed(),
    ...phototransistor(),
    contactNo(),
  );
  g.append(path("M 0 0 V 3 M 0 15 V 18 M 6 6 H 9"), inner);
}
