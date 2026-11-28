/** Разметка окна-прибора «Змейки по проводам» и обновление его надписей (без игровой логики). */
import { fillText } from '../i18n';
import type { SnakeText } from '../i18n/snake-text';
import type { SnakeState } from './snake-logic';

export interface SnakeView {
  backdrop: HTMLDivElement;
  canvas: HTMLCanvasElement;
  score: HTMLElement;
  peak: HTMLElement;
  soundButton: HTMLButtonElement;
  pauseButton: HTMLButtonElement;
  closeButtons: HTMLButtonElement[];
  restartButton: HTMLButtonElement;
  overlay: HTMLElement;
}

const pad = (value: number): string => String(value).padStart(3, '0');

function make<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}

function button(className: string, text: string, title = ''): HTMLButtonElement {
  const node = make('button', className, text);
  node.type = 'button';
  if (title) { node.title = title; node.setAttribute('aria-label', title); }
  return node;
}

function display(label: string): [HTMLElement, HTMLElement] {
  const box = make('div', 'snake-display');
  const value = make('b', 'snake-display-value', '000');
  box.append(make('span', 'snake-display-label', label), value);
  return [box, value];
}

export function buildSnakeView(t: SnakeText): SnakeView {
  const backdrop = make('div', 'snake-backdrop');
  const device = make('section', 'snake-device');
  device.setAttribute('role', 'dialog');
  device.setAttribute('aria-modal', 'true');
  device.setAttribute('aria-label', t.title);
  const head = make('header', 'snake-head');
  const power = make('span', 'snake-power');
  power.append(make('i', 'snake-led'), document.createTextNode('PWR ON'));
  const closeX = button('snake-close-x', '✕', t.close);
  head.append(power, make('h2', 'snake-title', t.title), closeX);
  const hud = make('div', 'snake-hud');
  const [scoreBox, score] = display(t.load);
  const [peakBox, peak] = display(t.peak);
  const soundButton = button('snake-hud-button', '🔊');
  const pauseButton = button('snake-hud-button', '⏸');
  hud.append(scoreBox, peakBox, soundButton, pauseButton);
  const screen = make('div', 'snake-screen');
  const canvas = make('canvas', 'snake-canvas');
  const overlay = make('div', 'snake-overlay');
  overlay.hidden = true;
  const restartButton = button('snake-overlay-button is-primary', t.restart);
  const closeDevice = button('snake-overlay-button', t.closeDevice);
  screen.append(canvas, overlay);
  const foot = make('footer', 'snake-foot');
  const exit = button('snake-exit', t.exit);
  foot.append(make('span', 'snake-mark', 'MOD: SNAKE-4962 // TEST BENCH'), make('span', 'snake-help', t.help), exit);
  device.append(head, hud, screen, foot);
  backdrop.append(device);
  return {
    backdrop, canvas, score, peak, soundButton, pauseButton, overlay, restartButton,
    closeButtons: [closeX, closeDevice, exit],
  };
}

export function renderHud(view: SnakeView, t: SnakeText, state: SnakeState, best: number, sound: boolean): void {
  view.score.textContent = `${pad(state.score)} ${t.unit}`;
  view.peak.textContent = `${pad(Math.max(best, state.score))} ${t.unit}`;
  view.soundButton.textContent = sound ? '🔊' : '🔇';
  view.soundButton.title = sound ? t.soundOn : t.soundOff;
  view.soundButton.setAttribute('aria-pressed', String(sound));
  view.pauseButton.textContent = state.phase === 'paused' ? '▶' : '⏸';
  view.pauseButton.title = state.phase === 'paused' ? t.resume : t.pause;
  view.pauseButton.disabled = state.phase === 'over';
}

export interface OverlayResult {
  record: boolean;
  best: number;
  /** Факт об электрике после проигрыша. */
  fact?: string;
}

/** Табличка поверх поля: пауза или «Короткое замыкание». */
export function renderOverlay(view: SnakeView, t: SnakeText, state: SnakeState, result: OverlayResult): void {
  const { record, best, fact } = result;
  const { overlay } = view;
  overlay.replaceChildren();
  overlay.hidden = state.phase === 'running';
  overlay.classList.toggle('is-over', state.phase === 'over');
  if (state.phase === 'paused') {
    overlay.append(make('strong', 'snake-overlay-title', t.paused), make('span', 'snake-overlay-line', t.pausedHint));
    return;
  }
  if (state.phase !== 'over') return;
  const title = state.crash ? t.overTitle : t.fullTitle;
  overlay.append(
    make('strong', 'snake-overlay-title', title),
    make('span', 'snake-overlay-line', fillText(t.overScore, { score: state.score })),
    make('span', record ? 'snake-overlay-record' : 'snake-overlay-line',
      record ? t.newRecord : fillText(t.bestScore, { score: best })),
  );
  if (fact) {
    const box = make('div', 'snake-fact');
    box.append(make('b', 'snake-fact-title', t.factTitle), make('span', 'snake-fact-text', fact));
    overlay.append(box);
  }
  const actions = make('div', 'snake-overlay-actions');
  actions.append(view.restartButton, view.closeButtons[1]!);
  overlay.append(actions);
}
