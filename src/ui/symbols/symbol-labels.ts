import { isMechanism } from "@model/mechanisms";
import type { SchemaElement } from "@model/types";
import { rotateOffset } from "@model/geometry";

import { isStrip } from "./terminal-strips";
import { label } from "./svg-primitives";
import { DETECTOR_NAME_SPOTS, DETECTOR_SIDE_LABELS } from "./detector-layout";
import { AUX_BLOCK_2D, isDelayBlock2d } from "@model/realistic-2d-types";
import { LADDER_EXTRA, PLC_BLOCK } from "@model/plc-blocks";

const LADDER_NAME = { x: 6, y: -5, anchor: "middle" } as const;
const BLOCK_NAME = { x: 7.5, y: -5, anchor: "middle" } as const;

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
  // Фотоэлектрический барьер: имя слева от корпуса, по середине высоты (стрелки справа).
  15000: { x: -4.5, y: 12, anchor: "end" },
  // Детекторы: имя слева над корпусом, как в CADe_SIMU (detector-layout.ts).
  ...DETECTOR_NAME_SPOTS,
  // Символы 2D: имя слева у верхнего края.
  8100: { x: 4.5, y: 1.5, anchor: "end" },
  7018: { x: -1, y: 4.5, anchor: "end" },
  6015: { x: -1, y: 4.5, anchor: "end" },
  6017: { x: -1, y: 9, anchor: "end" }, 60171: { x: -1, y: 9, anchor: "end" }, 60172: { x: -1, y: 9, anchor: "end" },
  6018: { x: -1, y: 9, anchor: "end" }, 60182: { x: -1, y: 9, anchor: "end" },
  6016: { x: -1, y: 4.5, anchor: "end" },
  7019: { x: -1, y: 6.5, anchor: "end" },
  7020: { x: -1, y: 6.5, anchor: "end" }, 7021: { x: -1, y: 6.5, anchor: "end" },
  // LOGO: имя над левым верхним углом; Ladder: операнд по центру над символом.
  10202: { x: 0, y: -2, anchor: "start" }, 10214: { x: 0, y: -2, anchor: "start" },
  10230: { x: 0, y: -2, anchor: "start" },
  8120: { x: -1.5, y: 15, anchor: "end" }, 8121: { x: -1.5, y: 15, anchor: "end" },
  8122: { x: -1.5, y: 15, anchor: "end" }, 8123: { x: -1.5, y: 15, anchor: "end" },
  8124: { x: -1.5, y: 15, anchor: "end" }, 8125: { x: 1, y: 9, anchor: "end" },
  // Блок питания 24 V: имя слева от корпуса, на уровне лицевой панели (сверху и снизу — провода).
  10220: { x: -1.5, y: 50, anchor: "end" },
  // Минутник Alst 8: имя слева от корпуса, у колеса выдержки.
  8110: { x: 0, y: 13.5, anchor: "end" },
  10050: { x: 6, y: -5, anchor: "middle" }, 10051: { x: 6, y: -5, anchor: "middle" },
  10060: { x: 6, y: -5, anchor: "middle" },
  ...Object.fromEntries(LADDER_EXTRA.map((code) => [code, LADDER_NAME])),
  ...Object.fromEntries(Object.values(PLC_BLOCK).map((code) => [code, BLOCK_NAME])),
};

type LabelSpot = readonly [dx: number, dy: number, anchor: "start" | "middle" | "end", size?: number];

/** Дисюнтор 2D: полюса 1 3 5 и вспомогательные 21 22 13 14 стоят через 3 — подписи мельче, полюса над выводом. */
const BREAKER_POLE: LabelSpot = [0.4, -0.9, "start", 1.9];
const BREAKER_AUX: LabelSpot = [0.4, 1.7, "start", 1.9];
/** Те же подписи у нижних выводов: полюса под концом вывода, короткие вспомогательные — справа над концом. */
const BREAKER_BELOW: LabelSpot = [0.4, 2.6, "start", 1.9];
const AUX_BELOW: LabelSpot = [0.4, 2.2, "start", 1.9];

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
  ...DETECTOR_SIDE_LABELS,
  // Контактор 2D A1 A2 1 2 3 4 5 6 13 14 21 22: как у дисюнтора — полюса над / под концами выводов,
  // 13 21 A1 и 14 22 — справа у своих коротких выводов, A2 — под концом вывода, как полюса.
  7018: [BREAKER_AUX, BREAKER_BELOW, BREAKER_POLE, BREAKER_BELOW, BREAKER_POLE, BREAKER_BELOW, BREAKER_POLE,
    BREAKER_BELOW, BREAKER_AUX, AUX_BELOW, BREAKER_AUX, AUX_BELOW],
  // 1 3 5 2 4 6 13 14 21 22: 1 3 5 над концами выводов, 13 14 21 22 — справа у своих коротких выводов.
  6015: [BREAKER_POLE, BREAKER_POLE, BREAKER_POLE, undefined, undefined, undefined,
    BREAKER_AUX, BREAKER_AUX, BREAKER_AUX, BREAKER_AUX],
};

/** Подписи клемм: верхний ряд — под клеммой справа от вывода, нижний — над клеммой. Колодка подписана выше. */
export function drawTerminalLabels(g: SVGGElement, element: SchemaElement, rotation: number): void {
  // Колодки подписаны над клеммами; у земли, батареи и розетки подписей клемм на символе нет.
  if (isStrip(element.typeCode) || [3015, 3019, 3020].includes(element.typeCode)) return;
  // У блоков с выдержкой 2D номера клемм напечатаны на корпусе у винтов (realistic-2d-delay.ts).
  if (isDelayBlock2d(element.typeCode) || element.typeCode === AUX_BLOCK_2D) return;
  // LOGO, DM8, блок питания 24 V и S7-1200 подписывают клеммы сами (logo-symbol.ts, dm8-symbol.ts, din-psu-symbol.ts,
  // s7-1200-symbol.ts).
  if ([10202, 10214, 10220, 10230, 10240, 10241].includes(element.typeCode) || isMechanism(element.typeCode)) return;
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
          size: spot[3] ?? 2.3,
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
