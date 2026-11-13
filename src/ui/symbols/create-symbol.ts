import type { SchemaElement } from "@model/types";
import { getCadType } from "@model/cad-types";
import { buildTerminals, unrotatedSize } from "@model/geometry";
import { POSITION_SPECS, currentPosition } from "@engine/behaviors";

import { NAME_COLOR, label, shape } from "./svg-primitives";
import { MOTOR_SPECS } from "./motors";
import { appendHitAreas } from "./symbol-hit-area";
import { drawBody } from "./body";
import { NAME_SPOTS, drawTerminalLabels } from "./symbol-labels";
import { rowGapOf } from "./contacts";

/** Создаёт символ элемента в стиле CADe_SIMU: тело, подписи клемм и имя. */
export function createElementSymbol(element: SchemaElement): SVGGElement | null {
  if (element.typeCode === 20000 || getCadType(element.typeCode).family === "system") return null;
  const info = getCadType(element.typeCode);
  const canonical = canonicalElement(element, info);
  const root = shape("g", {
    class: "schematic-element",
    "data-element-id": element.id,
    "data-type-code": element.typeCode,
    "aria-label": `${element.name || info.label} — ${info.label}`,
  });
  const rotation = element.rotation * 90;
  // Многопозиционный переключатель: до расчёта симуляции показываем позицию покоя.
  if (POSITION_SPECS[element.typeCode])
    root.setAttribute("data-position", String(currentPosition(element.typeCode, undefined)));
  root.setAttribute(
    "transform",
    `translate(${element.position.x} ${element.position.y}) rotate(${rotation})`,
  );
  // Невидимая область захвата: без неё элемент из тонких линий трудно выделить и нажать.
  const motorSpec = MOTOR_SPECS[element.typeCode];
  appendHitAreas(root, element, canonical, motorSpec);
  const body = shape("g", { class: "symbol-body" });
  drawBody(body, canonical, rotation);
  root.append(body);
  drawTerminalLabels(root, canonical, rotation);
  appendName(root, element, canonical, rotation, motorSpec);
  return root;
}

function canonicalElement(element: SchemaElement, info: ReturnType<typeof getCadType>): SchemaElement {
  const size = unrotatedSize(element.size, element.rotation);
  return {
    ...element,
    size,
    terminals: buildTerminals(
      info,
      element.terminals.length,
      size,
      0,
      element.terminals.map((terminal) => terminal.label),
    ),
  };
}

function appendName(
  root: SVGGElement,
  element: SchemaElement,
  canonical: SchemaElement,
  rotation: number,
  motorSpec: (typeof MOTOR_SPECS)[number] | undefined,
): void {
  if (element.name && element.typeCode !== 2009) {
    const rowGap = rowGapOf(canonical);
    const mid = motorSpec ? motorSpec.cy : rowGap > 0 ? rowGap / 2 : element.size.h / 2;
    const x = element.labelOffset.x + 6.5;
    const family = getCadType(element.typeCode).family;
    const named = NAME_SPOTS[element.typeCode]
      ?? (
        family === "pushbutton"
        || family === "coil"
        || family === "relay-coil"
        || family === "lamp"
        || family === "thermal-contact"
          ? {
              x: family === "pushbutton" || family === "thermal-contact" ? -8 : -6.5,
              y: mid,
              anchor: "end" as const,
            }
          : undefined
      );
    if (rotation === 0) {
      root.append(
        named
          ? label(element.name, named.x, named.y, {
              size: 2.7,
              anchor: named.anchor,
              halo: true,
              fill: NAME_COLOR,
            })
          : label(element.name, x, mid, {
              size: 2.7,
              anchor: "end",
              halo: true,
              fill: NAME_COLOR,
            }),
      );
    } else {
      // Подпись повёрнутых элементов остаётся читаемой: рисуется в неповёрнутой системе координат.
      const wrapper = shape("g", { transform: `rotate(${-rotation})` });
      wrapper.append(
        label(element.name, named?.x ?? element.labelOffset.x + 3, named?.y ?? element.labelOffset.y + 3, {
          size: 2.7,
          anchor: named?.anchor,
          halo: true,
          fill: NAME_COLOR,
        }),
      );
      root.append(wrapper);
    }
  }
}
