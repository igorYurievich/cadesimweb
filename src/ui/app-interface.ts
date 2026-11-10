import type { Schema } from '@model/types';
import type { Lang } from '@model/catalog';
import type { AppSettings, SettingsCommands } from './settings';
import { createSettingsCommands } from './settings';
import { setupInterfaceTranslation } from './interface-translation';
import type { SimulationController } from './sim-controller';
import type { INTERFACE_TEXT } from './i18n';

export interface AppInterfaceOptions {
  root: HTMLElement;
  settings: AppSettings;
  uiText: () => typeof INTERFACE_TEXT.ru;
  simulation: SimulationController;
  wireDrawing: () => boolean;
  speedButton: HTMLButtonElement;
  applyPropertiesPanel: () => void;
  paletteSearch: HTMLInputElement;
  paletteLanguage: HTMLSelectElement;
  paletteLang: () => Lang;
  zoomValue: HTMLOutputElement;
  schema: () => Schema;
  fileName: HTMLSpanElement;
}

export interface AppInterface {
  translateInterface: () => void;
  toggleTheme: () => void;
  toggleGrid: () => void;
  toggleWireColors: SettingsCommands['toggleWireColors'];
}

export function setupAppInterface(options: AppInterfaceOptions): AppInterface {
  const settingsCommands = createSettingsCommands(
    options.root,
    options.settings,
    options.uiText,
    options.simulation.applySimulationVisuals,
  );
  const translateInterface = setupInterfaceTranslation({
    root: options.root,
    uiText: options.uiText,
    visibleOptionalGroups: options.settings.visibleOptionalGroups,
    wireDrawing: options.wireDrawing,
    simulationMode: () => options.simulation.mode,
    speedButton: options.speedButton,
    gridVisible: () => options.settings.gridVisible,
    applyPropertiesPanel: options.applyPropertiesPanel,
    updateWireColorsCommand: settingsCommands.updateWireColorsCommand,
    paletteSearch: options.paletteSearch,
    paletteLanguage: options.paletteLanguage,
    paletteLang: options.paletteLang,
    zoomValue: options.zoomValue,
    schema: options.schema,
    fileName: options.fileName,
  });
  translateInterface();
  return {
    translateInterface,
    toggleTheme: () => settingsCommands.toggleTheme(translateInterface),
    toggleGrid: () => settingsCommands.toggleGrid(translateInterface),
    toggleWireColors: settingsCommands.toggleWireColors,
  };
}
