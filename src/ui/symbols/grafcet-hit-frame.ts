import type { SchemaElement } from "@model/types";
import { BAR_PITCH, GRAFCET, isGrafcetBar, isGrafcetStep } from "@model/grafcet";

// Область захвата GRAFCET лежит отдельно от рисунка (grafcet-symbol.ts): она нужна сразу,
// а сами символы GRAFCET — отдельный кусок сборки (features/grafcet-feature.ts).

/** Правый конец черты синхронизации: по числу выводов или по ширине. */
export const barEnd = (element: SchemaElement): number =>
  Math.max(0, (element.terminals.length || Math.round(element.size.w / BAR_PITCH)) - 1) * BAR_PITCH;

/** Область захвата: рамка символа (у черты — полоса по её длине). */
export function grafcetHitFrame(element: SchemaElement): { x: number; y: number; w: number; h: number } | undefined {
  if (isGrafcetStep(element.typeCode)) return { x: 0, y: 0, w: 12, h: 12 };
  if (element.typeCode === GRAFCET.transition) {
    return { x: 0, y: -0.5, w: 6 + Math.min(20, element.name.length * 1.7), h: 7 };
  }
  if (element.typeCode === GRAFCET.action) return { x: 0, y: 0, w: 24, h: 6 };
  if (isGrafcetBar(element.typeCode)) return { x: -2, y: -2, w: barEnd(element) + 4, h: 4 };
  if (element.typeCode === GRAFCET.link) return { x: -1.5, y: 0, w: 3, h: 12 };
  if (element.typeCode === GRAFCET.table) return { x: 0, y: 0, w: element.size.w, h: element.size.h };
  return undefined;
}
