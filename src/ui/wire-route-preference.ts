import { CAD_GRID_STEP } from './constants';
import type { Point } from './viewport';

export interface WireRoutePreference {
  verticalFirst: () => boolean;
  bundleFlipped: () => boolean;
  reset: () => void;
  clearDecision: () => void;
  toggleCorner: () => void;
  flipBundle: () => void;
  observePointer: (point: Point | undefined, wireDrawing: boolean, draftPoints: readonly Point[]) => void;
}

export function createWireRoutePreference(): WireRoutePreference {
  let verticalFirst = false;
  let preferenceChosen = false;
  let bundleFlipped = false;

  const observePointer = (
    point: Point | undefined,
    wireDrawing: boolean,
    draftPoints: readonly Point[],
  ): void => {
    if (point === undefined) {
      preferenceChosen = false;
      return;
    }
    if (!wireDrawing || preferenceChosen) return;
    const anchor = draftPoints[draftPoints.length - 1];
    if (!anchor) return;
    const dx = Math.abs(point.x - anchor.x);
    const dy = Math.abs(point.y - anchor.y);
    if (Math.max(dx, dy) < CAD_GRID_STEP / 2) return;
    verticalFirst = dy > dx;
    preferenceChosen = true;
  };

  return {
    verticalFirst: () => verticalFirst,
    bundleFlipped: () => bundleFlipped,
    reset: () => {
      verticalFirst = false;
      preferenceChosen = false;
    },
    clearDecision: () => { preferenceChosen = false; },
    toggleCorner: () => {
      verticalFirst = !verticalFirst;
      preferenceChosen = true;
    },
    flipBundle: () => { bundleFlipped = !bundleFlipped; },
    observePointer,
  };
}
