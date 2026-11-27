/** Перетаскивание корпуса мультиметра и щупов мышью, пальцем или пером. */

import type { Point as SheetPoint } from '@model/types';
import type { ScreenPoint } from './meter-geometry';
import type { MeterView } from './meter-view';
import type { MeterProbe, MultimeterState } from './multimeter';

export interface DragHandlers {
  /** Точка на листе, к которой прилипает щуп, отпущенный в client; undefined — щуп в воздухе. */
  snap(client: ScreenPoint): SheetPoint | undefined;
  changed(): void;
}

/** Части корпуса, которые нажимаются, а не тащат прибор. */
const CONTROL_SELECTOR = '[data-dial], [data-part="knob"], [data-part="hold"], [data-part="close"]';

function dragWith(
  element: HTMLElement,
  start: (event: PointerEvent) => boolean,
  move: (event: PointerEvent) => void,
  end: (event: PointerEvent) => void,
): void {
  let pointer: number | undefined;
  element.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || !start(event)) return;
    pointer = event.pointerId;
    // Взятый щуп ложится поверх второго (до захвата указателя: перенос в DOM снимает захват).
    const layer = element.parentElement;
    if (layer && element.classList.contains('multimeter-probe')) {
      layer.insertBefore(element, layer.querySelector('.multimeter-alert'));
    }
    element.setPointerCapture(event.pointerId);
    element.classList.add('is-dragging');
    event.preventDefault();
    event.stopPropagation();
  });
  element.addEventListener('pointermove', (event) => {
    if (event.pointerId === pointer) move(event);
  });
  const finish = (event: PointerEvent): void => {
    if (event.pointerId !== pointer) return;
    pointer = undefined;
    element.classList.remove('is-dragging');
    end(event);
  };
  element.addEventListener('pointerup', finish);
  element.addEventListener('pointercancel', finish);
}

function bindProbe(
  element: HTMLElement,
  probe: () => MeterProbe,
  tip: () => ScreenPoint,
  handlers: DragHandlers,
): void {
  let offset = { x: 0, y: 0 };
  dragWith(
    element,
    (event) => {
      const at = tip();
      offset = { x: event.clientX - at.x, y: event.clientY - at.y };
      return true;
    },
    (event) => {
      const current = probe();
      current.sheet = undefined;
      current.client = { x: event.clientX - offset.x, y: event.clientY - offset.y };
      handlers.changed();
    },
    () => {
      const current = probe();
      current.sheet = handlers.snap(current.client);
      handlers.changed();
    },
  );
}

export function bindMeterDrag(
  view: MeterView,
  state: MultimeterState,
  handlers: DragHandlers & { tipOf?: (probe: MeterProbe) => ScreenPoint },
): void {
  let grab = { x: 0, y: 0 };
  dragWith(
    view.body,
    (event) => {
      if ((event.target as Element).closest(CONTROL_SELECTOR)) return false;
      grab = { x: event.clientX - state.bodyAt.x, y: event.clientY - state.bodyAt.y };
      return true;
    },
    (event) => {
      state.bodyAt = { x: event.clientX - grab.x, y: event.clientY - grab.y };
      handlers.changed();
    },
    () => handlers.changed(),
  );
  const tipOf = handlers.tipOf ?? ((probe: MeterProbe) => probe.client);
  bindProbe(view.red, () => state.red, () => tipOf(state.red), handlers);
  bindProbe(view.black, () => state.black, () => tipOf(state.black), handlers);
}
