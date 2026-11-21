import {
  PLC_WITH_PROGRAM, RUNG_PITCH, ensureProgramPage, pageOfX, pageOrigin, programPageCount, programPageOf,
  programPageOwner, programPageSize,
} from '@model/program-pages';
import type { Schema, SchemaElement } from '@model/types';
import { SVG_NS } from './constants';
import { cloneSchema, fullSheet } from './helpers';
import type { Point, Viewport } from './viewport';
import { fitViewport, screenToSheet } from './viewport';

// ── Листы программ ПЛК в редакторе (model/program-pages.ts) ─────────────────────────────────────────────
// Лист программы — область справа от основного листа; «перейти на лист» = сдвинуть вид. Вкладки «Схема /
// Программа …» над полем показываются, когда у схемы есть листы программ. Переход — событие PROGRAM_PAGE_EVENT
// на корне приложения (detail — номер листа), его ловит viewport-controls.ts.

export const PROGRAM_PAGE_EVENT = 'cadesimu:program-page';

export const requestProgramPage = (root: HTMLElement, page: number): void => {
  root.dispatchEvent(new CustomEvent<number>(PROGRAM_PAGE_EVENT, { detail: page }));
};

/** Лист, который сейчас в центре вида. */
export function currentPage(schema: Schema, viewport: Viewport, viewSize: Point): number {
  const center = screenToSheet({ x: viewSize.x / 2, y: viewSize.y / 2 }, viewport);
  const page = pageOfX(center.x);
  return page <= programPageCount(schema) ? page : 0;
}

/** Вид, в котором лист page целиком на экране. */
export function pageViewport(schema: Schema, page: number, viewSize: Point): Viewport {
  if (page < 1) {
    const fit = fitViewport(fullSheet(schema.sheet), { width: viewSize.x, height: viewSize.y });
    return fit;
  }
  // Лист программы вписываем вместе с «планшетом» вокруг него (tabletFrame); сверху — вкладки документов,
  // снизу — «Схема / Программа».
  const frame = tabletFrame(programPageSize(schema.sheet));
  const fit = fitViewport({ width: frame.box.w, height: frame.box.h }, { width: viewSize.x, height: viewSize.y - 80 }, 24);
  return {
    ...fit,
    offsetX: fit.offsetX - (pageOrigin(page) + frame.box.x) * fit.scale,
    offsetY: fit.offsetY + 40 - frame.box.y * fit.scale,
  };
}

/**
 * Рамка «планшета» вокруг листа программы, в координатах листа (экран = лист 0…width × 0…height):
 * ровная тёмная рамка со скруглёнными углами и камерой сверху. Только картинка: программа рисуется
 * на «экране», а основная схема — это «реальная» установка.
 */
export function tabletFrame({ width, height }: { width: number; height: number }) {
  const bezel = Math.max(6, Math.round(Math.min(width, height) * 0.035));
  const top = Math.round(bezel * 1.25);
  return {
    bezel, top,
    box: { x: -bezel - 1, y: -top - 1, w: width + 2 * bezel + 2, h: height + top + bezel + 2 },
  };
}

/** Лист на экране при последней отрисовке (для «Размер листа»: правим размер того листа, что открыт). */
let shownPage = 0;
export const activeProgramPage = (): number => shownPage;

const pageTitle = (schema: Schema, page: number, text: PageTexts): string => {
  const owner = programPageOwner(schema, page);
  return `${text.program} · ${owner?.name.trim() || (owner?.typeCode === 10230 ? 'S7-1200' : 'LOGO')}`;
};

export interface PageTexts { program: string; mainSheet: string }

/**
 * Листы программ в стиле LOGO!Soft: белая бумага без точек сетки, серые линии между строками Ladder
 * (шаг RUNG_PITCH) и заголовок над листом. Размер — programPageSize (меняется в «Размер листа» на этом листе).
 */
