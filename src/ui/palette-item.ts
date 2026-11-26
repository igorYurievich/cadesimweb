import { catalog } from '@model/catalog';
import type { ComponentDef, GroupKey } from '@model/catalog';
import { cadTypeForCommand } from '@model/cad-types';
import { hasVerifiedBadge } from '@model/catalog-verification';
import { createPlacedElement } from './helpers';
import { currentText, fillText } from './i18n';
import { createElementSymbol } from './symbols';
import { createBigPaletteIcon } from './big-icons';
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
import type { PaletteSetup } from './palette-types';
import { PLACE_DEFAULTS } from './constants';

/** Как показана кнопка элемента: строка списка, значок старой панели CADe или крупная плитка. */
export type PaletteItemMode = 'list' | 'icons' | 'grid';

export function createPaletteItem(
  item: ComponentDef,
  group: GroupKey,
  ctx: AppContext,
  deps: PaletteSetup,
  mode: PaletteItemMode,
  renderPalette: () => void,
): HTMLButtonElement {
  const mappedType = cadTypeForCommand(item.id);
  const cadType = mappedType && PLACE_DEFAULTS[mappedType.code] ? mappedType : undefined;
  const itemName = catalog.label(item, deps.paletteLang()).trim()
    || fillText(currentText().elementWithId, { id: item.id });
  const button = document.createElement('button');
  button.type = 'button';
  button.className = mode === 'grid' ? 'palette-item palette-tile' : 'palette-item';
  button.dataset.commandId = String(item.id);
  if (mode === 'grid') button.append(createTileIcon(item, cadType?.code, group, ctx));
  else if (mode === 'icons' && cadType) button.append(createPaletteItemSymbol(item, cadType.code, group, ctx));
  const name = document.createElement('span');
  name.className = 'palette-item-label';
  name.textContent = itemName;
  button.append(name);
  addPaletteBadge(button, item, group, itemName, deps);
  button.title = cadType ? itemName : fillText(currentText().notPlaceable, { name: itemName });
  if (!cadType) {
    button.disabled = true;
    button.title += ` (${currentText().noCadType})`;
  } else {
    button.draggable = true;
    button.setAttribute('aria-pressed', String(deps.activePaletteCommand() === item.id));
    addPlacementHandlers(button, item, cadType.code, itemName, deps, renderPalette);
  }
  if (mode === 'grid') {
    // Крупная подсказка вместо мелкой системной (palette-tooltip.ts читает data-tip).
    button.dataset.tip = button.title;
    button.removeAttribute('title');
  }
  return button;
}

/** Плитка: упрощённый крупный значок; пока его нет — обычный значок палитры. */
function createTileIcon(item: ComponentDef, typeCode: number | undefined, group: GroupKey, ctx: AppContext): Element {
  const big = createBigPaletteIcon(item.id);
  if (big) return big;
  if (typeCode !== undefined) return createPaletteItemSymbol(item, typeCode, group, ctx);
  const empty = document.createElement('span');
  empty.className = 'palette-symbol';
  return empty;
}

function addPaletteBadge(
  button: HTMLButtonElement,
  item: ComponentDef,
  group: GroupKey,
  itemName: string,
  deps: PaletteSetup,
): void {
  const verified = hasVerifiedBadge(group, item.id);
  const verifiedText = deps.uiText().functionalityVerified;
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
    // Повторный клик по выбранному элементу отменяет выбор, как Esc.
    if (deps.activePaletteCommand() === item.id && deps.svg.classList.contains('is-placing')) {
      deps.setActivePaletteCommand(undefined);
      deps.setPlacement(undefined);
      deps.resetPlacementRotation();
      deps.svg.classList.remove('is-placing');
      renderPalette();
      deps.drawGhost();
      deps.status.textContent = currentText().placementEnded;
      return;
    }
    setPlacement();
    if (deps.isWireDrawing()) deps.cancelWireDrawing();
    deps.svg.classList.add('is-placing');
    renderPalette();
    deps.drawGhost();
    deps.status.textContent = fillText(currentText().placingHint, { name: itemName });
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

export function createPaletteItemSymbol(
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
