/**
 * Виртуальный мультиметр (кнопка рядом с лупой). Прибор лежит поверх окна и схему не меняет:
 * корпус и щупы перетаскиваются, щуп «прилипает» к ближайшему проводу или клемме, провода тянутся за ним.
 * В .cad и автосохранение ничего не пишется.
 */

import { probeContact } from '@engine/meter-probe';
import type { ProbeContact } from '@engine/meter-probe';
import type { EngineState, UserInputs } from '@engine/types';
import type { Point as SheetPoint, Schema } from '@model/types';
import { screenToSheet, sheetToScreen } from '../viewport';
import type { Point, Viewport } from '../viewport';
import { createMeterBeep } from './meter-beep';
import { BODY_HEIGHT, BODY_WIDTH } from './meter-art';
import type { ScreenPoint } from './meter-geometry';
import { readMeter } from './meter-reading';
import type { DialMode, MeterDisplay, MeterProbeNets } from './meter-reading';
import { applyMeterTexts, createMeterView, layoutMeter, renderMeterScreen } from './meter-view';
import type { MeterTexts, MeterView } from './meter-view';
import { bindMeterDrag } from './meter-drag';
import './multimeter.css';

export interface MultimeterTexts extends MeterTexts {
  tool: string;
  hint: string;
}

export interface MultimeterSetup {
  root: HTMLElement;
  svg: SVGSVGElement;
  status: HTMLElement;
  schema(): Schema;
  viewport(): Viewport;
  viewSize(): Point;
  /** Результат движка, пока идёт симуляция; в редакторе undefined. */
  engineResult(): EngineState | undefined;
  /** Положение кнопок и переключателей для прозвонки. */
  inputs(): UserInputs;
  texts(): MultimeterTexts;
}

/** Щуп: где кончик на экране и, если он приложен к схеме, точка на листе. */
export interface MeterProbe {
  client: ScreenPoint;
  sheet: SheetPoint | undefined;
}

/** Допуск попадания щупа, пиксели экрана. */
const SNAP_PX = 10;
/** Как часто пересчитывать показания, мс. */
const READ_EVERY_MS = 100;
const DIAL_ORDER: readonly DialMode[] = ['off', 'acv', 'dcv', 'ohm'];

const TOOL_ICON = `<svg class="tool-icon" viewBox="0 0 24 24" aria-hidden="true">
  <rect x="5" y="2" width="14" height="20" rx="3" fill="#ff7a1a"/>
  <rect x="7" y="4" width="10" height="16" rx="2" fill="#2a3036"/>
  <rect x="8" y="5.5" width="8" height="4.5" rx="1" fill="#c9e3b6"/>
  <circle cx="12" cy="14.5" r="2.6" fill="#ff7a1a"/></svg>`;

export interface MultimeterState {
  open: boolean;
  mode: DialMode;
  broken: boolean;
  hold: boolean;
  display: MeterDisplay;
  bodyAt: ScreenPoint;
  red: MeterProbe;
  black: MeterProbe;
}

function createToolButton(root: HTMLElement): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'multimeter-tool';
  button.className = 'icon-btn';
  button.setAttribute('aria-pressed', 'false');
  button.innerHTML = TOOL_ICON;
  const trace = root.querySelector('#wire-trace-tool');
  if (trace) trace.after(button);
  return button;
}

/** Перевод точек между окном браузера и листом схемы. */
export function meterCoordinates(deps: MultimeterSetup): {
  toSheet(client: ScreenPoint): SheetPoint;
  toClient(sheet: SheetPoint): ScreenPoint;
  overCanvas(client: ScreenPoint): boolean;
} {
  const rect = (): DOMRect => deps.svg.getBoundingClientRect();
  return {
    toSheet(client) {
      const r = rect(); const size = deps.viewSize();
      const view = {
        x: ((client.x - r.left) * size.x) / (r.width || 1),
        y: ((client.y - r.top) * size.y) / (r.height || 1),
      };
      return screenToSheet(view, deps.viewport());
    },
    toClient(sheet) {
      const r = rect(); const size = deps.viewSize();
      const view = sheetToScreen(sheet, deps.viewport());
      return { x: r.left + (view.x * r.width) / (size.x || 1), y: r.top + (view.y * r.height) / (size.y || 1) };
    },
    overCanvas(client) {
      const r = rect();
      return client.x >= r.left && client.x <= r.right && client.y >= r.top && client.y <= r.bottom;
    },
  };
}

function probeNets(red: ProbeContact | undefined, black: ProbeContact | undefined): MeterProbeNets {
  return { red: red?.net, black: black?.net, redWire: red?.wireGroup, blackWire: black?.wireGroup };
}

