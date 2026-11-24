import type { Point, Viewport } from './viewport';
import { panBy, zoomAt } from './viewport';
import { svgPoint } from './canvas-primitives';

// ── Мобильная версия: просмотр и симуляция схемы ────────────────────────────────────────────────
// На телефоне (узкий экран или сенсорный экран малой высоты) у корня ставится data-mobile="true", и CSS убирает
// всё, что нужно для редактирования: панель элементов, свойства, курсор / руку / узел, провода, меню «Элементы».
// Жесты на листе: один палец — перетаскивание, два пальца — увеличение (щипок), двойное касание — вписать схему.
// В симуляции касание элемента нажимает его (кнопки, выключатели), как мышь. Справа внизу — кнопки + − и «вписать».
// При включении режима и при повороте экрана схема вписывается в экран (в книжной ориентации — по ширине).

const MOBILE_QUERY = '(max-width: 640px), (pointer: coarse) and (max-height: 500px)';

export interface MobileSetup {
  root: HTMLElement;
  svg: SVGSVGElement;
  viewSize(): Point;
  viewport(): Viewport;
  setViewport(value: Viewport): void;
  drawViewport(): void;
  simulationMode(): 'edit' | 'run';
}

const zoomButton = (zoom: string, label: string, icon: string): string =>
  `<button type="button" data-mobile-zoom="${zoom}" aria-label="${label}" title="${label}">${icon}</button>`;

/** «Вписать схему»: лист с рамкой (не путать со значком полного экрана в шапке). */
const FIT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="1.5"/>'
  + '<rect x="7.5" y="9" width="9" height="6" rx="0.8"/></svg>';

function addZoomButtons(root: HTMLElement): void {
  const stage = root.querySelector<HTMLElement>('.viewport-stage');
  if (!stage || stage.querySelector('.mobile-zoom')) return;
  const box = document.createElement('div');
  box.className = 'mobile-zoom';
  box.innerHTML = zoomButton('in', '+', '+') + zoomButton('out', '−', '−') + zoomButton('fit', 'Fit', FIT_ICON);
  box.addEventListener('click', (event) => {
    const zoom = (event.target as Element).closest<HTMLElement>('[data-mobile-zoom]')?.dataset.mobileZoom;
    if (zoom) root.querySelector<HTMLButtonElement>(`[data-zoom="${zoom}"]`)?.click();
  });
  stage.append(box);
}

export function setupMobile(deps: MobileSetup): void {
  const query = window.matchMedia?.(MOBILE_QUERY);
  if (!query) return;
  const isMobile = (): boolean => deps.root.dataset.mobile === 'true';
  const fitButton = (): HTMLButtonElement | null => deps.root.querySelector<HTMLButtonElement>('[data-zoom="fit"]');
  const fit = (): void => { requestAnimationFrame(() => fitButton()?.click()); };
  // Телефон: панель симуляции переезжает в поле схемы (вертикально у левого края, viewport.css), на компьютере — обратно.
  const toolbar = deps.root.querySelector<HTMLElement>('.viewport-toolbar');
  const stage = deps.root.querySelector<HTMLElement>('.viewport-stage');
  const toolbarHome = toolbar ? { parent: toolbar.parentElement, next: toolbar.nextSibling } : undefined;
  const placeToolbar = (mobile: boolean): void => {
    if (!toolbar || !stage || !toolbarHome?.parent) return;
    if (mobile) stage.append(toolbar);
    else toolbarHome.parent.insertBefore(toolbar, toolbarHome.next);
  };
  const apply = (): void => {
    const mobile = query.matches;
    if (mobile === isMobile()) return;
    if (mobile) deps.root.dataset.mobile = 'true';
    else delete deps.root.dataset.mobile;
    placeToolbar(mobile);
    if (mobile) fit();
  };
  addZoomButtons(deps.root);
  apply();
  query.addEventListener?.('change', apply);
  window.addEventListener('orientationchange', () => { if (isMobile()) setTimeout(fit, 250); });
  setupGestures(deps, isMobile, fit);
}

/** Перетаскивание одним пальцем, щипок двумя, двойное касание — вписать. Работает раньше обработчиков редактора. */
function setupGestures(deps: MobileSetup, isMobile: () => boolean, fit: () => void): void {
  const touches = new Map<number, Point>();
  let pinch: { distance: number; middle: Point; viewport: Viewport } | undefined;
  let lastTap = 0;
  const at = (event: PointerEvent): Point => svgPoint(event, deps.svg, deps.viewSize());
  const pair = (): [Point, Point] => [...touches.values()] as [Point, Point];
  const startPinch = (): void => {
    const [a, b] = pair();
    pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y) || 1, middle: mid(a, b), viewport: deps.viewport() };
  };
  const ours = (event: PointerEvent): boolean =>
    isMobile() && event.pointerType !== 'mouse' && deps.svg.contains(event.target as Node);

  window.addEventListener('pointerdown', (event) => {
    if (!ours(event)) return;
    // В симуляции одиночное касание элемента — нажатие (обрабатывает редактор).
    const onElement = (event.target as Element).closest('.schematic-element') !== null;
    if (touches.size === 0 && deps.simulationMode() === 'run' && onElement) return;
    event.stopPropagation();
    event.preventDefault();
    touches.set(event.pointerId, at(event));
    if (touches.size === 2) startPinch();
    if (touches.size === 1) {
      const now = event.timeStamp;
      if (now - lastTap < 300) fit();
      lastTap = now;
    }
  }, { capture: true });

  window.addEventListener('pointermove', (event) => {
    const previous = touches.get(event.pointerId);
    if (!previous) return;
    event.stopPropagation();
    event.preventDefault();
    const point = at(event);
    touches.set(event.pointerId, point);
    if (touches.size >= 2 && pinch) {
      const [a, b] = pair();
      const middle = mid(a, b);
      const moved = panBy(pinch.viewport, { x: middle.x - pinch.middle.x, y: middle.y - pinch.middle.y });
      deps.setViewport(zoomAt(moved, middle, Math.hypot(a.x - b.x, a.y - b.y) / pinch.distance));
    } else {
      deps.setViewport(panBy(deps.viewport(), { x: point.x - previous.x, y: point.y - previous.y }));
    }
    deps.drawViewport();
  }, { capture: true });

  const end = (event: PointerEvent): void => {
    if (!touches.delete(event.pointerId)) return;
    event.stopPropagation();
    pinch = touches.size === 2 ? pinch : undefined;
    if (touches.size >= 2) startPinch();
  };
  window.addEventListener('pointerup', end, { capture: true });
  window.addEventListener('pointercancel', end, { capture: true });
}

const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
