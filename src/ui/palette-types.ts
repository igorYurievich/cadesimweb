import type { ComponentDef, ComponentGroup, GroupKey, Lang } from '@model/catalog';
import type { InterfaceText } from './i18n';

/** Что палитре нужно от остального приложения (передаёт app-setup-editor). */
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
  uiText(): InterfaceText;
  leaveNodeTool(): void;
  isWireDrawing(): boolean;
  cancelWireDrawing(): void;
  drawGhost(): void;
  translateInterface(): void;
  renderProperties(): void;
}

/** Категория палитры и её видимые сейчас элементы. */
export interface PaletteGroupItems {
  group: ComponentGroup;
  items: ComponentDef[];
}
