import type { SchemaElement } from "@model/types";
import { rotateOffset } from "@model/geometry";

import { isStrip } from "./terminal-strips";
import { label } from "./svg-primitives";

/** Место имени (-M, -Fr) у двигателей, у которых оно не слева от окружности. */
export const NAME_SPOTS: Readonly<
  Record<number, { x: number; y: number; anchor: "start" | "middle" | "end" }>
> = {
  1006: { x: 0.2, y: 8, anchor: "start" },
  1007: { x: 0.2, y: 5, anchor: "start" },
  1011: { x: -2, y: 16, anchor: "end" },
  1012: { x: -2, y: 16, anchor: "end" },
  1009: { x: -6.5, y: 7.5, anchor: "end" },
  // Имя силовой электроники стоит слева у верхнего края.
  1050: { x: -4, y: 5.7, anchor: "end" },
  1051: { x: -4, y: 5.7, anchor: "end" },
  1052: { x: -4, y: 5.7, anchor: "end" },
  1053: { x: -4, y: 5.7, anchor: "end" },
  1062: { x: -4, y: 5.7, anchor: "end" },
  1063: { x: -4, y: 5.7, anchor: "end" },
  1054: { x: -4, y: 5.7, anchor: "end" },
  1055: { x: -4, y: 5.7, anchor: "end" },
  1056: { x: -4, y: 5.7, anchor: "end" },
  1057: { x: -4, y: 5.7, anchor: "end" },
  1058: { x: -4, y: 5.7, anchor: "end" },
  1059: { x: -4, y: 5.7, anchor: "end" },
  1060: { x: -4, y: 5.7, anchor: "end" },
  1061: { x: -7, y: 5.7, anchor: "end" },
  1065: { x: -4, y: 5.7, anchor: "end" },
  1066: { x: -4, y: 5.7, anchor: "end" },
  1067: { x: -4, y: 5.7, anchor: "end" },
};

type LabelSpot = readonly [dx: number, dy: number, anchor: "start" | "middle" | "end"];

const LEFT: LabelSpot = [-1, 0, "end"];

const RIGHT: LabelSpot = [1, 0, "start"];

const BELOW: LabelSpot = [0, 1.8, "middle"];

const BELOW_RIGHT: LabelSpot = [1, 1.7, "start"];

/** Метки клемм двигателей с боковыми выводами: по индексам клемм в порядке файла. */
const SIDE_LABELS: Readonly<Record<number, ReadonlyArray<LabelSpot | undefined>>> = {
  1006: [LEFT, RIGHT, BELOW_RIGHT], // A1 A2 PE
  1007: [LEFT, RIGHT, BELOW_RIGHT, LEFT, RIGHT], // A1 A2 PE F1 F2
  1011: [LEFT, BELOW, LEFT, BELOW, LEFT, BELOW], // 1 2 3 4 5 6
  1012: [LEFT, LEFT, BELOW, BELOW], // 1 2 3 4
  1008: [undefined, undefined, undefined, [-1.2, -1.7, "end"]], // U2 слева от вывода: справа стоит конденсатор
  1052: [undefined, undefined, undefined, undefined, undefined, undefined, RIGHT, RIGHT, RIGHT],
  1053: [undefined, undefined, undefined, undefined, undefined, undefined, [-2, -1.8, "start"]],
};

/** Подписи клемм: верхний ряд — под клеммой справа от вывода, нижний — над клеммой. Колодка подписана выше. */
export function drawTerminalLabels(g: SVGGElement, element: SchemaElement, rotation: number): void {
  // Колодки подписаны над клеммами; у земли, батареи и розетки подписей клемм на символе нет.
  if (isStrip(element.typeCode) || [3015, 3019, 3020].includes(element.typeCode)) return;
  if (element.terminals.length === 0) return;
  const minY = Math.min(...element.terminals.map((t) => t.offset.y));
  const sideSpots = SIDE_LABELS[element.typeCode];
  for (const [index, terminal] of element.terminals.entries()) {
    if (!terminal.label) continue;
    const { x, y } = terminal.offset;
    const spot = sideSpots?.[index];
    if (spot) {
      g.append(
        label(terminal.label, x + spot[0], y + spot[1], {
          size: 2.3,
          anchor: spot[2],
          upright: rotation,
        }),
      );
      continue;
    }
    const top = y <= minY;
    if ((element.typeCode === 9008 || element.typeCode === 9009) && rotation !== 0) {
      // Лампа повёрнута: подписи клемм ставим «вверх» в системе листа, а не в системе элемента.
      const k = ((4 - rotation / 90) % 4) as 0 | 1 | 2 | 3;
      // Одинаковый отступ сохраняет метки на одном уровне после поворота лампы.
      const o = rotateOffset({ x: 0, y: -2.1 }, k);
      g.append(
        label(terminal.label, x + o.x, y + o.y, {
          size: 2.3,
          anchor: "middle",
          upright: rotation,
        }),
      );
      continue;
    }
    g.append(
      label(terminal.label, x + 0.9, top ? y + 1.7 : y - 1.7, {
        size: 2.3,
        upright: rotation,
      }),
    );
  }
}
