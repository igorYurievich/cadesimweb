import type { GroupKey } from '@model/catalog';
import {
  GRID_KEY, HIDDEN_OPTIONAL_GROUPS, INTERFACE_LANGUAGE_KEY, OPTIONAL_GROUP_STORAGE_KEY, OPTIONAL_PALETTE_GROUPS, THEME_KEY,
} from './constants';
import type { Theme } from './constants';
import type { InterfaceText } from './i18n';

/** Доп. категории, включённые по умолчанию; в OPTIONAL_GROUP_OFF_KEY — те из них, что пользователь выключил сам. */
const DEFAULT_ON_OPTIONAL_GROUPS: readonly GroupKey[] = [
  'realistic-2d', 'io-plc', 'power-electronics', 'electronic-relays', 'sensors',
];
const OPTIONAL_GROUP_OFF_KEY = 'cadesimu-optional-groups-off:v1';

export interface AppSettings {
  theme: Theme;
  gridVisible: boolean;
  visibleOptionalGroups: Set<GroupKey>;
}

export function readAppSettings(): AppSettings {
  return {
    theme: readTheme(),
    gridVisible: readGridVisible(),
    visibleOptionalGroups: new Set(readOptionalPaletteGroups()),
  };
}

export interface SettingsCommands {
  toggleTheme(refreshInterface: () => void): void;
  toggleGrid(refreshInterface: () => void): void;
}

export function createSettingsCommands(
  root: HTMLElement,
  settings: AppSettings,
  uiText: () => Pick<InterfaceText, 'themeLight' | 'themeDark' | 'gridHide' | 'gridShow'>,
): SettingsCommands {
  const themeCommand = root.querySelector<HTMLButtonElement>('#theme-command');
  const updateThemeCommand = (): void => {
    if (themeCommand) themeCommand.textContent = settings.theme === 'dark' ? uiText().themeLight : uiText().themeDark;
  };
  updateThemeCommand();
  const toggleTheme = (refreshInterface: () => void): void => {
    settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = settings.theme;
    updateThemeCommand();
    refreshInterface();
    try { localStorage.setItem(THEME_KEY, settings.theme); } catch { /* Theme still works for this session. */ }
  };

  const gridCommand = root.querySelector<HTMLButtonElement>('#grid-command');
  const applyGrid = (): void => {
    root.querySelector<SVGRectElement>('#sheet-grid')?.setAttribute('visibility', settings.gridVisible ? 'visible' : 'hidden');
    if (gridCommand) gridCommand.textContent = settings.gridVisible ? uiText().gridHide : uiText().gridShow;
  };
  const toggleGrid = (refreshInterface: () => void): void => {
    settings.gridVisible = !settings.gridVisible;
    applyGrid();
    refreshInterface();
    try { localStorage.setItem(GRID_KEY, settings.gridVisible ? 'on' : 'off'); } catch { /* Grid still toggles for this session. */ }
  };
  applyGrid();

  return { toggleTheme, toggleGrid };
}

export function readOptionalPaletteGroups(): GroupKey[] {
  const read = (key: string): unknown[] => {
    try {
      const raw: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
      return Array.isArray(raw) ? raw : [];
    } catch { return []; }
  };
  const on = read(OPTIONAL_GROUP_STORAGE_KEY);
  const off = read(OPTIONAL_GROUP_OFF_KEY);
  // Убранная категория не показывается, даже если раньше была включена; категории «по умолчанию» видны,
  // пока пользователь сам их не выключил.
  return OPTIONAL_PALETTE_GROUPS.filter((key) => !HIDDEN_OPTIONAL_GROUPS.includes(key)
    && (on.includes(key) || (DEFAULT_ON_OPTIONAL_GROUPS.includes(key) && !off.includes(key))));
}

export function writeOptionalPaletteGroups(visible: ReadonlySet<GroupKey>): void {
  try {
    localStorage.setItem(OPTIONAL_GROUP_STORAGE_KEY, JSON.stringify([...visible]));
    localStorage.setItem(OPTIONAL_GROUP_OFF_KEY, JSON.stringify(DEFAULT_ON_OPTIONAL_GROUPS.filter((key) => !visible.has(key))));
  } catch { /* Выбор действует до закрытия вкладки. */ }
}

export function readGridVisible(): boolean {
  try { return localStorage.getItem(GRID_KEY) !== 'off'; } catch { return true; }
}

export function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* Storage may be unavailable in private or embedded contexts. */ }
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function readInterfaceLanguage(): 'es' | 'en' | 'it' | 'ru' | 'fr' {
  try {
    const saved = localStorage.getItem(INTERFACE_LANGUAGE_KEY);
    return saved === 'es' || saved === 'en' || saved === 'it'
      || saved === 'ru' || saved === 'fr' ? saved : 'es';
  } catch { return 'es'; }
}
