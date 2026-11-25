import type { AppContext } from './context';
import { cloneSchema } from './helpers';
import { isWireInteriorPoint } from './wire-routing';
import { wireTypeCode } from './wire-planner';
import type { Point } from './viewport';
import { currentText, fillText } from './i18n';

export interface WireEditorCommandsOptions {
  ctx: AppContext;
  svg: SVGSVGElement;
  status: HTMLElement;
  wireKindSelect: HTMLSelectElement;
  wireThicknessSelect: HTMLSelectElement;
  selected: Map<string, { kind: 'element' | 'wire'; id: number }>;
  isDrawing: () => boolean;
  setDrawing: (value: boolean) => void;
  points: () => Point[];
  setPoints: (value: Point[]) => void;
  setCursor: (value: Point | undefined) => void;
  resetRoutePreference: () => void;
  flipBundle: () => void;
  buildRoutes: (points: readonly Point[]) => Array<{ route: Point[]; kind: 'phase' | 'neutral' | 'protection' }>;
  isInsideSheet: (route: readonly Point[]) => boolean;
  hitsComponent: (route: readonly Point[]) => boolean;
  leaveNodeTool: () => void;
  clearPlacement: () => void;
  renderSchema: () => void;
  drawDraft: () => void;
  updateHistoryButtons: () => void;
  commitSchema: (before: ReturnType<typeof cloneSchema>) => void;
}

export interface WireEditorCommands {
  cancel: () => void;
  start: () => void;
  toggle: () => void;
  finish: () => void;
}

export function createWireEditorCommands(options: WireEditorCommandsOptions): WireEditorCommands {
  const cancel = (): void => {
    options.setDrawing(false);
    options.setPoints([]);
    options.setCursor(undefined);
    options.svg.classList.remove('is-drawing-wire');
    options.renderSchema();
    options.status.textContent = currentText().wireCancelled;
  };
  const start = (): void => {
    options.leaveNodeTool();
    options.clearPlacement();
    options.svg.classList.remove('is-placing');
    options.selected.clear();
    options.setDrawing(true);
    options.setPoints([]);
    options.setCursor(undefined);
    options.resetRoutePreference();
    options.svg.classList.add('is-drawing-wire');
    options.renderSchema();
    options.status.textContent = currentText().wireModeHint;
  };
  const toggle = (): void => { if (options.isDrawing()) cancel(); else start(); };
  const finish = (): void => {
    const draftPoints = options.points();
    if (draftPoints.length < 2) {
      options.setPoints([]);
      options.setCursor(undefined);
      options.drawDraft();
      options.updateHistoryButtons();
      return;
    }
    let bundle = options.buildRoutes(draftPoints);
    const activeKinds = options.wireKindSelect.value;
    const multiWire = activeKinds === 'three' || activeKinds === 'threeN';
    if (bundle.length && !bundle.every((item) => options.isInsideSheet(item.route)) && multiWire) {
      options.flipBundle();
      bundle = options.buildRoutes(draftPoints);
    }
    if (bundle.length === 0 || !bundle.every((item) => options.isInsideSheet(item.route))) {
      options.status.textContent = currentText().wireNoRoom;
      options.setPoints([]);
      options.setCursor(undefined);
      options.drawDraft();
      options.updateHistoryButtons();
      return;
    }
    if (bundle.some((item) => options.hitsComponent(item.route))) {
      options.status.textContent = currentText().wireThroughBody;
      options.setPoints([]);
      options.setCursor(undefined);
      options.drawDraft();
      options.updateHistoryButtons();
      return;
    }

    const schema = options.ctx.schema;
    const before = cloneSchema(schema);
    let id = Math.max(0, ...schema.elements.map((element) => element.id), ...schema.wires.map((wire) => wire.id)) + 1;
    const existingWires = [...schema.wires];
    for (const { route, kind } of bundle) {
      const typeCode = wireTypeCode(activeKinds, kind);
      for (let index = 1; index < route.length; index += 1) {
        const from = route[index - 1];
        const to = route[index];
        if (!from || !to || (from.x === to.x && from.y === to.y)) continue;
        schema.wires.push({
          id: id++, typeCode, kind, from: { ...from }, to: { ...to },
          thickness: Number(options.wireThicknessSelect.value), dot: false,
        });
      }
      const junctionPoints = new Map<string, Point>();
      // Endpoints landing on an existing wire form a T-junction; crossings do not.
      for (const point of [route[0], route[route.length - 1]]) {
        if (point && existingWires.some((wire) => isWireInteriorPoint(point, wire))) {
          junctionPoints.set(`${point.x},${point.y}`, point);
        }
      }
      for (const point of junctionPoints.values()) {
        const alreadyMarked = schema.wires.some((wire) => wire.kind === 'junction'
          && wire.from.x === point.x && wire.from.y === point.y);
        if (!alreadyMarked) {
          schema.wires.push({
            id: id++, typeCode: 4001, kind: 'junction', from: { ...point }, to: { ...point },
            thickness: 0, dot: true,
          });
        }
      }
    }
    options.setPoints([]);
    options.setCursor(undefined);
    options.selected.clear();
    options.commitSchema(before);
    options.renderSchema();
    options.status.textContent = bundle.length > 1
      ? fillText(currentText().wiresAdded, { count: bundle.length })
      : currentText().wireAdded;
  };
  return { cancel, start, toggle, finish };
}
