/**
 * Старый вид палитры «Значки» в духе CADe SIMU: колонка категорий и всплывающая лента значков.
 * Сейчас выключен (app-shell.ts), код оставлен, чтобы вернуть его без переписывания.
 */
import type { GroupKey } from '@model/catalog';
import { cadTypeForCommand } from '@model/cad-types';
import { groupTitles } from './palette-titles';
import { createPaletteItem, createPaletteItemSymbol } from './palette-item';
import type { PaletteGroupItems, PaletteSetup } from './palette-types';
import type { AppContext } from './context';
import { PLACE_DEFAULTS } from './constants';

export function renderIconPalette(
  ctx: AppContext,
  deps: PaletteSetup,
  entries: PaletteGroupItems[],
  activeKey: GroupKey | undefined,
  setActive: (value: GroupKey | undefined) => void,
  renderPalette: () => void,
  query: string,
): void {
  const activeEntry = entries.find((entry) => entry.group.key === activeKey);
  if (activeKey && !activeEntry) activeKey = undefined;
  if (query && !activeEntry) activeKey = entries[0]?.group.key;
  setActive(activeKey);
  for (const entry of entries) {
    deps.groups.append(createIconCategoryButton(entry, activeKey, ctx, deps, () => {
      setActive(activeKey === entry.group.key ? undefined : entry.group.key);
      renderPalette();
    }));
  }
  const selected = entries.find((entry) => entry.group.key === activeKey);
  renderIconSubpanel(selected, ctx, deps, renderPalette);
}

function createIconCategoryButton(
  entry: PaletteGroupItems,
  activeKey: GroupKey | undefined,
  ctx: AppContext,
  deps: PaletteSetup,
  activate: () => void,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'palette-group-toggle palette-icon-toggle';
  const name = groupTitles[deps.paletteLang()]?.[entry.group.key] ?? entry.group.name;
  button.title = name;
  button.setAttribute('aria-label', name);
  button.setAttribute('aria-expanded', String(activeKey === entry.group.key));
  button.classList.toggle('is-selected', activeKey === entry.group.key);
  const categoryPreview = entry.group.key === 'manual-controls'
    ? entry.items.find((item) => item.id === 32909)
    : undefined;
  const first = categoryPreview ?? entry.items.find((item) => {
    const type = cadTypeForCommand(item.id);
    return Boolean(type && PLACE_DEFAULTS[type.code]);
  });
  const type = first && cadTypeForCommand(first.id);
  if (first && type) button.append(createPaletteItemSymbol(first, type.code, entry.group.key, ctx));
  button.addEventListener('click', activate);
  return button;
}

function renderIconSubpanel(
  entry: PaletteGroupItems | undefined,
  ctx: AppContext,
  deps: PaletteSetup,
  renderPalette: () => void,
): void {
  const panel = ctx.root.querySelector<HTMLElement>('#palette-subpanel');
  const items = panel?.querySelector<HTMLElement>('.palette-subpanel-items');
  if (!panel || !items) return;
  panel.hidden = !entry;
  items.replaceChildren();
  if (!entry) return;
  for (const item of entry.items) {
    if (entry.group.key === 'manual-controls' && [32914, 32919, 32923, 32927].includes(item.id)) {
      const divider = document.createElement('span');
      divider.className = 'palette-subpanel-divider';
      divider.setAttribute('aria-hidden', 'true');
      items.append(divider);
    }
    items.append(createPaletteItem(item, entry.group.key, ctx, deps, 'icons', renderPalette));
  }
  updatePaletteSubpanelSlider(items, panel.querySelector<HTMLInputElement>('.palette-subpanel-scroll'));
}

export function setupPaletteSubpanelScrolling(ctx: AppContext): void {
  const panel = ctx.root.querySelector<HTMLElement>('#palette-subpanel');
  const items = panel?.querySelector<HTMLElement>('.palette-subpanel-items');
  const slider = panel?.querySelector<HTMLInputElement>('.palette-subpanel-scroll');
  if (!items || !slider) return;
  const sync = (): void => updatePaletteSubpanelSlider(items, slider);
  items.addEventListener('scroll', sync, { passive: true });
  items.addEventListener('wheel', (event) => {
    const maxScroll = items.scrollHeight - items.clientHeight;
    if (maxScroll <= 0 || event.deltaY === 0) return;
    event.preventDefault();
    const multiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? 16
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? items.clientHeight : 1;
    items.scrollTop += event.deltaY * multiplier;
    sync();
  }, { passive: false });
  slider.addEventListener('input', () => {
    items.scrollTop = Number(slider.value);
    sync();
  });
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(sync).observe(items);
  sync();
}

function updatePaletteSubpanelSlider(items: HTMLElement, slider: HTMLInputElement | null): void {
  if (!slider) return;
  const maxScroll = Math.max(0, items.scrollHeight - items.clientHeight);
  slider.max = String(maxScroll);
  slider.value = String(Math.min(items.scrollTop, maxScroll));
  slider.disabled = maxScroll === 0;
}
