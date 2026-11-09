import { catalog } from '@model/catalog';
import type { GroupKey, Lang } from '@model/catalog';
import { cadTypeForCommand, getCadType } from '@model/cad-types';
import type { AppContext } from './context';
import { OPTIONAL_GROUP_STORAGE_KEY, OPTIONAL_PALETTE_GROUPS, PLACE_DEFAULTS, INTERFACE_LANGUAGE_KEY } from './constants';

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

export function setupPalette(ctx: AppContext, deps: PaletteSetup): { renderPalette(): void } {
  const openPaletteGroups = new Set<string>();
  const renderPalette = (): void => {
    const query = deps.search.value.trim();
    const matches = query ? catalog.search(query) : catalog.components;
    const groupIsVisible = (key: GroupKey): boolean => !(OPTIONAL_PALETTE_GROUPS as readonly GroupKey[]).includes(key) || deps.visibleOptionalGroups.has(key);
    const visibleMatches = matches.filter((item) => item.groups.some(groupIsVisible));
    deps.count.textContent = deps.uiText().elementCount.replace('{count}', new Intl.NumberFormat(deps.paletteLang()).format(visibleMatches.length));
    deps.groups.replaceChildren();
    for (const group of catalog.groups) {
      try {
        if (!groupIsVisible(group.key)) continue;
        const items = matches.filter((item) => item.groups.includes(group.key));
        if (!items.length) continue;
        const section = document.createElement('details'); section.className = 'palette-group';
        section.open = Boolean(query) || openPaletteGroups.has(group.key);
        section.addEventListener('toggle', () => {
          if (query) return;
          if (section.open) openPaletteGroups.add(group.key); else openPaletteGroups.delete(group.key);
        });
        const toggle = document.createElement('summary'); toggle.className = 'palette-group-toggle';
        toggle.textContent = groupTitles[deps.paletteLang()]?.[group.key] ?? group.name;
        const countBadge = document.createElement('span'); countBadge.className = 'palette-count-badge'; countBadge.textContent = String(items.length);
        toggle.append(countBadge);
        const list = document.createElement('div'); list.className = 'palette-items';
        section.append(toggle, list);
        deps.groups.append(section);
        for (const item of items) {
          const mappedType = cadTypeForCommand(item.id);
          const cadType = mappedType && PLACE_DEFAULTS[mappedType.code] ? mappedType : undefined;
          const itemName = catalog.label(item, deps.paletteLang()).trim() || (deps.paletteLang() === 'ru' ? `Элемент ${item.id}` : String(item.id));
          const button = document.createElement('button'); button.type = 'button'; button.className = 'palette-item';
          const name = document.createElement('span'); name.className = 'palette-item-label'; name.textContent = itemName; button.append(name);
          const temporarilyVerified = group.key === 'fuses'
            || (group.key === 'power-sources' && ![32995, 33045, 33043, 32997, 33263].includes(item.id))
            || (group.key === 'power-electronics' && item.id === 33004)
            || (group.key === 'motors' && (item.id === 32828 || item.id === 32829))
            || (group.key === 'manual-controls' && ![32927, 32928, 32929, 32930].includes(item.id))
            || (group.key === 'coils-signaling' && item.id === 32949)
            || (group.key === 'contactors' && item.id !== 33392)
            || (group.key === 'protection' && item.id !== 33054 && item.id !== 33055);
          const verifiedText = deps.uiText().functionalityVerified ?? 'Функциональность элемента проверена';
          if (temporarilyVerified) {
            const badge = document.createElement('span'); badge.className = 'palette-verified-badge'; badge.textContent = '✓'; badge.title = verifiedText; badge.setAttribute('aria-label', verifiedText);
            button.append(badge);
          }
          button.setAttribute('aria-label', temporarilyVerified ? `${itemName} — ${deps.uiText().functionalityVerified}` : itemName);
          button.title = cadType ? `${itemName} · ${getCadType(cadType.code).label}` : `${itemName} · пока недоступно для размещения`;
          button.dataset.commandId = String(item.id);
          if (!cadType) { button.disabled = true; button.title += ' (нет соответствия с типом .cad)'; }
          else { button.draggable = true; button.setAttribute('aria-pressed', String(deps.activePaletteCommand() === item.id)); }
          button.addEventListener('click', () => {
            if (!cadType) return;
            deps.setActivePaletteCommand(item.id); deps.setPlacement(cadType.code); deps.resetPlacementRotation();
            deps.leaveNodeTool();
            if (deps.isWireDrawing()) deps.cancelWireDrawing();
            deps.svg.classList.add('is-placing'); renderPalette(); deps.drawGhost();
            deps.status.textContent = `Размещение: ${itemName} · щёлкните по листу или перетащите элемент; R — поворот, Esc — отмена.`;
          });
          button.addEventListener('dragstart', (event) => {
            if (!event.dataTransfer || !cadType) return;
            deps.setActivePaletteCommand(item.id); deps.setPlacement(cadType.code); deps.resetPlacementRotation();
            deps.leaveNodeTool();
            event.dataTransfer.setData('text/plain', String(item.id)); event.dataTransfer.effectAllowed = 'copy';
            deps.svg.classList.add('is-placing');
          });
          list.append(button);
        }
      } catch (error) {
        console.error(`Не удалось отобразить категорию ${group.key}`, error);
      }
    }
  };
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
