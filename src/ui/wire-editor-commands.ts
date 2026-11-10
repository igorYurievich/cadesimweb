import type { AppContext } from './context';
import { cloneSchema } from './helpers';
import { isWireInteriorPoint } from './wire-routing';
import type { Point } from './viewport';

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
    options.status.textContent = 'Рисование провода отменено.';
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
    options.status.textContent = 'Провод: клик — начало, второй клик — конец. Shift+клик — добавить излом; ↑/↓/←/→ — тип провода; C — выйти; Tab — другой угол, F — сторона пучка.';
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
      options.status.textContent = 'Провода не помещаются на листе в этом месте.';
      options.setPoints([]);
      options.setCursor(undefined);
      options.drawDraft();
      options.updateHistoryButtons();
      return;
    }
    if (bundle.some((item) => options.hitsComponent(item.route))) {
      options.status.textContent = 'Нельзя провести кабель через корпус компонента. Добавьте точки изгиба вокруг него.';
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
      const typeCode = kind === 'phase' ? 4000 : kind === 'neutral' ? 4009 : 4010;
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
      ? `Добавлено проводов: ${bundle.length}. Следующий клик — начало нового.`
      : 'Провод добавлен. Следующий клик — начало нового, Esc — выйти.';
  };
  return { cancel, start, toggle, finish };
}