export function renderProgramPageSheets(layer: SVGGElement | null, schema: Schema, text: PageTexts): void {
  if (!layer) return;
  layer.replaceChildren();
  const { width, height } = programPageSize(schema.sheet);
  const f = tabletFrame({ width, height });
  const node = <K extends 'rect' | 'path' | 'text' | 'circle' | 'g'>(tag: K, attrs: Record<string, string | number>) => {
    const element = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value));
    return element;
  };
  for (let page = 1; page <= programPageCount(schema); page += 1) {
    const x = pageOrigin(page);
    const rows: string[] = [];
    for (let y = RUNG_PITCH; y < height; y += RUNG_PITCH) rows.push(`M ${x} ${y} H ${x + width}`);
    const title = node('text', { x: x + width / 2, y: -f.top / 2 + 1.4, class: 'program-page-title', 'text-anchor': 'middle' });
    title.textContent = pageTitle(schema, page, text);
    const outerW = width + 2 * f.bezel;
    const outerH = height + f.top + f.bezel;
    layer.append(
      // Корпус: тонкий светлый кант (алюминий) и тёмное стекло рамки поверх.
      node('rect', { x: x - f.bezel - 0.8, y: -f.top - 0.8, width: outerW + 1.6, height: outerH + 1.6, rx: f.bezel * 1.15,
        class: 'tablet-edge' }),
      node('rect', { x: x - f.bezel, y: -f.top, width: outerW, height: outerH, rx: f.bezel, class: 'tablet-bezel' }),
      node('circle', { cx: x - f.bezel / 2, cy: height / 2, r: Math.max(0.8, f.bezel * 0.12), class: 'tablet-camera' }),
      node('rect', { x, y: 0, width, height, fill: '#fff' }),
      node('path', { d: rows.join(' '), class: 'program-page-rows', fill: 'none' }),
      title,
    );
  }
}

/** Вкладки «Схема / Программа …» над полем; активна та, что в центре вида. */
export function renderPageTabs(bar: HTMLElement | null, schema: Schema, page: number, text: PageTexts): void {
  shownPage = page;
  if (!bar) return;
  const count = programPageCount(schema);
  bar.hidden = count === 0;
  if (!count) { bar.replaceChildren(); return; }
  const button = (target: number, label: string): HTMLButtonElement => {
    const node = document.createElement('button');
    node.type = 'button';
    node.dataset.programPage = String(target);
    node.textContent = label;
    node.classList.toggle('is-active', target === page);
    return node;
  };
  const buttons = [button(0, text.mainSheet)];
  for (let target = 1; target <= count; target += 1) buttons.push(button(target, pageTitle(schema, target, text)));
  bar.replaceChildren(...buttons);
}

export interface ProgramButtonDeps {
  propertyFields: HTMLElement;
  uiText: () => { programOpen: string; programHint: string };
  commitSchema: (before: Schema) => void;
  renderSchema: () => void;
  root: HTMLElement;
}

/** Кнопка «Программа (Ladder)…» в свойствах LOGO / S7-1200: открывает (при первом нажатии — создаёт) его лист. */
export function appendProgramButton(schema: Schema, element: SchemaElement, deps: ProgramButtonDeps): void {
  if (!PLC_WITH_PROGRAM.has(element.typeCode)) return;
  const text = deps.uiText();
  const wrap = document.createElement('div');
  wrap.className = 'property-field';
  const open = document.createElement('button');
  open.type = 'button';
  open.className = 'property-program-button';
  open.textContent = text.programOpen;
  open.addEventListener('click', () => {
    let page = programPageOf(schema, element);
    if (page === undefined) {
      const before = cloneSchema(schema);
      page = ensureProgramPage(schema, element);
      deps.commitSchema(before);
      deps.renderSchema();
    }
    requestProgramPage(deps.root, page);
  });
  const hint = document.createElement('small');
  hint.className = 'property-hint';
  hint.textContent = text.programHint;
  wrap.append(open, hint);
  deps.propertyFields.append(wrap);
}
