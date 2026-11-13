import { catalog } from '@model/catalog';
import type { ComponentDef, ComponentGroup, GroupKey, Lang } from '@model/catalog';
import { cadTypeForCommand } from '@model/cad-types';
import { hasVerifiedBadge } from '@model/catalog-verification';
import { createPlacedElement } from './helpers';
import { createElementSymbol } from './symbols';
import {
  createContactorIcon,
  createAuxContactIcon,
  createCoilSignalIcon,
  createFuseIcon,
  createManualControlIcon,
  createMotorIcon,
  createPowerSourceIcon,
  createPowerElectronicsIcon,
  createProtectionIcon,
} from './palette-icon-assets';
import type { AppContext } from './context';
import {
  INTERFACE_LANGUAGE_KEY,
  OPTIONAL_GROUP_STORAGE_KEY,
  OPTIONAL_PALETTE_GROUPS,
  PLACE_DEFAULTS,
} from './constants';

const groupTitles: Record<Lang, Record<GroupKey, string>> = {
  es: { 'power-sources': 'Alimentaciones y fuentes', fuses: 'Fusibles y seccionadores', protection: 'Protección', contactors: 'Contactores e interruptores', motors: 'Motores', 'power-electronics': 'Potencia electrónica', 'aux-contacts': 'Contactos auxiliares', 'manual-controls': 'Accionamientos', sensors: 'Detectores y sensores', 'coils-signaling': 'Bobinas, temporizadores y señalización', 'electronic-relays': 'Relés electrónicos', logic: 'Lógica', ladder: 'Ladder', grafcet: 'GRAFCET', 'io-plc': 'Entrada / salida, PLC', pneumatics: 'Actuadores neumáticos', wiring: 'Cables y conexiones', 'realistic-2d': 'Símbolos realistas · 2D', 'realistic-3d': 'Símbolos realistas · 3D' },
  en: { 'power-sources': 'Power supplies', fuses: 'Fuses and disconnectors', protection: 'Protection', contactors: 'Contactors and switches', motors: 'Motors', 'power-electronics': 'Power electronics', 'aux-contacts': 'Auxiliary contacts', 'manual-controls': 'Manual controls', sensors: 'Sensors', 'coils-signaling': 'Coils, timers and signaling', 'electronic-relays': 'Electronic relays', logic: 'Logic', ladder: 'Ladder', grafcet: 'GRAFCET', 'io-plc': 'PLC inputs / outputs', pneumatics: 'Pneumatic actuators', wiring: 'Wires and connections', 'realistic-2d': 'Realistic symbols · 2D', 'realistic-3d': 'Realistic symbols · 3D' },
  it: { 'power-sources': 'Alimentazioni e fonti', fuses: 'Fusibili e sezionatori', protection: 'Protezione', contactors: 'Contattori e interruttori', motors: 'Motori', 'power-electronics': 'Elettronica di potenza', 'aux-contacts': 'Contatti ausiliari', 'manual-controls': 'Comandi manuali', sensors: 'Sensori', 'coils-signaling': 'Bobine, temporizzatori e segnalazione', 'electronic-relays': 'Relè elettronici', logic: 'Logica', ladder: 'Ladder', grafcet: 'GRAFCET', 'io-plc': 'Ingressi / uscite PLC', pneumatics: 'Attuatori pneumatici', wiring: 'Cavi e connessioni', 'realistic-2d': 'Simboli realistici · 2D', 'realistic-3d': 'Simboli realistici · 3D' },
  ru: { 'power-sources': 'Источники питания', fuses: 'Предохранители и разъединители', protection: 'Защита', contactors: 'Контакторы и выключатели', motors: 'Двигатели', 'power-electronics': 'Силовая электроника', 'aux-contacts': 'Вспомогательные контакты', 'manual-controls': 'Ручное управление', sensors: 'Датчики', 'coils-signaling': 'Катушки, реле времени и сигнализация', 'electronic-relays': 'Электронные реле', logic: 'Логика', ladder: 'Ladder', grafcet: 'GRAFCET', 'io-plc': 'Входы / выходы ПЛК', pneumatics: 'Пневматика', wiring: 'Провода и соединения', 'realistic-2d': 'Реалистичные символы · 2D', 'realistic-3d': 'Реалистичные символы · 3D' },
  fr: { 'power-sources': 'Alimentations et sources', fuses: 'Fusibles et sectionneurs', protection: 'Protection', contactors: 'Contacteurs et interrupteurs', motors: 'Moteurs', 'power-electronics': 'Électronique de puissance', 'aux-contacts': 'Contacts auxiliaires', 'manual-controls': 'Commandes manuelles', sensors: 'Capteurs', 'coils-signaling': 'Bobines, temporisateurs et signalisation', 'electronic-relays': 'Relais électroniques', logic: 'Logique', ladder: 'Ladder', grafcet: 'GRAFCET', 'io-plc': 'Entrées / sorties API', pneumatics: 'Actionneurs pneumatiques', wiring: 'Fils et connexions', 'realistic-2d': 'Symboles réalistes · 2D', 'realistic-3d': 'Symboles réalistes · 3D' },
  ar: { 'power-sources': 'مصادر التغذية', fuses: 'المصهرات والفواصل', protection: 'الحماية', contactors: 'الكونتاكتورات والمفاتيح', motors: 'المحركات', 'power-electronics': 'إلكترونيات القدرة', 'aux-contacts': 'الملامسات المساعدة', 'manual-controls': 'عناصر التحكم اليدوي', sensors: 'المستشعرات', 'coils-signaling': 'الملفات والمؤقتات والإشارات', 'electronic-relays': 'المرحلات الإلكترونية', logic: 'المنطق', ladder: 'Ladder', grafcet: 'GRAFCET', 'io-plc': 'مداخل ومخارج PLC', pneumatics: 'المشغلات الهوائية', wiring: 'الأسلاك والتوصيلات', 'realistic-2d': 'رموز واقعية · 2D', 'realistic-3d': 'رموز واقعية · 3D' },
};

