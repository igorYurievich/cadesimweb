import type { SchemaElement } from "@model/types";
import { DELAY_BLOCK_2D } from "@model/realistic-2d-types";

import { dashed, group, label, path, rect } from "./svg-primitives";
import { screw } from "./realistic-2d";

// ── Блоки контактов с выдержкой 2D: 7020 ON delay, 7021 OFF delay ───────────
// Рисунок по скриншотам «Contactos on delay y off delay» (simbolos_2d.zip), шаг сетки 3.
// Клеммы 57 (0,0) и 58 (0,27) слева, 65 (18,0) и 66 (18,27) справа; у ON delay 57-58 НЗ и 65-66 НО,
// у OFF delay наоборот. Корпус от x = −3 шириной 24.
// Подвижные части — группы .d2-off/.d2-on (класс is-d2-on ставит simulation/element-2d.ts).

const TINY = 0.95;
const MARK_Y = 13.2;

/** Защёлки DIN-рейки — пять прорезей в верхней и нижней полосе корпуса. */
export function clips(): SVGElement[] {
  return [-3, 2.6, 8.3, 13.9, 19.6].flatMap((x) => [
    rect(x, 0.6, 1.4, 2, { fill: "none" }),
    rect(x, 24.4, 1.4, 2, { fill: "none" }),
  ]);
}

/** Знак выдержки: «)» — на отключение (как в образце), «(» — на включение (как у контактов 7004–7007). */
function delayMark(typeCode: number): SVGElement {
  const off = typeCode === DELAY_BLOCK_2D.OFF;
  return off
    ? path(`M 0.7 11.9 A 1.3 1.3 0 0 1 0.7 14.5`, 0.6)
    : path(`M 2 11.9 A 1.3 1.3 0 0 0 2 14.5 M 0.9 ${MARK_Y} H 2`, 0.6);
}

/**
 * Лопасть контакта в столбце x: покой (off) и срабатывание (on). НО в покое разомкнут, НЗ замкнут на упор.
 * bladeAt — x лопасти на высоте знака выдержки, туда приходит тяга.
 */
function blade(x: number, nc: boolean): { off: string; on: string; offAt: number; onAt: number } {
  return nc
    ? { off: `M ${x} 11.9 H ${x + 1.5} M ${x} 14.85 L ${x + 1.75} 11.9`, on: `M ${x} 14.85 L ${x + 2.15} 10.6`,
      offAt: x + 0.98, onAt: x + 0.83 }
    : { off: `M ${x} 14.85 L ${x - 1.65} 11.5`, on: `M ${x} 14.85 L ${x - 0.15} 11.65`, offAt: x - 0.8, onAt: x - 0.1 };
}

/**
 * Внутренняя схема: контакты 57-58 (слева) и 65-66 (справа) с механической связью и знаком выдержки.
 * У ON delay слева НЗ, справа НО; у OFF delay наоборот.
 */
function inner(typeCode: number): SVGGElement {
  const leftNc = typeCode === DELAY_BLOCK_2D.ON;
  const left = blade(4.75, leftNc);
  const right = blade(13.75, !leftNc);
  return group(
    "d2-inner",
    delayMark(typeCode),
    path("M 4.75 10 V 11.65 M 4.75 14.85 V 16.35 M 13.75 10 V 11.9 M 13.75 14.85 V 16.35", 0.6),
    dashed(`M ${left.offAt + 0.6} ${MARK_Y} H ${right.offAt}`, "1 0.8", 0.5),
    group(
      "d2-switch",
      group("d2-off", path(`${left.off} M 2 ${MARK_Y} H ${left.offAt}`, 0.6), path(right.off, 0.6)),
      group("d2-on", path(`${left.on} M 2 ${MARK_Y} H ${left.onAt}`, 0.6), path(right.on, 0.6)),
    ),
  );
}

export function drawDelayBlock2d(g: SVGGElement, element: SchemaElement, rotation: number): void {
  const terminal = (index: number, fallback: string) => element.terminals[index]?.label ?? fallback;
  const tiny = (value: string, x: number, y: number) =>
    label(value, x, y, { size: TINY, anchor: "middle", upright: rotation });
  const onDelay = element.typeCode === DELAY_BLOCK_2D.ON;
  const leftKind = onDelay ? "NC" : "NO";
  const rightKind = onDelay ? "NO" : "NC";
  g.append(
    rect(-3, 0.6, 24, 25.8, { fill: "#fff" }),
    path("M -3 2.6 H 21 M -3 24.4 H 21", 0.6),
    path("M 0 0 V 0.6 M 18 0 V 0.6 M 0 26.4 V 27 M 18 26.4 V 27"),
    ...clips(),
    screw(0, 6), screw(18, 6), screw(0, 21), screw(18, 21),
    tiny(terminal(0, "57"), -1.6, 3.9), tiny(leftKind, -1.6, 8.8),
    tiny(leftKind, -1.6, 18.5), tiny(terminal(1, "58"), -1.6, 23.2),
    tiny(terminal(2, "65"), 19.6, 3.9), tiny(rightKind, 19.6, 8.8),
    tiny(rightKind, 19.6, 18.5), tiny(terminal(3, "66"), 19.6, 23.2),
    inner(element.typeCode),
  );
  appendDelayReadout(g, rotation);
}

/** Оставшееся время выдержки справа от блока: текст заполняет симуляция (element-2d.ts), в редакторе скрыт (CSS). */
export function appendDelayReadout(g: SVGGElement, rotation: number): void {
  const readout = label("", 22, MARK_Y, { size: 2.4, halo: true, upright: rotation });
  readout.setAttribute("class", "timer-readout");
  g.append(readout);
}
