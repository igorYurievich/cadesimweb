import type { Schema } from '@model/types';
import { FALLBACK_VIEWPORT } from './constants';
import { fullSheet } from './helpers';
import { fitViewport } from './viewport';
import type { Point, Viewport } from './viewport';
import { readSavedViewport } from './persistence';

export interface CanvasViewportState {
  viewSize: Point;
  viewport: Viewport;
  backdrop: SVGRectElement | null;
}

export function initializeCanvasViewport(svg: SVGSVGElement, schema: Schema): CanvasViewportState {
  const initialRect = svg.getBoundingClientRect();
  const viewSize: Point = {
    x: initialRect.width || FALLBACK_VIEWPORT.width,
    y: initialRect.height || FALLBACK_VIEWPORT.height,
  };
  svg.setAttribute('viewBox', `0 0 ${viewSize.x} ${viewSize.y}`);
  const backdrop = svg.querySelector<SVGRectElement>('.viewport-backdrop');
  backdrop?.setAttribute('width', String(viewSize.x));
  backdrop?.setAttribute('height', String(viewSize.y));
  const viewport = readSavedViewport(viewSize)
    ?? fitViewport(fullSheet(schema.sheet), { width: viewSize.x, height: viewSize.y });
  return { viewSize, viewport, backdrop };
}