export interface PaletteSetup {
  search: HTMLInputElement;
  language: HTMLSelectElement;
  count: HTMLElement;
  groups: HTMLElement;
  svg: SVGSVGElement;
  status: HTMLElement;
  paletteLang: () => Lang;
  setPaletteLang(value: Lang): void;
  visibleOptionalGroups: Set<GroupKey>;
  activePaletteCommand: () => number | undefined;
  setActivePaletteCommand(value: number | undefined): void;
  setPlacement(value: number | undefined): void;
  resetPlacementRotation(): void;
  uiText(): { elementCount: string; [key: string]: string };
  leaveNodeTool(): void;
  isWireDrawing(): boolean;
  cancelWireDrawing(): void;
  drawGhost(): void;
  translateInterface(): void;
  renderProperties(): void;
}

interface PaletteGroupItems {
  group: ComponentGroup;
  items: ComponentDef[];
}

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
  deps.search.addEventListener('input', renderPalette);
  for (const input of [...ctx.root.querySelectorAll<HTMLInputElement>('[data-optional-group]')]) {
    input.addEventListener('change', () => {
      const key = input.dataset.optionalGroup as GroupKey;
      if ((OPTIONAL_PALETTE_GROUPS as readonly GroupKey[]).includes(key)) {
        if (input.checked) deps.visibleOptionalGroups.add(key); else deps.visibleOptionalGroups.delete(key);
        try { localStorage.setItem(OPTIONAL_GROUP_STORAGE_KEY, JSON.stringify([...deps.visibleOptionalGroups])); } catch { /* Keep the selection for this session. */ }
        renderPalette();
      }
    });
  }
  deps.language.addEventListener('change', () => {
    const lang = deps.language.value as Lang;
    deps.setPaletteLang(lang);
    try { localStorage.setItem(INTERFACE_LANGUAGE_KEY, lang); } catch { /* Keep the selected language for this session. */ }
    deps.translateInterface();
    renderPalette();
    deps.renderProperties();
    ctx.root.querySelector<HTMLDetailsElement>('.language-menu')?.removeAttribute('open');
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
  const isVisible = (key: GroupKey): boolean =>
    !(OPTIONAL_PALETTE_GROUPS as readonly GroupKey[]).includes(key) || deps.visibleOptionalGroups.has(key);
  const visible = matches.filter((item) => item.groups.some(isVisible));
  const iconView = ctx.root.dataset.paletteView === 'icons';
  ctx.root.querySelector<HTMLElement>('.component-palette')?.classList.toggle('is-icon-view', iconView);
  deps.groups.dataset.searching = query ? 'true' : 'false';
  deps.count.textContent = deps.uiText().elementCount.replace(
    '{count}',
    new Intl.NumberFormat(deps.paletteLang()).format(visible.length),
  );
  deps.groups.replaceChildren();
  const groupItems: PaletteGroupItems[] = [];
  for (const group of catalog.groups) {
    if (!isVisible(group.key)) continue;
    const items = matches.filter((item) => item.groups.includes(group.key));
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
      deps.groups.append(renderPaletteGroup(entry, ctx, deps, query, openGroups, renderPalette));
    } catch (error) {
      console.error(`Не удалось отобразить категорию ${entry.group.key}`, error);
    }
  }
}

