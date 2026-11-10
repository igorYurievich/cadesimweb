/** Pure SVG viewport math: screen and sheet coordinates. */

export interface Point { x: number; y: number }

export interface Viewport {
  /** Screen units per one schematic unit. */
  scale: number;
  /** Sheet origin in screen coordinates. */
  offsetX: number;
  offsetY: number;
}

export const MIN_VIEWPORT_SCALE = 0.2;
export const MAX_VIEWPORT_SCALE = 8;

export function sheetToScreen(point: Point, viewport: Viewport): Point {
  return { x: point.x * viewport.scale + viewport.offsetX, y: point.y * viewport.scale + viewport.offsetY };
}

export function screenToSheet(point: Point, viewport: Viewport): Point {
  return { x: (point.x - viewport.offsetX) / viewport.scale, y: (point.y - viewport.offsetY) / viewport.scale };
}

/** Zooms while keeping the sheet coordinate under the cursor fixed. */
export function zoomAt(viewport: Viewport, cursor: Point, factor: number, limits: { min?: number; max?: number } = {}): Viewport {
  const min = limits.min ?? MIN_VIEWPORT_SCALE;
  const max = limits.max ?? MAX_VIEWPORT_SCALE;
  const safeFactor = Number.isFinite(factor) && factor > 0 ? factor : 1;
  const scale = Math.min(max, Math.max(min, viewport.scale * safeFactor));
  const sheetPoint = screenToSheet(cursor, viewport);
  return { scale, offsetX: cursor.x - sheetPoint.x * scale, offsetY: cursor.y - sheetPoint.y * scale };
}

/** Pans by a screen-space pointer delta. */
export function panBy(viewport: Viewport, delta: Point): Viewport {
  return { ...viewport, offsetX: viewport.offsetX + delta.x, offsetY: viewport.offsetY + delta.y };
}

/** Keeps the whole small sheet in view and leaves part of a zoomed-in sheet reachable. */
export function clampViewport(
  viewport: Viewport,
  sheet: { width: number; height: number },
  screen: Point,
): Viewport {
  return {
    ...viewport,
    offsetX: clampViewportAxis(viewport.offsetX, screen.x, sheet.width * viewport.scale),
    offsetY: clampViewportAxis(viewport.offsetY, screen.y, sheet.height * viewport.scale),
  };
}

function clampViewportAxis(offset: number, screenSize: number, sheetSize: number): number {
  if (sheetSize <= screenSize) return Math.max(0, Math.min(screenSize - sheetSize, offset));
  const visible = Math.min(screenSize * 0.2, 80);
  return Math.max(visible - sheetSize, Math.min(screenSize - visible, offset));
}

/** Snaps a coordinate to the nearest CAD grid step. */
export function snapToGrid(value: number, step = 3): number {
  if (!Number.isFinite(value)) return value;
  if (!Number.isFinite(step) || step <= 0) throw new RangeError('Grid step must be a positive number');
  return Math.round(value / step) * step;
}

export function snapPointToGrid(point: Point, step = 3): Point {
  return { x: snapToGrid(point.x, step), y: snapToGrid(point.y, step) };
}

/** Fits and centers a sheet in the available screen area. */
export function fitViewport(sheet: { width: number; height: number }, screen: { width: number; height: number }, padding = 40): Viewport {
  const width = Math.max(1, screen.width - padding * 2);
  const height = Math.max(1, screen.height - padding * 2);
  const scale = Math.min(width / sheet.width, height / sheet.height, MAX_VIEWPORT_SCALE);
  return { scale, offsetX: (screen.width - sheet.width * scale) / 2, offsetY: (screen.height - sheet.height * scale) / 2 };
}
