import type { GroupKey } from '@model/catalog';
import type { Schema } from '@model/types';
import { INTERFACE_TEXT } from './i18n';

export interface InterfaceTranslationSetup {
  root: HTMLElement; uiText(): typeof INTERFACE_TEXT.ru; visibleOptionalGroups: Set<GroupKey>;
  wireDrawing(): boolean; simulationMode(): 'edit' | 'run'; speedButton: HTMLButtonElement;
  gridVisible(): boolean; applyPropertiesPanel(): void; updateWireColorsCommand(): void;
  paletteSearch: HTMLInputElement; paletteLanguage: HTMLSelectElement; paletteLang(): string;
  zoomValue: HTMLOutputElement;
  schema(): Schema; fileName: HTMLElement;
}

export function setupInterfaceTranslation(deps: InterfaceTranslationSetup): () => void {
  const translate = (): void => {
    const t = deps.uiText();
    const language = deps.paletteLang();
    deps.root.lang = language;
    deps.root.dir = language === 'ar' ? 'rtl' : 'ltr';
    const set = (selector: string, value: string): void => { const el = deps.root.querySelector<HTMLElement>(selector); if (el) el.textContent = value; };
    const setButton = (selector: string, value: string): void => {
      const el = deps.root.querySelector<HTMLButtonElement>(selector);
      if (!el) return;
      const shortcut = el.querySelector('kbd');
      if (shortcut) { const firstText = [...el.childNodes].find((node) => node.nodeType === Node.TEXT_NODE); if (firstText) firstText.textContent = `${value} `; }
      else el.textContent = value;
    };
    const summaries = [...deps.root.querySelectorAll<HTMLElement>('.app-menu > .menu-group > summary')];
    [t.file, t.edit, t.view, t.elementsMenu, t.language, t.examples, t.help].forEach((value, index) => { if (summaries[index]) summaries[index]!.textContent = value; });
    const commandLabels: Array<[string, string]> = [
      ['new', t.new], ['open', t.open], ['save-json', t.save], ['export-cad', t.export], ['export-svg', t.exportSvg], ['export-png', t.exportPng], ['print-pdf', t.printPdf], ['sheet', t.sheet],
      ['copy-selection', t.copy], ['paste-selection', t.paste], ['undo', t.undo], ['redo', t.redo], ['rotate', t.rotate], ['delete', t.delete],
      ['zoom-in', t.zoomIn], ['zoom-out', t.zoomOut], ['fit', t.fit], ['shortcuts', t.shortcuts], ['about', t.about],
    ];
    for (const [command, label] of commandLabels) setButton(`[data-command="${command}"]`, label);
    set('.optional-groups-heading', t.optionalGroups);
    const extraLabelKeys: Record<string, string> = { grafcet: 'extraGrafcet', ladder: 'extraLadder', logic: 'extraLogic', 'realistic-2d': 'extraReal2d', 'realistic-3d': 'extraReal3d', wiring: 'extraWiring', pneumatics: 'extraPneumatics', 'io-plc': 'extraIoPlc', 'power-electronics': 'extraPowerElectronics', 'electronic-relays': 'extraElectronicRelays' };
    for (const input of [...deps.root.querySelectorAll<HTMLInputElement>('[data-optional-group]')]) {
      const key = input.dataset.optionalGroup as GroupKey;
      input.checked = deps.visibleOptionalGroups.has(key);
      const labelKey = extraLabelKeys[key] as keyof typeof INTERFACE_TEXT.ru | undefined;
      const label = input.parentElement?.querySelector<HTMLElement>('[data-extra-label]');
      if (label && labelKey) label.textContent = t[labelKey]!;
    }
    const languageLabel = deps.root.querySelector<HTMLElement>('.menu-language');
    if (languageLabel?.firstChild) languageLabel.firstChild.textContent = `${t.languageNames} `;
    const options: Record<string, string> = { phase: t.phase, neutral: t.neutral, protection: 'PE', three: t.three, threeN: t.threeN };
    for (const option of [...deps.root.querySelectorAll<HTMLOptionElement>('#wire-kind option')]) option.textContent = options[option.value] ?? option.textContent;
    set('#draw-wire', deps.wireDrawing() ? t.cancel : t.wire);
    deps.root.querySelector<HTMLButtonElement>('#draw-wire')?.setAttribute('title', `${deps.wireDrawing() ? t.cancel : t.wire} (C)`);
    set('#finish-wire', t.done);
    deps.root.querySelector<HTMLButtonElement>('#undo')?.setAttribute('aria-label', t.undo);
    deps.root.querySelector<HTMLButtonElement>('#undo')?.setAttribute('title', t.undo);
    deps.root.querySelector<HTMLButtonElement>('#redo')?.setAttribute('aria-label', t.redo);
    deps.root.querySelector<HTMLButtonElement>('#redo')?.setAttribute('title', t.redo);
    deps.root.querySelector<HTMLButtonElement>('#select-tool')?.setAttribute('aria-label', t.cursor);
    deps.root.querySelector<HTMLButtonElement>('#select-tool')?.setAttribute('title', t.cursor);
    deps.root.querySelector<HTMLButtonElement>('#pan-tool')?.setAttribute('aria-label', t.hand);
    deps.root.querySelector<HTMLButtonElement>('#pan-tool')?.setAttribute('title', t.hand);
    deps.root.querySelector<HTMLButtonElement>('#node-tool')?.setAttribute('aria-label', t.node);
    deps.root.querySelector<HTMLButtonElement>('#node-tool')?.setAttribute('title', t.node);
    set('#sim-run', `▶ ${t.run}`); set('#sim-stop', `■ ${t.stop}`);
    deps.root.querySelector<HTMLButtonElement>('#sim-stop')?.setAttribute('title', t.stopTitle);
    set('#sim-state', deps.simulationMode() === 'run' ? t.run : t.editor);
    set('#speed-cycle', deps.speedButton.textContent === '1×' ? '1×' : deps.speedButton.textContent ?? '1×');
    deps.speedButton.setAttribute('aria-label', `${t.speed}: ${deps.speedButton.textContent}`);
    deps.speedButton.title = t.speed;
    set('#rotate-selection', t.rotate); set('#delete-selection', t.delete);
    set('[data-zoom="fit"]', t.showAll);
    set('.palette-heading h2', t.elements);
    deps.paletteSearch.placeholder = t.search; deps.paletteSearch.setAttribute('aria-label', t.search.replace(/…$/, ''));
    set('#properties-panel h2', t.properties);
    set('#status', t.status); deps.zoomValue.title = t.zoom;
    set('.viewport-help', t.helpCanvas);
    deps.root.querySelector<HTMLElement>('.brand-lockup')?.setAttribute('title', t.aboutText);
    const wireSelect = deps.root.querySelector<HTMLSelectElement>('#wire-kind'); if (wireSelect) wireSelect.setAttribute('aria-label', t.wireType);
    const toolbar = deps.root.querySelector<HTMLElement>('.viewport-toolbar'); toolbar?.setAttribute('aria-label', t.wiresSimulation);
    deps.root.querySelector<HTMLElement>('.wire-controls')?.setAttribute('aria-label', t.wires);
    deps.root.querySelector<HTMLElement>('.simulation-controls')?.setAttribute('aria-label', t.simulation);
    deps.root.querySelector<HTMLElement>('.simulation-speed')?.setAttribute('aria-label', t.speed);
    deps.root.querySelector<HTMLElement>('.component-palette')?.setAttribute('aria-label', t.elements);
    deps.root.querySelector<HTMLElement>('.properties-panel')?.setAttribute('aria-label', t.properties);
    deps.root.querySelector<SVGSVGElement>('.viewport-svg')?.setAttribute('aria-label', t.schematic);
    const theme = deps.root.querySelector<HTMLButtonElement>('#theme-command');
    if (theme) theme.textContent = deps.root.dataset.theme === 'dark' ? t.themeLight : t.themeDark;
    const grid = deps.root.querySelector<HTMLButtonElement>('#grid-command');
    if (grid) grid.textContent = deps.gridVisible() ? t.gridHide : t.gridShow;
    deps.applyPropertiesPanel();
    deps.updateWireColorsCommand();
    const sheetDialog = deps.root.querySelector<HTMLDialogElement>('#sheet-dialog');
    if (sheetDialog) {
      set('#sheet-title', t.sheetSize);
      const formatLabel = sheetDialog.querySelector('label'); if (formatLabel?.firstChild) formatLabel.firstChild.textContent = `${t.format} `;
      const formatOptions: Record<string, string> = { custom: t.custom, '279x210': `A4 — ${t.landscape}`, '210x279': `A4 — ${t.portrait}`, '420x297': `A3 — ${t.landscape}`, '297x420': `A3 — ${t.portrait}` };
      for (const option of [...sheetDialog.querySelectorAll<HTMLOptionElement>('option')]) option.textContent = formatOptions[option.value] ?? option.textContent;
      const labels = [...sheetDialog.querySelectorAll('label.property-field')];
      if (labels[1]?.firstChild) labels[1]!.firstChild!.textContent = `${t.width}`;
      if (labels[2]?.firstChild) labels[2]!.firstChild!.textContent = `${t.height}`;
      setButton('#sheet-apply', t.apply);
    }
    const newDialog = deps.root.querySelector<HTMLDialogElement>('#confirm-new-dialog');
    if (newDialog) { set('#confirm-new-title', t.newTitle); set('#confirm-new-dialog p', t.newWarning); setButton('#confirm-new', t.create); }
    const shortcutsDialog = deps.root.querySelector<HTMLDialogElement>('#shortcuts-dialog'); if (shortcutsDialog) {
      set('#shortcuts-title', t.shortcutsTitle);
      const shortcutLabels: Array<[string, string]> = [
        ['#shortcut-new', t.shortcutNew], ['#shortcut-open', t.shortcutOpen], ['#shortcut-copy-paste', t.shortcutCopyPaste],
        ['#shortcut-undo-redo', t.shortcutUndoRedo], ['#shortcut-rotate', t.shortcutRotate], ['#shortcut-delete', t.shortcutDelete],
        ['#shortcut-wire', t.shortcutWire], ['#shortcut-wire-type', t.shortcutWireType], ['#shortcut-finish', t.shortcutFinish],
        ['#shortcut-cursor-pan', t.shortcutCursorPan], ['#shortcut-panning', t.shortcutPanning], ['#shortcut-zoom', t.shortcutZoom], ['#shortcut-fit', t.shortcutFit],
      ];
      for (const [selector, label] of shortcutLabels) set(selector, label);
    }
    const aboutDialog = deps.root.querySelector<HTMLDialogElement>('#about-dialog'); if (aboutDialog) { set('#about-dialog p', t.aboutText); set('#about-bio', t.aboutBio); set('#about-noncommercial', t.aboutNonCommercial); set('#about-contact-label', t.aboutContact); const fields = aboutDialog.querySelectorAll('dt'); if (fields[0]) fields[0]!.textContent = t.author; if (fields[1]) fields[1]!.textContent = t.version; }
    for (const button of [...deps.root.querySelectorAll<HTMLButtonElement>('[data-dialog-close]')]) button.textContent = t.close;
    set('#beta-title', t.betaTitle); set('#beta-text', t.betaText); set('#beta-ok', t.betaOk);
    set('#simulate-overload', t.overload); set('#reset-simulation-inputs', t.reset);
    for (const option of [...deps.root.querySelectorAll<HTMLOptionElement>('#palette-language option')]) option.selected = option.value === deps.paletteLang();
    deps.paletteLanguage.setAttribute('aria-label', t.languageNames);
    const fname = deps.schema().sheet.fileName || t.new;
    deps.fileName.textContent = fname;
  };
  return translate;
}