function renderIconPalette(
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
    items.append(createPaletteItem(item, entry.group.key, ctx, deps, true, renderPalette));
  }
  updatePaletteSubpanelSlider(items, panel.querySelector<HTMLInputElement>('.palette-subpanel-scroll'));
}

function setupPaletteSubpanelScrolling(ctx: AppContext): void {
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

function renderPaletteGroup(
  entry: PaletteGroupItems,
  ctx: AppContext,
  deps: PaletteSetup,
  query: string,
  openGroups: Set<string>,
  renderPalette: () => void,
): HTMLDetailsElement {
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
  list.className = 'palette-items';
  for (const item of entry.items) {
    list.append(createPaletteItem(item, entry.group.key, ctx, deps, false, renderPalette));
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

function createPaletteItem(
  item: ComponentDef,
  group: GroupKey,
  ctx: AppContext,
  deps: PaletteSetup,
  iconView: boolean,
  renderPalette: () => void,
): HTMLButtonElement {
  const mappedType = cadTypeForCommand(item.id);
  const cadType = mappedType && PLACE_DEFAULTS[mappedType.code] ? mappedType : undefined;
  const itemName = catalog.label(item, deps.paletteLang()).trim()
    || (deps.paletteLang() === 'ru' ? `Элемент ${item.id}` : String(item.id));
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'palette-item';
  button.dataset.commandId = String(item.id);
  if (iconView && cadType) button.append(createPaletteItemSymbol(item, cadType.code, group, ctx));
  const name = document.createElement('span');
  name.className = 'palette-item-label';
  name.textContent = itemName;
  button.append(name);
  addPaletteBadge(button, item, group, itemName, deps);
  button.title = cadType ? itemName : `${itemName} · пока недоступно для размещения`;
  if (!cadType) {
    button.disabled = true;
    button.title += ' (нет соответствия с типом .cad)';
  } else {
    button.draggable = true;
    button.setAttribute('aria-pressed', String(deps.activePaletteCommand() === item.id));
    addPlacementHandlers(button, item, cadType.code, itemName, deps, renderPalette);
  }
  return button;
}

function addPaletteBadge(
  button: HTMLButtonElement,
  item: ComponentDef,
  group: GroupKey,
  itemName: string,
  deps: PaletteSetup,
): void {
  const verified = hasVerifiedBadge(group, item.id);
  const verifiedText = deps.uiText().functionalityVerified ?? 'Функциональность элемента проверена';
  button.setAttribute('aria-label', verified ? `${itemName} — ${verifiedText}` : itemName);
  if (!verified) return;
  const badge = document.createElement('span');
  badge.className = 'palette-verified-badge';
  badge.textContent = '✓';
  badge.title = verifiedText;
  badge.setAttribute('aria-label', verifiedText);
  button.append(badge);
}

function addPlacementHandlers(
  button: HTMLButtonElement,
  item: ComponentDef,
  typeCode: number,
  itemName: string,
  deps: PaletteSetup,
  renderPalette: () => void,
): void {
  const setPlacement = (): void => {
    deps.setActivePaletteCommand(item.id);
    deps.setPlacement(typeCode);
    deps.resetPlacementRotation();
    deps.leaveNodeTool();
  };
  button.addEventListener('click', () => {
    setPlacement();
    if (deps.isWireDrawing()) deps.cancelWireDrawing();
    deps.svg.classList.add('is-placing');
    renderPalette();
    deps.drawGhost();
    deps.status.textContent = `Размещение: ${itemName} · щёлкните по листу или перетащите элемент; R — поворот, Esc — отмена.`;
  });
  button.addEventListener('dragstart', (event) => {
    if (!event.dataTransfer) return;
    setPlacement();
    event.dataTransfer.setData('text/plain', String(item.id));
    event.dataTransfer.effectAllowed = 'copy';
    deps.svg.classList.add('is-placing');
  });
}

function createPaletteSymbol(typeCode: number, ctx: AppContext): SVGSVGElement {
  const element = createPlacedElement(typeCode, { x: 0, y: 0 }, 0, ctx.schema);
  element.position = { x: 0, y: 0 };
  const preview = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  preview.setAttribute('viewBox', '0 0 48 36');
  preview.setAttribute('aria-hidden', 'true');
  preview.classList.add('palette-symbol');
  const symbol = createElementSymbol(element);
  if (symbol) {
    symbol.removeAttribute('data-element-id');
    const scale = Math.min(1.15, 26 / Math.max(6, element.size.w), 22 / Math.max(6, element.size.h));
    symbol.setAttribute('transform', `translate(${24 - element.size.w * scale / 2} ${18 - element.size.h * scale / 2}) scale(${scale})`);
    preview.append(symbol);
  }
  return preview;
}

function createPaletteItemSymbol(
  item: ComponentDef,
  typeCode: number,
  group: GroupKey,
  ctx: AppContext,
): Element {
  if (group === 'power-sources') {
    const sourceIcon = createPowerSourceIcon(item.id);
    if (sourceIcon) return sourceIcon;
  }
  if (group === 'fuses') {
    const fuseIcon = createFuseIcon(item.id);
    if (fuseIcon) return fuseIcon;
  }
  if (group === 'contactors') {
    const contactorIcon = createContactorIcon(item.id);
    if (contactorIcon) return contactorIcon;
  }
  if (group === 'protection') {
    const protectionIcon = createProtectionIcon(item.id);
    if (protectionIcon) return protectionIcon;
  }
  if (group === 'motors') {
    const motorIcon = createMotorIcon(item.id);
    if (motorIcon) return motorIcon;
  }
  if (group === 'aux-contacts') {
    const contactIcon = createAuxContactIcon(item.id);
    if (contactIcon) return contactIcon;
  }
  if (group === 'manual-controls') {
    const controlIcon = createManualControlIcon(item.id);
    if (controlIcon) return controlIcon;
  }
  if (group === 'coils-signaling') {
    const signalIcon = createCoilSignalIcon(item.id);
    if (signalIcon) return signalIcon;
  }
  if (group === 'power-electronics') {
    const electronicsIcon = createPowerElectronicsIcon(item.id);
    if (electronicsIcon) return electronicsIcon;
  }
  return createPaletteSymbol(typeCode, ctx);
}
