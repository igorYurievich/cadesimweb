import type { GroupKey } from '@model/catalog';
import { GRID_KEY, INTERFACE_LANGUAGE_KEY, OPTIONAL_GROUP_STORAGE_KEY, OPTIONAL_PALETTE_GROUPS, THEME_KEY, WIRE_COLOR_MODE_KEY } from './constants';
import type { Theme } from './constants';

export interface AppSettings {
  theme: Theme;
  gridVisible: boolean;
  uniformWireColors: boolean;
  visibleOptionalGroups: Set<GroupKey>;
}

export function readAppSettings(): AppSettings {
  return {
    theme: readTheme(),
    gridVisible: readGridVisible(),
    uniformWireColors: readUniformWireColors(),
    visibleOptionalGroups: new Set(readOptionalPaletteGroups()),
  };
}

export interface SettingsCommands {
  toggleTheme(refreshInterface: () => void): void;
  toggleGrid(refreshInterface: () => void): void;
  toggleWireColors(): void;
  updateWireColorsCommand(): void;
}

export function createSettingsCommands(
  root: HTMLElement,
  settings: AppSettings,
  uiText: () => { wireColorsUniform: string; wireColorsPerPhase: string },
  applySimulationVisuals: () => void,
): SettingsCommands {
  const themeCommand = root.querySelector<HTMLButtonElement>('#theme-command');
  const updateThemeCommand = (): void => {
    if (themeCommand) themeCommand.textContent = settings.theme === 'dark' ? 'Светлая тема' : 'Тёмная тема';
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
    if (gridCommand) gridCommand.textContent = settings.gridVisible ? 'Скрыть сетку' : 'Показать сетку';
  };
  const toggleGrid = (refreshInterface: () => void): void => {
    settings.gridVisible = !settings.gridVisible;
    applyGrid();
    refreshInterface();
    try { localStorage.setItem(GRID_KEY, settings.gridVisible ? 'on' : 'off'); } catch { /* Grid still toggles for this session. */ }
  };
  applyGrid();

  const wireColorsCommand = root.querySelector<HTMLButtonElement>('#wire-colors-command');
  const updateWireColorsCommand = (): void => {
    // Подпись показывает действующий режим; клик переключает на другой.
    if (wireColorsCommand) {
      const label = settings.uniformWireColors ? uiText().wireColorsUniform : uiText().wireColorsPerPhase;
      wireColorsCommand.textContent = `${label} ✓`;
    }
  };
  const toggleWireColors = (): void => {
    settings.uniformWireColors = !settings.uniformWireColors;
    updateWireColorsCommand();
    applySimulationVisuals();
    try {
      localStorage.setItem(WIRE_COLOR_MODE_KEY, settings.uniformWireColors ? 'uniform' : 'phase');
    } catch { /* Mode still works for this session. */ }
  };
  return { toggleTheme, toggleGrid, toggleWireColors, updateWireColorsCommand };
}

export function readOptionalPaletteGroups(): GroupKey[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(OPTIONAL_GROUP_STORAGE_KEY) ?? '[]');
    return Array.isArray(raw) ? OPTIONAL_PALETTE_GROUPS.filter((key) => raw.includes(key)) : [];
  } catch { return []; }
}

export function readGridVisible(): boolean {
  try { return localStorage.getItem(GRID_KEY) !== 'off'; } catch { return true; }
}

/** По умолчанию включён единый режим: красный — под напряжением, серый — нет. */
export function readUniformWireColors(): boolean {
  try { return localStorage.getItem(WIRE_COLOR_MODE_KEY) !== 'phase'; } catch { return true; }
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
