import { getCadType } from '@model/cad-types';
import type { Schema } from '@model/types';
import type { AppContext } from './context';
import type { Selectable } from './constants';
import { cloneSchema } from './helpers';
import type { InterfaceText } from './i18n';

export interface PropertiesPanelActions {
  applyPropertiesPanel(): void;
  closeFloatingProperties(): void;
  openFloatingProperties(clientX: number, clientY: number): void;
  toggleDockedProperties(): void;
}

export function setupPropertiesPanel(ctx: AppContext, uiText: () => InterfaceText): PropertiesPanelActions {
  const { root } = ctx;
  const PROPERTIES_PANEL_KEY = 'cadesimu-properties-panel';
  const propertiesPanel = root.querySelector<HTMLElement>('#properties-panel');
  const propertiesPanelCommand = root.querySelector<HTMLButtonElement>('#properties-panel-command');
  let propertiesDocked = (() => { try { return localStorage.getItem(PROPERTIES_PANEL_KEY) === 'on'; } catch { return false; } })();
  let propertiesFloating = false;
  const applyPropertiesPanel = (): void => {
    if (!propertiesPanel) return;
    const open = propertiesDocked || propertiesFloating;
    propertiesPanel.hidden = !open;
    propertiesPanel.classList.toggle('is-floating', open && !propertiesDocked);
    if (propertiesDocked) { propertiesPanel.style.left = ''; propertiesPanel.style.top = ''; }
    if (propertiesPanelCommand) propertiesPanelCommand.textContent = propertiesDocked ? uiText().propsHide : uiText().propsShow;
    const done = root.querySelector<HTMLElement>('#properties-close');
    if (done) done.textContent = uiText().propsDone;
  };
  const closeFloatingProperties = (): void => {
    if (!propertiesFloating) return;
    propertiesFloating = false;
    const active = document.activeElement;
    if (active instanceof HTMLElement && propertiesPanel?.contains(active)) active.blur();
    applyPropertiesPanel();
  };
  const openFloatingProperties = (clientX: number, clientY: number): void => {
    if (!propertiesPanel || propertiesDocked) return;
    propertiesFloating = true;
    applyPropertiesPanel();
    const margin = 8;
    const width = propertiesPanel.offsetWidth; const height = propertiesPanel.offsetHeight;
    const left = Math.max(margin, Math.min(clientX + 16, window.innerWidth - width - margin));
    const top = Math.max(margin, Math.min(clientY + 16, window.innerHeight - height - margin));
    propertiesPanel.style.left = `${left}px`; propertiesPanel.style.top = `${top}px`;
    propertiesPanel.querySelector<HTMLInputElement>('input, select')?.focus({ preventScroll: true });
  };
  const toggleDockedProperties = (): void => {
    propertiesDocked = !propertiesDocked;
    propertiesFloating = false;
    applyPropertiesPanel();
    try { localStorage.setItem(PROPERTIES_PANEL_KEY, propertiesDocked ? 'on' : 'off'); } catch { /* The panel still toggles for this session. */ }
  };
  root.querySelector('#properties-close')?.addEventListener('click', closeFloatingProperties);
  // Закрытие плавающего окна: клик вне его, Esc, Enter в поле. Правки уже записаны при вводе.
  window.addEventListener('pointerdown', (event) => {
    if (propertiesFloating && !(event.target as Element).closest?.('#properties-panel')) closeFloatingProperties();
  }, true);
  propertiesPanel?.addEventListener('keydown', (event) => {
    if (!propertiesFloating) return;
    if (event.key === 'Enter' || event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeFloatingProperties(); }
  });
  return { applyPropertiesPanel, closeFloatingProperties, openFloatingProperties, toggleDockedProperties };
}

export interface PropertyFieldsSetup {
  propertyFields: HTMLElement;
  selected: Map<string, Selectable>;
  uiText(): InterfaceText;
  renderSchema(): void;
  commitSchema(before: Schema): void;
  propertySnapshot(): Schema | undefined;
  setPropertySnapshot(value: Schema | undefined): void;
}

