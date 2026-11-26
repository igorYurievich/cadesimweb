import { catalog } from '@model/catalog';
import type { ComponentDef, ComponentGroup, GroupKey, Lang } from '@model/catalog';
import { isPaletteItemShown, readVerifiedOnly, writeVerifiedOnly } from './palette-filter';
import { writeOptionalPaletteGroups } from './settings';
import { loadInterfaceText } from './i18n';
import { PROGRAM_VIEW_EVENT, activeProgramPage } from './program-pages-view';
import { groupTitles } from './palette-titles';
import { createPaletteItem } from './palette-item';
import { renderIconPalette, setupPaletteSubpanelScrolling } from './palette-icon-mode';
import { setupPaletteViewToggle, updatePaletteViewToggle } from './palette-view-toggle';
import { setupPaletteTooltip } from './palette-tooltip';
import type { PaletteGroupItems, PaletteSetup } from './palette-types';
import type { AppContext } from './context';
import { INTERFACE_LANGUAGE_KEY, OPTIONAL_PALETTE_GROUPS } from './constants';
import './palette-grid.css';

export type { PaletteSetup } from './palette-types';

/** Только проверенные компоненты в палитре (по умолчанию да). */
let verifiedOnly = readVerifiedOnly();

export function setupPalette(ctx: AppContext, deps: PaletteSetup): { renderPalette(): void } {
  const openPaletteGroups = new Set<string>();
  let activeIconGroup: GroupKey | undefined;
  setupPaletteSubpanelScrolling(ctx);
  const renderPalette = (): void => renderPaletteGroups(
    ctx,
    deps,
    openPaletteGroups,
    activeIconGroup,
    (value) => { activeIconGroup = value; },
    renderPalette,
  );
  setupPaletteViewToggle(ctx, deps, renderPalette);
  setupPaletteTooltip(deps.groups);
  deps.search.addEventListener('input', renderPalette);
  ctx.root.addEventListener(PROGRAM_VIEW_EVENT, renderPalette);
  // «Вид → Показать все / только проверенные компоненты».
  ctx.root.querySelector('#palette-verified-only')?.addEventListener('click', () => {
    verifiedOnly = !verifiedOnly;
    writeVerifiedOnly(verifiedOnly);
    renderPalette();
  });
  for (const input of [...ctx.root.querySelectorAll<HTMLInputElement>('[data-optional-group]')]) {
    input.addEventListener('change', () => {
      const key = input.dataset.optionalGroup as GroupKey;
      if ((OPTIONAL_PALETTE_GROUPS as readonly GroupKey[]).includes(key)) {
        if (input.checked) deps.visibleOptionalGroups.add(key); else deps.visibleOptionalGroups.delete(key);
        writeOptionalPaletteGroups(deps.visibleOptionalGroups);
        renderPalette();
      }
    });
  }
  // Кнопки языков в меню «Idioma»: выбор одним нажатием, через тот же select (обработчик ниже).
  ctx.root.querySelector('.language-options')?.addEventListener('click', (event) => {
    const lang = (event.target as Element).closest<HTMLElement>('[data-lang]')?.dataset.lang;
    if (!lang || lang === deps.language.value) {
      ctx.root.querySelector<HTMLDetailsElement>('.language-menu')?.removeAttribute('open');
      return;
    }
    deps.language.value = lang;
    deps.language.dispatchEvent(new Event('change'));
  });
  deps.language.addEventListener('change', () => {
    const lang = deps.language.value as Lang;
    try { localStorage.setItem(INTERFACE_LANGUAGE_KEY, lang); } catch { /* Keep the selected language for this session. */ }
    ctx.root.querySelector<HTMLDetailsElement>('.language-menu')?.removeAttribute('open');
    // Тексты языка — отдельный кусок сборки: сначала скачиваем, потом перерисовываем интерфейс.
    // Без сети и без кэша остаются тексты уже скачанного языка (interfaceText).
    void loadInterfaceText(lang).catch(() => undefined).then(() => {
      if (deps.language.value !== lang) return; // Пока качалось, выбрали другой язык.
      deps.setPaletteLang(lang);
      deps.translateInterface();
      renderPalette();
      deps.renderProperties();
    });
  });
  return { renderPalette };
}

