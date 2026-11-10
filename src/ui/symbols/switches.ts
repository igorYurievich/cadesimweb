import type { SchemaElement } from "@model/types";
import { POSITION_SPECS, getBehavior } from "@engine/behaviors";

import { G, ZONE, columns, contactColumn, rowGapOf } from "./contacts";
import { circle, dashed, group, label, path } from "./svg-primitives";
import { ACTUATORS, ActuatorKind, maintainedActuator } from "./actuators";
import { conColumn } from "./auxiliary-contacts";

/** Подписи положений над символом (оранжевые, как в образце) и конец пунктира привода у лопасти. */
const SELECTOR_MARKS: Readonly<Record<number, { text: string; to: number }>> = {
  8020: { text: "I -0 -II", to: 3 },
  8021: { text: "I-II -III", to: 4 },
  8022: { text: "", to: 3 },
};

const POSITION_LABEL_COLOR = "#e08a1e";

/**
 * Conmutador 8020–8022: выводы, ступенчатый привод слева и по группе лопастей на каждую позицию (`.sel-pos-N`).
 * Какая группа видна, решает атрибут data-position символа (CSS), его выставляет app.ts по UserInputs.positions.
 * Пары клемм каждой позиции берутся из таблицы поведения, поэтому символ и расчёт не расходятся.
 */
export function drawSelector(g: SVGGElement, element: SchemaElement, rotation: number): void {
  const spec = POSITION_SPECS[element.typeCode];
  const mark = SELECTOR_MARKS[element.typeCode];
  if (!spec || !mark) return;
  const terms = element.terminals.map((t) => t.offset);
  const bottomXs = terms
    .filter((o) => o.y > 0)
    .map((o) => o.x)
    .sort((a, b) => a - b);
  const ticks = element.typeCode !== 8022;
  const stubs: string[] = [];
  for (const o of terms) {
    if (o.y <= 0) {
      stubs.push(`M ${o.x} 0 V ${G}`);
      continue;
    }
    stubs.push(`M ${o.x} ${ZONE - G} V ${ZONE}`);
    // Контактная «полочка» у нижних клемм: у левой вправо, у остальных влево (как у CON).
    if (ticks) stubs.push(`M ${o.x} ${ZONE - G} H ${o.x + (o.x === bottomXs[0] ? 1.8 : -1.8)}`);
  }
  g.append(path(stubs.join(" ")));
  const links = getBehavior(element.typeCode).links;
  const topX = (terms.find((o) => o.y <= 0) ?? { x: 0 }).x;
  spec.labels.forEach((_, position) => {
    const pos = group(`sel-pos sel-pos-${position}`);
    const here = links.filter((link) => link.position === position);
    // Позиция без замкнутых пар (0 у I-0-II): лопасть стоит вертикально над общим выводом и ничего не касается.
    if (here.length === 0) pos.append(path(`M ${topX} ${G} V ${ZONE - G}`));
    for (const link of here) {
      const a = terms[link.terminals[0] as number];
      const b = terms[link.terminals[1] as number];
      if (a && b) pos.append(path(`M ${a.x} ${G} L ${b.x} ${ZONE - G}`));
    }
    g.append(pos);
  });
  const left = Math.min(...terms.map((o) => o.x));
  g.append(maintainedActuator(left, true, mark.to));
  if (mark.text) {
    const text = label(mark.text, left - 9.5, 1.5, {
      size: 1.9,
      fill: POSITION_LABEL_COLOR,
      upright: rotation,
    });
    text.setAttribute("class", "pos-label");
    g.append(text);
  }
}

/** Круговой индикатор кнопки. */
export function drawIndicator(g: SVGGElement): void {
  g.append(circle(3, 3, 3.3, { fill: "#fff", stroke: "#6b7280", "stroke-width": 0.6 }));
  g.append(circle(3, 3, 2.5, { fill: "#0a8a1c", stroke: "none" }));
}

/** Одиночный контакт панели «Accionamientos» (кнопка, грибок, выключатель с фиксацией, концевик). */
export function drawSingleActuated(
  g: SVGGElement,
  element: SchemaElement,
  nc: boolean,
  actuator: ActuatorKind,
): void {
  const x = columns(element)[0] ?? 0;
  g.append(
    contactColumn(x, rowGapOf(element), {
      nc,
      control: "engine",
      straightOpenNc: nc,
    }),
  );
  g.append(ACTUATORS[actuator](x, nc));
}

/** Парный контакт кнопки. */
export function drawPushPair(g: SVGGElement, element: SchemaElement, actuator: ActuatorKind): void {
  const xs = columns(element);
  const rowGap = rowGapOf(element);
  const nc = xs[0] ?? 0;
  const no = xs[1] ?? nc + 9;
  g.append(
    contactColumn(nc, rowGap, {
      nc: true,
      control: "pressed",
      straightOpenNc: true,
    }),
  );
  g.append(contactColumn(no, rowGap, { control: "pressed" }));
  g.append(dashed(`M ${nc + 1.5} 6 H ${no - 1.5}`, "1.5 1.1"));
  g.append(ACTUATORS[actuator](nc, true));
}

/** Кнопка CON 8003: общий вывод сверху, НЗ и НО снизу, толкатель слева с пунктиром к середине лопасти. */
export function drawPushChangeover(
  g: SVGGElement,
  element: SchemaElement,
  actuator: ActuatorKind = "push",
): void {
  const top = element.terminals[0]?.offset.x ?? 3;
  const nc = element.terminals[1]?.offset.x ?? 0;
  const no = element.terminals[2]?.offset.x ?? 6;
  g.append(conColumn(top, nc, no, "pressed"));
  const left = Math.min(top, nc, no);
  g.append(ACTUATORS[actuator](left, true, (top + nc) / 2));
}
