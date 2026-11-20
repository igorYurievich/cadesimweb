import type { SchemaElement } from "@model/types";
import { BLOCK_SPECS, PLC_BLOCK, PLC_TIMER_TYPES } from "@model/plc-blocks";

import { label, path, rect } from "./svg-primitives";

// ── Функциональные блоки Ladder (plc-blocks.ts) ─────────────────────────────
// По скриншоту CADe_SIMU: серый корпус x 3…12, y −3…h−6, входы слева (x 0…3, шаг 6), выход справа на x 15.
// Внутри — подписи входов или значок функции; время таймера / PV счётчика оранжевым слева снизу.
// В симуляции корпус включённого блока зеленеет (is-ladder-on), .plc-readout показывает время или счёт.

const ORANGE = "#c2410c";

/** Значки: вход сверху, выход снизу (таймеры), или волны (мигание, генератор, делитель). */
const ICONS: Readonly<Record<number, string>> = {
  [PLC_BLOCK.ton]: "M 4.5 1.4 H 5.6 V -1.4 H 9.6 V 1.4 H 11 M 4.5 4.8 H 7.4 V 2.2 H 9.6 V 4.8 H 11",
  [PLC_BLOCK.tp]: "M 4.5 1.4 H 5.6 V -1.4 H 9.6 V 1.4 H 11 M 4.5 4.8 H 5.6 V 2.2 H 7.4 V 4.8 H 11",
  [PLC_BLOCK.tof]: "M 4.5 1.4 H 5.6 V -1.4 H 8.2 V 1.4 H 11 M 4.5 4.8 H 5.6 V 2.2 H 10 V 4.8 H 11",
  [PLC_BLOCK.blink]: "M 4.5 3.4 H 5.4 V 0.4 H 6.8 V 3.4 H 8.2 V 0.4 H 9.6 V 3.4 H 11",
  [PLC_BLOCK.pulse]: "M 4.5 3.4 H 5.4 V 0.4 H 6.2 V 3.4 H 8 V 0.4 H 8.8 V 3.4 H 11",
  [PLC_BLOCK.divider]: "M 4.5 1.4 H 5.2 V -1.2 H 6.2 V 1.4 H 7.2 V -1.2 H 8.2 V 1.4 H 9.2 V -1.2 H 10.2 V 1.4 H 11 "
    + "M 4.5 4.8 H 5.2 V 2.4 H 7.2 V 4.8 H 9.2 V 2.4 H 11",
  [PLC_BLOCK.counter]: "M 6.4 1.6 H 7.8 V -1.2 H 10.8",
};

const INPUT_NAMES: Readonly<Record<number, readonly string[]>> = {
  [PLC_BLOCK.bistable]: ["S", "R"],
  [PLC_BLOCK.counter]: ["R"],
  [PLC_BLOCK.updown]: ["CU", "CD", "R", "LD"],
};

type TextOptions = { size?: number; anchor?: "start" | "middle" | "end"; fill?: string };

function parameterText(element: SchemaElement): string | undefined {
  if (element.typeCode === PLC_BLOCK.pulse) return `${element.params.time ?? 1}/${element.params.time2 ?? 1}`;
  if (PLC_TIMER_TYPES.has(element.typeCode)) return String(element.params.time ?? 1);
  if (element.typeCode === PLC_BLOCK.updown || element.typeCode === PLC_BLOCK.counter) {
    return String(element.params.preset ?? 0);
  }
  return undefined;
}

export function drawLadderBlock(g: SVGGElement, element: SchemaElement, rotation: number): void {
  const spec = BLOCK_SPECS[element.typeCode];
  if (!spec) return;
  const bottom = spec.h - 6;
  const text = (value: string, x: number, y: number, opts: TextOptions = {}) => label(value, x, y, {
    size: opts.size ?? 1.6, anchor: opts.anchor ?? "start", fill: opts.fill ?? "#111", upright: rotation,
  });
  const leads = [
    ...Array.from({ length: spec.inputs }, (_, k) => `M 0 ${6 * k} H 3`), `M 12 ${spec.output} H 15`,
  ].join(" ");
  g.append(
    path(leads),
    rect(3, -3, 9, bottom + 3, { class: "ladder-box", fill: "#c4c4c4", stroke: "#111", "stroke-width": 0.5 }),
    ...(INPUT_NAMES[element.typeCode] ?? []).map((name, k) => text(name, 3.6, 6 * k)),
  );
  const icon = ICONS[element.typeCode];
  if (icon) g.append(path(icon, 0.4, { stroke: "#111" }));
  if (element.typeCode === PLC_BLOCK.counter) g.append(text("+ / -", 7.5, 7, { anchor: "middle", size: 1.5 }));
  if (element.typeCode === PLC_BLOCK.updown) {
    g.append(text("PV", 3.6, spec.output), text("Q", 11.4, spec.output, { anchor: "end" }));
  }
  const parameter = parameterText(element);
  if (parameter !== undefined) {
    g.append(text(parameter, 2.6, spec.output + 1.6, { anchor: "end", fill: ORANGE, size: 1.7 }));
  }
  g.append(text("", 7.5, bottom + 1.8, { anchor: "middle", fill: "#15803d", size: 1.7 }));
  g.lastElementChild?.setAttribute("class", "plc-readout");
}
