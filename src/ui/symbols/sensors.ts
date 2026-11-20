import type { SchemaElement } from "@model/types";

import { INK, group, path, rect, shape } from "./svg-primitives";

// ── Фотоэлектрический датчик-барьер ─────────────────────────────────────────
// Клеммы: 1 (0, 0) и 2 (12, 0) сверху, 3 (0, 24), 4 (6, 24), 5 (12, 24) снизу.
// Корпус 18×18 (6×6 клеток сетки) от (−3, 3): выводы выступают за него ровно на одну клетку.

const BODY = { x: -3, y: 3, size: 18 } as const;

/** Переключающий контакт: общий 3 поднимается до оси лопасти, в покое лопасть на НЗ 4, при срабатывании на НО 5. */
function barrierContact(): SVGGElement {
  const fixed = path("M 0 21 V 11 M 6 21 V 18 M 12 21 V 15 H 10.6");
  const rest = group("blade-closed", path("M 0 11 L 6 18"));
  const switched = group("blade-open", path("M 0 11 L 12 15"));
  return group("contact by-aux rest-closed", fixed, rest, switched);
}

function filledTriangle(points: string): SVGPolygonElement {
  return shape("polygon", { points, fill: INK, stroke: "none" });
}

/** Излучатель: светодиод со стрелкой наружу, вправо за корпус. */
function emitter(): SVGGElement {
  return group(
    "barrier-emitter",
    path("M 5 3.8 V 4.6 M 3.5 7 H 6.5 M 5 7 V 8"),
    filledTriangle("3.6,4.6 6.4,4.6 5,7"),
    path("M 7.4 5.4 H 17.6"),
    filledTriangle("18.8,5.4 17.2,4.7 17.2,6.1"),
  );
}

/** Приёмник: фототранзистор, к нему снаружи справа идёт стрелка луча. */
function receiver(): SVGGElement {
  return group(
    "barrier-receiver",
    path("M 9.5 8 V 12 M 9.5 9 L 11.5 8 M 9.5 11 L 11.1 11.8"),
    filledTriangle("11.7,12.1 10.4,12 10.85,11.1"),
    path("M 18.8 10 H 13.6"),
    filledTriangle("12.4,10 13.9,9.3 13.9,10.7"),
  );
}

/** Объект, перекрывший луч: виден в симуляции, пока пользователь держит луч перекрытым. */
function beamObject(): SVGPathElement {
  return path("M 16.4 3.6 V 11.6", 1.8, { class: "beam-object" });
}

export function drawPhotoBarrier(g: SVGGElement, _element: SchemaElement): void {
  g.append(
    rect(BODY.x, BODY.y, BODY.size, BODY.size, { class: "sensor-body" }),
    path("M 0 0 V 3 M 12 0 V 3 M 0 21 V 24 M 6 21 V 24 M 12 21 V 24"),
    barrierContact(),
    emitter(),
    receiver(),
    beamObject(),
  );
}
