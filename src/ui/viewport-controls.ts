import { schemaBounds } from '@model/geometry';
import type { AppContext } from './context';
import type { Point, Viewport } from './viewport';
import { fitViewport, screenToSheet, zoomAt } from './viewport';
import { fitBounds, fullSheet } from './helpers';
import { svgPoint } from './canvas-primitives';

export interface ViewportControlsSetup {
  root: HTMLElement; svg: SVGSVGElement; backdrop?: SVGRectElement | null;
  viewSize(): Point; setViewSize(value: Point): void;
  viewport(): Viewport; setViewport(value: Viewport): void; drawViewport(): void;
}

export function setupViewportControls(ctx: AppContext, deps: ViewportControlsSetup): void {
  deps.svg.addEventListener('wheel', (event) => {
    event.preventDefault();
    deps.setViewport(zoomAt(deps.viewport(), svgPoint(event, deps.svg, deps.viewSize()), Math.exp(-event.deltaY * 0.001)));
    deps.drawViewport();
  }, { passive: false });
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? 0; const height = entry?.contentRect.height ?? 0;
      const oldSize = deps.viewSize();
      if (width <= 0 || height <= 0 || (width === oldSize.x && height === oldSize.y)) return;
      const viewport = deps.viewport();
      const sheetCenter = screenToSheet({ x: oldSize.x / 2, y: oldSize.y / 2 }, viewport);
      deps.setViewSize({ x: width, y: height });
      deps.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      deps.backdrop?.setAttribute('width', String(width)); deps.backdrop?.setAttribute('height', String(height));
      deps.setViewport({ ...viewport, offsetX: width / 2 - sheetCenter.x * viewport.scale, offsetY: height / 2 - sheetCenter.y * viewport.scale });
      deps.drawViewport();
    });
    observer.observe(deps.svg);
  }
  deps.root.querySelector<HTMLButtonElement>('[data-zoom="in"]')?.addEventListener('click', () => {
    const size = deps.viewSize(); deps.setViewport(zoomAt(deps.viewport(), { x: size.x / 2, y: size.y / 2 }, 1.2)); deps.drawViewport();
  });
  deps.root.querySelector<HTMLButtonElement>('[data-zoom="out"]')?.addEventListener('click', () => {
    const size = deps.viewSize(); deps.setViewport(zoomAt(deps.viewport(), { x: size.x / 2, y: size.y / 2 }, 1 / 1.2)); deps.drawViewport();
  });
  deps.root.querySelector<HTMLButtonElement>('[data-zoom="fit"]')?.addEventListener('click', () => {
    const size = deps.viewSize();
    const bounds = schemaBounds(ctx.schema);
    deps.setViewport(bounds ? fitBounds(bounds, size) : fitViewport(fullSheet(ctx.schema.sheet), { width: size.x, height: size.y }));
    deps.drawViewport();
  });
}
