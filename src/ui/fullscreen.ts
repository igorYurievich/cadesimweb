import type { InterfaceText } from './i18n';

// Кнопка полноэкранного режима справа в шапке. Режим включает браузер (Fullscreen API) для всей страницы;
// выйти можно той же кнопкой или клавишей Esc. Значок и подсказка меняются по событию fullscreenchange,
// поэтому выход по Esc тоже обновляет кнопку. Если браузер не умеет полноэкранный режим, кнопка скрыта.

const SVG_NS = 'http://www.w3.org/2000/svg';
const ENTER = 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5';
const EXIT = 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5';

const isFullscreen = (): boolean => document.fullscreenElement !== null;

/** Значок и подсказка по текущему состоянию; вызывается и при смене языка интерфейса. */
export function updateFullscreenButton(root: HTMLElement, t: InterfaceText): void {
  const button = root.querySelector<HTMLButtonElement>('#fullscreen-toggle');
  if (!button) return;
  const on = isFullscreen();
  const title = on ? t.fullscreenExit : t.fullscreenEnter;
  button.title = title;
  button.setAttribute('aria-label', title);
  button.setAttribute('aria-pressed', String(on));
  button.querySelector('path')?.setAttribute('d', on ? EXIT : ENTER);
}

export function setupFullscreenButton(root: HTMLElement, uiText: () => InterfaceText): void {
  const button = root.querySelector<HTMLButtonElement>('#fullscreen-toggle');
  if (!button) return;
  if (!document.fullscreenEnabled) {
    button.hidden = true;
    return;
  }
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.append(document.createElementNS(SVG_NS, 'path'));
  button.replaceChildren(svg);
  button.addEventListener('click', () => {
    const request = isFullscreen() ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    // Браузер может отказать (например, во встроенном фрейме) — тогда остаёмся как есть.
    request.catch(() => undefined).finally(() => button.blur());
  });
  document.addEventListener('fullscreenchange', () => updateFullscreenButton(root, uiText()));
  updateFullscreenButton(root, uiText());
}