export function setupPropertyFields(ctx: AppContext, deps: PropertyFieldsSetup): { renderProperties(): void } {
  const renderProperties = (): void => {
    if (deps.propertyFields.contains(document.activeElement)) return;
    deps.propertyFields.replaceChildren();
    const note = (message: string): void => {
      const text = document.createElement('p'); text.className = 'property-empty'; text.textContent = message; deps.propertyFields.append(text);
    };
    if (deps.selected.size === 0) { note(deps.uiText().selectElement); return; }
    if (deps.selected.size > 1) { note(deps.uiText().selectedMany); return; }
    const item = deps.selected.values().next().value as Selectable | undefined;
    if (!item || item.kind !== 'element') { note(deps.uiText().noWireProperties); return; }
    const element = ctx.schema.elements.find((candidate) => candidate.id === item.id);
    if (!element) { note(deps.uiText().missingElement); return; }
    const info = getCadType(element.typeCode);
    const heading = document.createElement('p'); heading.className = 'property-type'; heading.textContent = `${info.label} · ${element.id}`; deps.propertyFields.append(heading);
    const addField = (labelText: string, value: string, update: (next: string) => void, options: { type?: string; min?: string; step?: string } = {}): HTMLInputElement => {
      const label = document.createElement('label'); label.className = 'property-field'; label.append(document.createTextNode(labelText));
      const input = document.createElement('input'); input.type = options.type ?? 'text'; input.value = value;
      if (options.min !== undefined) input.min = options.min;
      if (options.step !== undefined) input.step = options.step;
      input.addEventListener('focus', () => { if (!deps.propertySnapshot()) deps.setPropertySnapshot(cloneSchema(ctx.schema)); });
      input.addEventListener('input', () => { update(input.value); deps.renderSchema(); });
      input.addEventListener('blur', () => {
        const before = deps.propertySnapshot();
        if (before) deps.commitSchema(before);
        deps.setPropertySnapshot(undefined);
      });
      label.append(input); deps.propertyFields.append(label); return input;
    };
    addField(element.typeCode === 2009 ? deps.uiText().contactor1 : deps.uiText().name, element.name, (value) => { element.name = value; if (element.raw) element.raw.texts[0] = value; });
    addField(element.typeCode === 2009 ? deps.uiText().contactor2 : deps.uiText().function, element.func, (value) => { element.func = value; if (element.raw) element.raw.texts[1] = value; });
    const terminalsHeading = document.createElement('h3'); terminalsHeading.textContent = deps.uiText().terminals; deps.propertyFields.append(terminalsHeading);
    element.terminals.forEach((terminal, index) => addField(`${deps.uiText().terminal} ${index + 1}`, terminal.label, (value) => {
      terminal.label = value;
      if (element.raw) element.raw.texts[2 + index] = value;
    }));
    if (element.typeCode === 9008) {
      const colorField = document.createElement('label'); colorField.className = 'property-field'; colorField.append(document.createTextNode(deps.uiText().lampColor));
      const select = document.createElement('select');
      for (const [value, title] of [['0', deps.uiText().green], ['1', deps.uiText().red], ['2', deps.uiText().yellow]] as const) {
        const option = document.createElement('option'); option.value = value; option.textContent = title; select.append(option);
      }
      select.value = String(element.params.color ?? 0);
      select.addEventListener('focus', () => { if (!deps.propertySnapshot()) deps.setPropertySnapshot(cloneSchema(ctx.schema)); });
      select.addEventListener('change', () => {
        element.params.color = Number(select.value);
        element.params.extra = select.value;
        if (element.raw) element.raw.texts[2 + element.terminals.length] = select.value;
        deps.renderSchema();
      });
      select.addEventListener('blur', () => {
        const before = deps.propertySnapshot();
        if (before) deps.commitSchema(before);
        deps.setPropertySnapshot(undefined);
      });
      colorField.append(select); deps.propertyFields.append(colorField);
    }
    if (element.typeCode === 9004) {
      addField(deps.uiText().delay, String(element.params.time ?? 0), (value) => {
        const time = Number(value);
        if (Number.isFinite(time) && time >= 0) {
          element.params.time = time;
          element.params.extra = `${element.params.scale ?? 0}#${time}`;
          if (element.raw) {
            element.raw.texts[2 + element.terminals.length] = String(element.params.scale ?? 0);
            element.raw.texts[3 + element.terminals.length] = String(time);
          }
        }
      }, { type: 'number', min: '0', step: '0.1' });
    }
  };
  return { renderProperties };
}
