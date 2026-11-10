import type { SchemaElement } from "@model/types";

import { circle, dashed, group, path } from "./svg-primitives";
import { Control, G, ZONE, columns, contactColumn, rowGapOf } from "./contacts";

// ── Вспомогательные контакты 7000–7015 ──────────────────────────────────────

type AuxTiming = "instant" | "on" | "off" | "onoff";

type AuxShape = "no" | "nc" | "nono" | "con";

/** Код типа = 7000 + 4·(вид выдержки) + вид контакта: NA, NC, NA+NC, CON (порядок кнопок панели). */
function auxKind(typeCode: number): { timing: AuxTiming; shape: AuxShape } {
  const index = typeCode - 7000;
  const timings: readonly AuxTiming[] = ["instant", "on", "off", "onoff"];
  const shapes: readonly AuxShape[] = ["no", "nc", "nono", "con"];
  return {
    timing: timings[Math.floor(index / 4)] ?? "instant",
    shape: shapes[index % 4] ?? "no",
  };
}

/**
 * Знак выдержки и точку начала пунктира.
 */
function delayMark(timing: AuxTiming, cx: number): { mark: SVGGElement; right: number } {
  if (timing === "on") {
    return {
      mark: group(
        "delay-mark",
        path(`M ${cx} 3.8 A 2.4 2.4 0 0 0 ${cx} 8.2`, 0.8),
        path(`M ${cx - 1.9} 6 H ${cx + 2}`, 0.8),
      ),
      right: cx + 2,
    };
  }
  if (timing === "off") {
    return {
      mark: group(
        "delay-mark",
        path(`M ${cx} 3.8 A 2.4 2.4 0 0 1 ${cx} 8.2`, 0.8),
        path(`M ${cx - 2.4} 6 H ${cx + 1.4}`, 0.8),
      ),
      right: cx + 1.5,
    };
  }
  return {
    mark: group(
      "delay-mark",
      circle(cx, 6, 2.6, { "stroke-width": 0.8 }),
      path(`M ${cx - 1.9} 6 H ${cx + 1.9}`, 0.8),
    ),
    right: cx + 2.6,
  };
}

/** Переключающий контакт CON. */
export function conColumn(topX: number, ncX: number, noX: number, control: Control = "aux"): SVGGElement {
  const stubs = path(
    `M ${topX} 0 V ${G} M ${ncX} ${ZONE - G} V ${ZONE} ` +
      `M ${noX} ${ZONE - G} V ${ZONE} M ${noX} ${ZONE - G} H ${noX - 1.8}`,
  );
  const rest = group("blade-closed", path(`M ${topX} ${G} L ${ncX} ${ZONE - G}`));
  const switched = group("blade-open", path(`M ${topX} ${G} L ${noX} ${ZONE - G}`));
  return group(`contact by-${control} rest-closed`, stubs, rest, switched);
}

export function drawAuxContact(g: SVGGElement, element: SchemaElement): void {
  const { timing, shape: kind } = auxKind(element.typeCode);
  const xs = columns(element);
  const rowGap = rowGapOf(element);
  // Левый край символа и x, до которого идёт пунктир к лопасти (середина последней лопасти).
  let left = xs[0] ?? 0;
  let linkTo = left;
  if (kind === "con") {
    const top = element.terminals[0]?.offset.x ?? 3;
    const nc = element.terminals[1]?.offset.x ?? 0;
    const no = element.terminals[2]?.offset.x ?? 6;
    g.append(conColumn(top, nc, no));
    left = Math.min(top, nc, no);
    linkTo = top;
  } else if (kind === "nono") {
    const nc = xs[0] ?? 0;
    const no = xs[1] ?? nc + 9;
    g.append(
      contactColumn(nc, rowGap, {
        nc: true,
        control: "aux",
        straightOpenNc: true,
      }),
    );
    g.append(contactColumn(no, rowGap, { control: "aux" }));
    left = nc;
    linkTo = no - 1.5;
  } else {
    const x = xs[0] ?? 0;
    g.append(
      contactColumn(x, rowGap, {
        nc: kind === "nc",
        control: "aux",
        straightOpenNc: kind === "nc",
      }),
    );
    linkTo = kind === "nc" ? x + 1.5 : x - 1.5;
  }
  if (timing === "instant") return;
  // Подпись имени заканчивается на x = −8,5 (смещение −15 из образца), знак выдержки стоит правее, ближе к лопасти.
  const { mark, right } = delayMark(timing, left - 5.5);
  g.append(mark);
  g.append(dashed(`M ${right + 0.3} 6 H ${linkTo}`, "1.2 0.9"));
}
