/**
 * Кнопка в шапке палитры: крупные значки ↔ текстовый список. Крупные значки сделаны для
 * слабовидящих: те же категории и поиск, но элементы — плитками 2–3 в ряд.
 * Выбор хранится в PALETTE_VIEW_KEY; старое значение 'icons' (выключенный вид CADe) читается как список.
 */
import type { AppContext } from './context';
import type { PaletteSetup } from './palette-types';
import { PALETTE_VIEW_KEY } from './constants';

export type StoredPaletteView = 'list' | 'grid';

export function readStoredPaletteView(): StoredPaletteView {
  try { return localStorage.getItem(PALETTE_VIEW_KEY) === 'grid' ? 'grid' : 'list'; } catch { return 'list'; }
}

function writeStoredPaletteView(value: StoredPaletteView): void {
  try { localStorage.setItem(PALETTE_VIEW_KEY, value); } catch { /* Вид действует до перезагрузки. */ }
}

const SVG_NS = 'http://www.w3.org/2000/svg';
// Значок показывает, во что переключит кнопка: квадраты — в значки, строки — в список.
const GRID_GLYPH = 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z';
const LIST_GLYPH = 'M3 5h18M3 12h18M3 19h18';

export function setupPaletteViewToggle(ctx: AppContext, deps: PaletteSetup, renderPalette: () => void): void {
  const heading = ctx.root.querySelector<HTMLElement>('.palette-heading');
  if (!heading || heading.querySelector('.palette-view-toggle')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'palette-view-toggle';
  const glyph = document.createElementNS(SVG_NS, 'svg');
  glyph.setAttribute('viewBox', '0 0 24 24');
  glyph.setAttribute('aria-hidden', 'true');
  glyph.append(document.createElementNS(SVG_NS, 'path'));
  const label = document.createElement('span');
  label.className = 'palette-view-toggle-label';
  button.append(glyph, label);
  heading.append(button);
  button.addEventListener('click', () => {
    const next: StoredPaletteView = ctx.root.dataset.paletteView === 'grid' ? 'list' : 'grid';
    ctx.root.dataset.paletteView = next;
    writeStoredPaletteView(next);
    renderPalette();
    deps.translateInterface();
  });
}

/** Подписи кнопки на языке интерфейса и под текущий вид (вызывается при каждой перерисовке палитры). */
export function updatePaletteViewToggle(ctx: AppContext, deps: PaletteSetup): void {
  const button = ctx.root.querySelector<HTMLButtonElement>('.palette-view-toggle');
  if (!button) return;
  const text = deps.uiText();
  const grid = ctx.root.dataset.paletteView === 'grid';
  button.setAttribute('aria-pressed', String(grid));
  button.title = grid ? text.paletteToListHint : text.paletteToGridHint;
  button.setAttribute('aria-label', button.title);
  button.querySelector('path')?.setAttribute('d', grid ? LIST_GLYPH : GRID_GLYPH);
  const label = button.querySelector('.palette-view-toggle-label');
  if (label) label.textContent = grid ? text.paletteToList : text.paletteToGrid;
}