export function setupMultimeter(deps: MultimeterSetup): void {
  const button = createToolButton(deps.root);
  const view = createMeterView(deps.texts());
  document.body.append(view.layer);
  const coords = meterCoordinates(deps);
  const beep = createMeterBeep();
  const state: MultimeterState = {
    open: false, mode: 'off', broken: false, hold: false, display: { kind: 'off' },
    bodyAt: { x: 0, y: 0 },
    red: { client: { x: 0, y: 0 }, sheet: undefined },
    black: { client: { x: 0, y: 0 }, sheet: undefined },
  };
  let frame: number | undefined;
  let lastRead = 0;

  const tipOf = (probe: MeterProbe): ScreenPoint => (probe.sheet ? coords.toClient(probe.sheet) : probe.client);
  const contactOf = (probe: MeterProbe): ProbeContact | undefined =>
    probe.sheet ? probeContact(deps.schema(), probe.sheet, 0.5) : undefined;

  const read = (): void => {
    const reading = readMeter(
      { mode: state.mode, schema: deps.schema(), result: deps.engineResult(), inputs: deps.inputs() },
      probeNets(contactOf(state.red), contactOf(state.black)),
    );
    if (reading.burns && !state.broken) {
      state.broken = true;
      applyMeterTexts(view, deps.texts());
    }
    if (!state.hold) state.display = reading.display;
    beep.set(!state.broken && state.display.kind === 'ohm' && state.display.closed);
  };

  const tick = (time: number): void => {
    if (!state.open) { frame = undefined; return; }
    if (time - lastRead >= READ_EVERY_MS) { lastRead = time; read(); }
    layoutMeter(view, state.bodyAt, tipOf(state.red), tipOf(state.black));
    view.red.classList.toggle('is-attached', state.red.sheet !== undefined);
    view.black.classList.toggle('is-attached', state.black.sheet !== undefined);
    renderMeterScreen(view, state);
    frame = requestAnimationFrame(tick);
  };
  const refresh = (): void => {
    lastRead = 0;
    if (state.open && frame === undefined) frame = requestAnimationFrame(tick);
  };

  const placeInitially = (): void => {
    const r = deps.svg.getBoundingClientRect();
    state.bodyAt = {
      x: Math.max(8, r.right - BODY_WIDTH - 40),
      y: Math.max(8, Math.min(r.top + 20, window.innerHeight - BODY_HEIGHT - 8)),
    };
    state.red = { client: { x: state.bodyAt.x - 40, y: state.bodyAt.y + 170 }, sheet: undefined };
    state.black = { client: { x: state.bodyAt.x - 90, y: state.bodyAt.y + 200 }, sheet: undefined };
  };

  const setOpen = (on: boolean): void => {
    if (on && !state.open && state.bodyAt.x === 0 && state.bodyAt.y === 0) placeInitially();
    state.open = on;
    view.layer.hidden = !on;
    button.classList.toggle('is-active', on);
    button.setAttribute('aria-pressed', String(on));
    if (!on) beep.set(false);
    if (on) {
      applyMeterTexts(view, deps.texts());
      deps.status.textContent = deps.texts().hint;
      refresh();
    }
  };

  const updateTitle = (): void => {
    const t = deps.texts();
    button.title = t.tool;
    button.setAttribute('aria-label', t.tool);
  };
  updateTitle();
  button.addEventListener('pointerenter', updateTitle);
  button.addEventListener('click', () => { setOpen(!state.open); button.blur(); });
  bindMeterControls(view, state, {
    close: () => setOpen(false),
    changed: refresh,
    cycle: (mode) => DIAL_ORDER[(DIAL_ORDER.indexOf(mode) + 1) % DIAL_ORDER.length] as DialMode,
  });
  bindMeterDrag(view, state, {
    snap(client) {
      if (!coords.overCanvas(client)) return undefined;
      const tolerance = SNAP_PX / Math.max(0.01, deps.viewport().scale);
      const contact = probeContact(deps.schema(), coords.toSheet(client), tolerance);
      return contact?.point;
    },
    changed: refresh,
    tipOf,
  });
}

interface ControlHandlers {
  close(): void;
  changed(): void;
  cycle(mode: DialMode): DialMode;
}

/** Переключатель, HOLD, ✕ и «Заменить мультиметр». */
function bindMeterControls(view: MeterView, state: MultimeterState, handlers: ControlHandlers): void {
  view.body.addEventListener('click', (event) => {
    const target = event.target as Element;
    const dial = target.closest('[data-dial]')?.getAttribute('data-dial') as DialMode | null;
    if (state.broken) {
      if (target.closest('[data-part="close"]')) handlers.close();
      return;
    }
    if (dial) state.mode = dial;
    else if (target.closest('[data-part="knob"]')) state.mode = handlers.cycle(state.mode);
    else if (target.closest('[data-part="hold"]')) state.hold = !state.hold;
    else if (target.closest('[data-part="close"]')) { handlers.close(); return; }
    else return;
    handlers.changed();
  });
  view.replaceButton.addEventListener('click', () => {
    state.broken = false;
    state.hold = false;
    state.mode = 'off';
    state.display = { kind: 'off' };
    handlers.changed();
  });
}