function renderPaletteGroups(
  ctx: AppContext,
  deps: PaletteSetup,
  openGroups: Set<string>,
  activeIconGroup: GroupKey | undefined,
  setActiveIconGroup: (value: GroupKey | undefined) => void,
  renderPalette: () => void,
): void {
  const query = deps.search.value.trim();
  const matches = query ? catalog.search(query) : catalog.components;
  // На листе программы ПЛК (вкладка «Программа · LOGO») в палитре остаются только Ladder и GRAFCET.
  const programView = activeProgramPage() > 0;
  const isVisible = (key: GroupKey): boolean => programView ? key === 'ladder' || key === 'grafcet'
    : !(OPTIONAL_PALETTE_GROUPS as readonly GroupKey[]).includes(key) || deps.visibleOptionalGroups.has(key);
  const shown = (group: GroupKey, item: ComponentDef): boolean =>
    isVisible(group) && isPaletteItemShown(group, item.id, verifiedOnly);
  const visible = matches.filter((item) => item.groups.some((group) => shown(group, item)));
  const filterCommand = ctx.root.querySelector<HTMLElement>('#palette-verified-only');
  if (filterCommand) {
    const text = deps.uiText();
    filterCommand.textContent = (verifiedOnly ? text.showAllComponents : text.showVerifiedOnly) ?? '';
  }
  const iconView = ctx.root.dataset.paletteView === 'icons';
  const gridView = ctx.root.dataset.paletteView === 'grid';
  ctx.root.querySelector<HTMLElement>('.component-palette')?.classList.toggle('is-icon-view', iconView);
  updatePaletteViewToggle(ctx, deps);
  deps.groups.dataset.searching = query ? 'true' : 'false';
  deps.count.textContent = deps.uiText().elementCount.replace(
    '{count}',
    new Intl.NumberFormat(deps.paletteLang()).format(visible.length),
  );
  deps.groups.replaceChildren();
  const groupItems: PaletteGroupItems[] = [];
  for (const group of catalog.groups) {
    if (!isVisible(group.key)) continue;
    const items = matches.filter((item) => item.groups.includes(group.key) && shown(group.key, item));
    if (items.length) groupItems.push({ group, items });
  }
  if (iconView) {
    renderIconPalette(ctx, deps, groupItems, activeIconGroup, setActiveIconGroup, renderPalette, query);
    return;
  }
  const subpanel = ctx.root.querySelector<HTMLElement>('#palette-subpanel');
  if (subpanel) {
    subpanel.hidden = true;
    subpanel.querySelector('.palette-subpanel-items')?.replaceChildren();
  }
  for (const entry of groupItems) {
    try {
      const mode = gridView ? 'grid' : 'list';
      deps.groups.append(renderPaletteGroup(entry, ctx, deps, { query, openGroups, mode }, renderPalette));
    } catch (error) {
      console.error(`Не удалось отобразить категорию ${entry.group.key}`, error);
    }
  }
}

function renderPaletteGroup(
  entry: PaletteGroupItems,
  ctx: AppContext,
  deps: PaletteSetup,
  view: { query: string; openGroups: Set<string>; mode: 'list' | 'grid' },
  renderPalette: () => void,
): HTMLDetailsElement {
  const { query, openGroups, mode } = view;
  const section = document.createElement('details');
  section.className = 'palette-group';
  section.open = Boolean(query) || openGroups.has(entry.group.key);
  const toggle = createGroupToggle(entry.group, entry.items, deps);
  section.addEventListener('toggle', () => {
    if (query) return;
    if (section.open) openGroups.add(entry.group.key);
    else openGroups.delete(entry.group.key);
  });
  const list = document.createElement('div');
  list.className = mode === 'grid' ? 'palette-items palette-grid' : 'palette-items';
  for (const item of entry.items) {
    list.append(createPaletteItem(item, entry.group.key, ctx, deps, mode, renderPalette));
  }
  section.append(toggle, list);
  return section;
}

function createGroupToggle(
  group: ComponentGroup,
  items: ComponentDef[],
  deps: PaletteSetup,
): HTMLElement {
  const toggle = document.createElement('summary');
  toggle.className = 'palette-group-toggle';
  const name = groupTitles[deps.paletteLang()]?.[group.key] ?? group.name;
  toggle.title = name;
  toggle.textContent = name;
  const badge = document.createElement('span');
  badge.className = 'palette-count-badge';
  badge.textContent = String(items.length);
  toggle.append(badge);
  return toggle;
}
