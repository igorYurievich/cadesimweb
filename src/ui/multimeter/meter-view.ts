/** DOM мультиметра: слой поверх всего окна, корпус, два щупа, провода и окно «прибор испорчен». */

import { BODY_WIDTH, DIAL_ANGLE, JACK_COM, JACK_V, meterBodySvg, probeSvg } from './meter-art';
import { cablePath, probePose } from './meter-geometry';
import type { ScreenPoint } from './meter-geometry';
import type { DialMode, MeterDisplay } from './meter-reading';
import { formatVolts } from './meter-reading';

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface MeterTexts {
  brokenTitle: string;
  brokenText: string;
  replace: string;
  close: string;
  hold: string;
}

export interface MeterView {
  layer: HTMLDivElement;
  body: HTMLDivElement;
  red: HTMLDivElement;
  black: HTMLDivElement;
  alert: HTMLDivElement;
  replaceButton: HTMLButtonElement;
  part(name: string): SVGElement | null;
}

export function createMeterView(texts: MeterTexts): MeterView {
  const layer = document.createElement('div');
  layer.className = 'multimeter-layer';
  layer.hidden = true;
  const cables = document.createElementNS(SVG_NS, 'svg');
  cables.setAttribute('class', 'multimeter-cables');
  // Провода рисуются поверх корпуса: каждый выходит из своего гнезда через вилку (COM — чёрный, V Ω — красный).
  const plug = (name: string, color: string): string => `<g data-plug="${name}">
    <circle r="14" fill="${color}" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>
    <circle r="6" fill="rgba(0,0,0,0.35)"/></g>`;
  cables.innerHTML = '<path data-cable="black" stroke="#151515"/><path data-cable="red" stroke="#c62828"/>'
    + plug('black', '#1d1d1d') + plug('red', '#d32f2f');
  const body = document.createElement('div');
  body.className = 'multimeter-body';
  body.innerHTML = meterBodySvg();
  const probe = (color: string, name: string): HTMLDivElement => {
    const div = document.createElement('div');
    div.className = `multimeter-probe is-${name}`;
    div.innerHTML = probeSvg(color);
    return div;
  };
  const black = probe('#1d1d1d', 'black');
  const red = probe('#d32f2f', 'red');
  const alert = document.createElement('div');
  alert.className = 'multimeter-alert';
  alert.setAttribute('role', 'alert');
  alert.hidden = true;
  const title = document.createElement('strong');
  const text = document.createElement('p');
  const replaceButton = document.createElement('button');
  replaceButton.type = 'button';
  alert.append(title, text, replaceButton);
  layer.append(body, cables, black, red, alert);
  const view: MeterView = {
    layer, body, red, black, alert, replaceButton,
    part: (name) => body.querySelector<SVGElement>(`[data-part="${name}"]`),
  };
  applyMeterTexts(view, texts);
  return view;
}

export function applyMeterTexts(view: MeterView, texts: MeterTexts): void {
  const [title, text] = [view.alert.querySelector('strong'), view.alert.querySelector('p')];
  if (title) title.textContent = `⚠ ${texts.brokenTitle}`;
  if (text) text.textContent = texts.brokenText;
  view.replaceButton.textContent = texts.replace;
  setTitle(view.part('close'), texts.close);
  setTitle(view.part('hold'), texts.hold);
}

function setTitle(node: SVGElement | null, text: string): void {
  if (!node) return;
  let title = node.querySelector<SVGTitleElement>(':scope > title');
  if (!title) {
    title = document.createElementNS(SVG_NS, 'title');
    node.prepend(title);
  }
  title.textContent = text;
}

/** Корпус, щупы и провода по текущим точкам (пиксели окна). */
export function layoutMeter(view: MeterView, bodyAt: ScreenPoint, redTip: ScreenPoint, blackTip: ScreenPoint): void {
  view.body.style.transform = `translate(${bodyAt.x}px, ${bodyAt.y}px)`;
  type Side = 'red' | 'black';
  const place = (probe: HTMLDivElement, tip: ScreenPoint, jackOffset: ScreenPoint, cable: Side): void => {
    const jack = { x: bodyAt.x + jackOffset.x, y: bodyAt.y + jackOffset.y };
    const pose = probePose(tip, jack, cable);
    probe.style.transform = `translate(${tip.x - 20}px, ${tip.y}px) rotate(${pose.angle}deg)`;
    view.layer.querySelector(`[data-cable="${cable}"]`)?.setAttribute('d', cablePath(jack, pose));
    view.layer.querySelector(`[data-plug="${cable}"]`)?.setAttribute('transform', `translate(${jack.x} ${jack.y})`);
  };
  place(view.black, blackTip, JACK_COM, 'black');
  place(view.red, redTip, JACK_V, 'red');
  // Окно предупреждения — справа от прибора (или слева, если справа нет места).
  const right = bodyAt.x + BODY_WIDTH + 16;
  const left = right + 420 > window.innerWidth ? Math.max(8, bodyAt.x - 436) : right;
  view.alert.style.transform = `translate(${left}px, ${Math.max(8, bodyAt.y)}px)`;
}

export interface MeterScreenState {
  mode: DialMode;
  display: MeterDisplay;
  broken: boolean;
  hold: boolean;
}

function setText(view: MeterView, part: string, text: string): void {
  const node = view.part(part);
  if (node && node.textContent !== text) node.textContent = text;
}

/** Экран, стрелка переключателя и трещины. */
export function renderMeterScreen(view: MeterView, state: MeterScreenState): void {
  view.part('pointer')?.setAttribute('transform', `rotate(${DIAL_ANGLE[state.mode]})`);
  view.body.classList.toggle('is-broken', state.broken);
  view.body.classList.toggle('is-off', state.mode === 'off' && !state.broken);
  view.alert.hidden = !state.broken;
  const display = state.display;
  let mode = '';
  let value = '';
  let unit = '';
  if (state.broken) {
    value = 'Err';
  } else if (display.kind === 'volt') {
    mode = display.dc ? 'V ⎓' : 'V ~';
    value = formatVolts(display.volts);
    unit = 'V';
  } else if (display.kind === 'ohm') {
    mode = 'Ω )))';
    value = display.closed ? '0.0' : 'OL';
    unit = 'Ω';
  }
  setText(view, 'mode', mode);
  setText(view, 'value', value);
  setText(view, 'unit', unit);
  const beep = display.kind === 'ohm' && display.closed && !state.broken;
  setText(view, 'flags', `${state.hold && !state.broken ? 'H ' : ''}${beep ? '🔊' : ''}`);
}
