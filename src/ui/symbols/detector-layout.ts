import { DETECTOR_CODES, EMITTER_TYPE, detectorSpec } from "@model/detector-types";
import { REFLEX_TYPE } from "@model/reflex-sensor";

type Anchor = "start" | "middle" | "end";
type Spot = { x: number; y: number; anchor: Anchor };
type LabelSpot = readonly [dx: number, dy: number, anchor: Anchor];

const ALL = [...DETECTOR_CODES, EMITTER_TYPE, REFLEX_TYPE];

const isSide = (code: number): boolean => detectorSpec(code)?.wiring.endsWith("side") ?? false;
const isReceiver = (code: number): boolean => detectorSpec(code)?.kind === "receiver";

/** Имя «-B» слева над корпусом, как в CADe_SIMU; у приёмника — левее стрелки луча. */
export const DETECTOR_NAME_SPOTS: Readonly<Record<number, Spot>> = Object.fromEntries(ALL.map((code) => {
  const left = (isSide(code) ? -15 : -6) - (isReceiver(code) ? 3 : 0);
  return [code, { x: left - 0.5, y: isSide(code) ? -1 : 1.5, anchor: "end" as const }];
}));

/** Метки клемм боковых вариантов стоят справа от концов выводов, чуть ниже. */
export const DETECTOR_SIDE_LABELS: Readonly<Record<number, ReadonlyArray<LabelSpot>>> = Object.fromEntries(
  ALL.filter(isSide).map((code) => [code, [[1, 1.5, "start"], [1, 1.5, "start"], [1, 1.5, "start"]] as const]),
);

/** Область захвата: корпус и выводы, у приёмника ещё стрелка слева, у излучателя справа. */
export function detectorHitFrame(code: number): { x: number; y: number; w: number; h: number } | undefined {
  if (!ALL.includes(code)) return undefined;
  // Фотодатчик Réflex: корпус 12×12, выводы до y = 18 (reflex-symbol.ts).
  if (code === REFLEX_TYPE) return { x: -7, y: -1, w: 17.5, h: 20 };
  const extraLeft = isReceiver(code) ? 3.5 : 0;
  const extraRight = code === EMITTER_TYPE ? 5 : 0;
  if (isSide(code)) return { x: -16 - extraLeft, y: -1, w: 20 + extraLeft, h: 8 };
  return { x: -7 - extraLeft, y: -1, w: 17.5 + extraLeft + extraRight, h: 14 };
}
