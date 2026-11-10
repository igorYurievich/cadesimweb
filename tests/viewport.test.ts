import { describe, expect, it } from 'vitest';
import {
  clampViewport,
  fitViewport,
  panBy,
  screenToSheet,
  sheetToScreen,
  snapPointToGrid,
  snapToGrid,
  zoomAt,
} from '../src/ui/viewport';

describe('SVG viewport math (6.1)', () => {
  it('converts screen coordinates to sheet coordinates and back', () => {
    const viewport = { scale: 2.5, offsetX: 80, offsetY: -12 };
    const sheet = { x: 18, y: 42 };
    expect(screenToSheet(sheetToScreen(sheet, viewport), viewport)).toEqual(sheet);
  });

  it('zooms around the cursor without moving the sheet point under it', () => {
    const viewport = { scale: 2, offsetX: 40, offsetY: 20 };
    const cursor = { x: 250, y: 130 };
    const before = screenToSheet(cursor, viewport);
    const zoomed = zoomAt(viewport, cursor, 1.5);
    expect(zoomed.scale).toBe(3);
    expect(sheetToScreen(before, zoomed).x).toBeCloseTo(cursor.x);
    expect(sheetToScreen(before, zoomed).y).toBeCloseTo(cursor.y);
  });

  it('clamps zoom and ignores invalid zoom factors safely', () => {
    const viewport = { scale: 1, offsetX: 0, offsetY: 0 };
    expect(zoomAt(viewport, { x: 0, y: 0 }, 100).scale).toBe(8);
    expect(zoomAt(viewport, { x: 0, y: 0 }, 0.001).scale).toBe(0.2);
    expect(zoomAt(viewport, { x: 5, y: 5 }, Number.NaN).scale).toBe(1);
  });

  it('pans by the pointer delta', () => {
    expect(panBy({ scale: 1.5, offsetX: 20, offsetY: 30 }, { x: -4, y: 12 }))
      .toEqual({ scale: 1.5, offsetX: 16, offsetY: 42 });
  });

  it('keeps a zoomed-out sheet inside the view while panning', () => {
    const viewport = clampViewport(
      { scale: 0.5, offsetX: -200, offsetY: 900 },
      { width: 200, height: 100 },
      { x: 1000, y: 700 },
    );
    expect(viewport).toEqual({ scale: 0.5, offsetX: 0, offsetY: 650 });
  });

  it('leaves part of a zoomed-in sheet visible at the pan limits', () => {
    const viewport = clampViewport(
      { scale: 2, offsetX: 2000, offsetY: -2000 },
      { width: 1000, height: 800 },
      { x: 1200, y: 900 },
    );
    expect(viewport).toEqual({ scale: 2, offsetX: 1120, offsetY: -1520 });
  });

  it('snaps coordinates to the CAD grid and fits a sheet in the view', () => {
    expect(snapPointToGrid({ x: 4.4, y: -7 }, 3)).toEqual({ x: 3, y: -6 });
    expect(snapToGrid(5.2)).toBe(6);
    const fitted = fitViewport({ width: 279, height: 210 }, { width: 1000, height: 700 });
    expect(fitted.scale).toBeGreaterThan(0);
    expect(sheetToScreen({ x: 279, y: 210 }, fitted).x).toBeLessThanOrEqual(1000);
    expect(sheetToScreen({ x: 279, y: 210 }, fitted).y).toBeLessThanOrEqual(700);
  });
});
