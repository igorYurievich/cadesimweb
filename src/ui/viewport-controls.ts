import { schemaBounds } from '@model/geometry';
import type { AppContext } from './context';
import type { Point, Viewport } from './viewport';
import { screenToSheet, zoomAt } from './viewport';
import { fitBounds } from './helpers';
import { svgPoint } from './canvas-primitives';
import { PROGRAM_PAGE_EVENT, currentPage, pageViewport, requestProgramPage } from './program-pages-view';

export interface ViewportControlsSetup {
  root: HTMLElement; svg: SVGSVGElement; backdrop?: SVGRectElement | null;
  viewSize(): Point; setViewSize(value: Point): void;
  viewport(): Viewport; setViewport(value: Viewport): void; drawViewport(): void;
}

export function setupViewportControls(ctx: AppContext, deps: ViewportControlsSetup): void {
  deps.svg.addEventListener('wheel', (event) => {
    event.preventDefault();
    // Щипок на тачпаде браузер присылает как колесо с Ctrl и маленьким шагом (единицы пикселей за событие):
    // с общей чувствительностью приходилось разводить пальцы 5 раз. Для щипка — в 10 раз сильнее;
    // колесо мыши (шаг ~100) и прокрутка двумя пальцами — как раньше. Строки/страницы (Firefox) → пиксели.
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? deps.viewSize().y : 1;
    const delta = event.deltaY * unit;
    const pinch = event.ctrlKey && Math.abs(delta) < 50;
    const factor = Math.min(2, Math.max(0.5, Math.exp(-delta * (pinch ? 0.01 : 0.001))));
    deps.setViewport(zoomAt(deps.viewport(), svgPoint(event, deps.svg, deps.viewSize()), factor));
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
    // Вписываем содержимое листа, который сейчас на экране (основного или листа программы ПЛК).
    const page = currentPage(ctx.schema, deps.viewport(), size);
    const bounds = schemaBounds(ctx.schema, undefined, page);
    deps.setViewport(bounds ? fitBounds(bounds, size) : pageViewport(ctx.schema, page, size));
    deps.drawViewport();
  });
  // Переход на лист программы ПЛК (кнопка в свойствах LOGO / S7) и вкладки «Схема / Программа» над полем.
  deps.root.addEventListener(PROGRAM_PAGE_EVENT, (event) => {
    const page = (event as CustomEvent<number>).detail;
    deps.setViewport(pageViewport(ctx.schema, page, deps.viewSize()));
    deps.drawViewport();
  });
  deps.root.querySelector<HTMLElement>('#page-tabs')?.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-program-page]');
    if (button) requestProgramPage(deps.root, Number(button.dataset.programPage));
  });
}
