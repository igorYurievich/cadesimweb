import { updateFullscreenButton } from './fullscreen';
import { renderWireButton } from './wire-button';
import type { GroupKey } from '@model/catalog';
import type { Schema } from '@model/types';
import { countVerifiedCatalogComponents } from '@model/catalog-verification';
import type { InterfaceText } from './i18n';

export interface InterfaceTranslationSetup {
  root: HTMLElement; uiText(): InterfaceText; visibleOptionalGroups: Set<GroupKey>;
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
    const set = (selector: string, value: string): void => { const el = deps.root.querySelector<HTMLElement>(selector); if (el) el.textContent = value; };
    const setButton = (selector: string, value: string): void => {
      const el = deps.root.querySelector<HTMLButtonElement>(selector);
      if (!el) return;
      const shortcut = el.querySelector('kbd');
      if (shortcut) { const firstText = [...el.childNodes].find((node) => node.nodeType === Node.TEXT_NODE); if (firstText) firstText.textContent = `${value} `; }
      else el.textContent = value;
    };
    const summaries = [...deps.root.querySelectorAll<HTMLElement>('.app-menu > .menu-group > summary')];
    [t.file, t.edit, t.view, t.elementsMenu, t.language, t.examples, t.help, t.options].forEach((value, index) => { if (summaries[index]) summaries[index]!.textContent = value; });
    set('#palette-view-title', t.paletteViewTitle);
    const iconView = deps.root.dataset.paletteView === 'icons';
    const listViewButton = deps.root.querySelector<HTMLButtonElement>('#palette-view-list');
    const iconViewButton = deps.root.querySelector<HTMLButtonElement>('#palette-view-icons');
    if (listViewButton) {
      listViewButton.textContent = `${t.paletteViewList}${iconView ? '' : ' ✓'}`;
      listViewButton.classList.toggle('is-selected', !iconView);
    }
    if (iconViewButton) {
      iconViewButton.textContent = `${t.paletteViewIcons}${iconView ? ' ✓' : ''}`;
      iconViewButton.classList.toggle('is-selected', iconView);
    }
    const commandLabels: Array<[string, string]> = [
      ['new', t.new], ['open', t.open], ['save-json', t.save], ['export-cad', t.export], ['export-svg', t.exportSvg], ['export-png', t.exportPng], ['print-preview', t.printPreview], ['print-pdf', t.printPdf], ['sheet', t.sheet],
      ['copy-selection', t.copy], ['cut-selection', t.cut], ['paste-selection', t.paste], ['undo', t.undo], ['redo', t.redo], ['rotate', t.rotate], ['delete', t.delete],
      ['zoom-in', t.zoomIn], ['zoom-out', t.zoomOut], ['fit', t.fit], ['shortcuts', t.shortcuts], ['component-guide', t.componentGuide], ['about', t.about],
    ];
    for (const [command, label] of commandLabels) setButton(`[data-command="${command}"]`, label);
    set('#export-menu-label', t.exportMenu);
    set('.optional-groups-heading', t.optionalGroups);
    const extraLabelKeys: Record<string, string> = { grafcet: 'extraGrafcet', ladder: 'extraLadder', logic: 'extraLogic', 'realistic-2d': 'extraReal2d', 'realistic-3d': 'extraReal3d', wiring: 'extraWiring', pneumatics: 'extraPneumatics', 'io-plc': 'extraIoPlc', 'power-electronics': 'extraPowerElectronics', 'electronic-relays': 'extraElectronicRelays', sensors: 'extraSensors',
      mechanisms: 'extraMechanisms', installations: 'extraInstallations' };
    for (const input of [...deps.root.querySelectorAll<HTMLInputElement>('[data-optional-group]')]) {
      const key = input.dataset.optionalGroup as GroupKey;
      input.checked = deps.visibleOptionalGroups.has(key);
      const labelKey = extraLabelKeys[key] as keyof InterfaceText | undefined;
      const label = input.parentElement?.querySelector<HTMLElement>('[data-extra-label]');
      if (label && labelKey) label.textContent = t[labelKey]!;
    }
    const languageLabel = deps.root.querySelector<HTMLElement>('.menu-language');
    if (languageLabel?.firstChild) languageLabel.firstChild.textContent = `${t.languageNames} `;
    const options: Record<string, string> = { phase: t.phase, neutral: t.neutral, protection: 'PE', three: t.three, threeN: t.threeN, positive: t.wirePositive, negative: t.wireNegative };
    for (const option of [...deps.root.querySelectorAll<HTMLOptionElement>('#wire-kind option')]) option.textContent = options[option.value] ?? option.textContent;
    const wireButton = deps.root.querySelector<HTMLButtonElement>('#draw-wire');
    if (wireButton) renderWireButton(wireButton, deps.wireDrawing(), t);
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
    deps.root.querySelector<HTMLButtonElement>('#wire-trace-tool')?.setAttribute('aria-label', t.wireTrace);
    deps.root.querySelector<HTMLButtonElement>('#wire-trace-tool')?.setAttribute('title', t.wireTrace);
    set('#option-breakers-trip-cc-label', t.optionBreakersTripCc);
    // Кнопки симуляции — только значки (SVG в app-shell.ts); название — в подсказке и для экранных дикторов.
    deps.root.querySelector<HTMLButtonElement>('#sim-run')?.setAttribute('title', t.run);
    deps.root.querySelector<HTMLButtonElement>('#sim-run')?.setAttribute('aria-label', t.run);
    deps.root.querySelector<HTMLButtonElement>('#sim-stop')?.setAttribute('aria-label', t.stop);
    deps.root.querySelector<HTMLButtonElement>('#sim-stop')?.setAttribute('title', t.stopTitle);
    const simState = deps.root.querySelector<HTMLElement>('#sim-state')?.dataset.mode;
    set('#sim-state', simState === 'pause' ? t.paused : deps.simulationMode() === 'run' ? t.running : t.editor);
    deps.root.querySelector<HTMLButtonElement>('#sim-pause')?.setAttribute('title', t.pauseTitle);
    deps.root.querySelector<HTMLButtonElement>('#sim-pause')?.setAttribute('aria-label', t.pause);
    set('#speed-cycle', deps.speedButton.textContent === '1×' ? '1×' : deps.speedButton.textContent ?? '1×');
    deps.speedButton.setAttribute('aria-label', `${t.speed}: ${deps.speedButton.textContent}`);
    deps.speedButton.title = t.speed;
    set('#rotate-selection', t.rotate); set('#delete-selection', t.delete);
    set('[data-zoom="fit"]', t.showAll);
    set('.palette-heading h2', t.elements); set('#palette-toggle-label', t.elements);
    deps.paletteSearch.placeholder = t.search; deps.paletteSearch.setAttribute('aria-label', t.search.replace(/…$/, ''));
    set('#properties-panel h2', t.properties);
    set('#status', t.status); deps.zoomValue.title = t.zoom;
    set('.viewport-help', t.helpCanvas);
    deps.root.querySelector<HTMLElement>('.brand-lockup')?.setAttribute('title', t.aboutText);
    const wireSelect = deps.root.querySelector<HTMLSelectElement>('#wire-kind'); if (wireSelect) wireSelect.setAttribute('aria-label', t.wireType);
    set('#wire-thickness-label', t.wireThicknessShort);
    const wireThicknessSelect = deps.root.querySelector<HTMLSelectElement>('#wire-thickness');
    if (wireThicknessSelect) { wireThicknessSelect.setAttribute('aria-label', t.wireThickness); wireThicknessSelect.title = t.wireThickness; }
    const toolbar = deps.root.querySelector<HTMLElement>('.viewport-toolbar'); toolbar?.setAttribute('aria-label', t.wiresSimulation);
    deps.root.querySelector<HTMLElement>('.wire-controls')?.setAttribute('aria-label', t.wires);
    deps.root.querySelector<HTMLElement>('.simulation-controls')?.setAttribute('aria-label', t.simulation);
    deps.root.querySelector<HTMLElement>('.simulation-speed')?.setAttribute('aria-label', t.speed);
    deps.root.querySelector<HTMLElement>('.component-palette')?.setAttribute('aria-label', t.elements);
    deps.root.querySelector<HTMLElement>('.properties-panel')?.setAttribute('aria-label', t.properties);
    deps.root.querySelector<SVGSVGElement>('.viewport-svg')?.setAttribute('aria-label', t.schematic);
    deps.root.querySelector<HTMLElement>('.viewport-stage')?.setAttribute('aria-label', t.schematic);
    deps.root.querySelector<HTMLElement>('.app-menu')?.setAttribute('aria-label', t.mainMenu);
    deps.root.querySelector<HTMLElement>('#document-tabs')?.setAttribute('aria-label', t.openDocuments);
    deps.root.querySelector<HTMLElement>('#place-type')?.setAttribute('aria-label', t.place);
    deps.root.querySelector<HTMLElement>('#cursor-coords')?.setAttribute('title', t.cursorCoords);
    const theme = deps.root.querySelector<HTMLButtonElement>('#theme-command');
    if (theme) theme.textContent = deps.root.dataset.theme === 'dark' ? t.themeLight : t.themeDark;
    updateFullscreenButton(deps.root, t);
    set('#print-preview-title', t.printPreview); setButton('#print-preview-print', t.printPdf); setButton('#print-preview-close', t.close);
    const grid = deps.root.querySelector<HTMLButtonElement>('#grid-command');
    if (grid) grid.textContent = deps.gridVisible() ? t.gridHide : t.gridShow;
    deps.applyPropertiesPanel();
    deps.updateWireColorsCommand();
    const sheetDialog = deps.root.querySelector<HTMLDialogElement>('#sheet-dialog');
    if (sheetDialog) {
      set('#sheet-title', t.sheetSize);
      const formatLabel = sheetDialog.querySelector('label'); if (formatLabel?.firstChild) formatLabel.firstChild.textContent = `${t.format} `;
      const formatOptions: Record<string, string> = { custom: t.custom, '297x210': `A4 — ${t.landscape}`, '210x297': `A4 — ${t.portrait}`, '420x297': `A3 — ${t.landscape}`, '297x420': `A3 — ${t.portrait}` };
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
      set('#shortcut-drag', t.shortcutDrag);
    }
    const componentGuide = deps.root.querySelector<HTMLDialogElement>('#component-guide-dialog'); if (componentGuide) {
      set('#component-guide-title', t.componentGuideTitle);
      set('#component-guide-verified-label', t.componentGuideVerifiedLabel);
      set('#component-guide-verified-text', t.componentGuideVerifiedText);
      set('#component-guide-unverified-text', t.componentGuideUnverifiedText);
      set('#component-guide-count', t.componentGuideCount.replace('{count}', new Intl.NumberFormat(language).format(countVerifiedCatalogComponents())));
    }
    const examplesDialog = deps.root.querySelector<HTMLDialogElement>('#examples-dialog'); if (examplesDialog) {
      set('#examples-dialog-title', t.examples);
      for (const title of examplesDialog.querySelectorAll<HTMLElement>('[data-examples-author]')) title.textContent = t.examplesAuthor;
      const count = Number(examplesDialog.querySelector<HTMLElement>('#examples-count')?.dataset.visibleCount ?? examplesDialog.querySelectorAll('.example-file').length);
      set('#examples-count', t.examplesCount.replace('{count}', new Intl.NumberFormat(language).format(count)));
      examplesDialog.querySelector<HTMLElement>('.example-groups')?.setAttribute('aria-label', t.examples);
      examplesDialog.querySelector<HTMLButtonElement>('.examples-window-close')?.setAttribute('aria-label', t.close);
    }
    set('#cad-export-warning-title', t.cadExportWarningTitle);
    set('#cad-export-warning-text', t.cadExportWarningText);
    set('#cad-export-warning-optout-label', t.cadExportWarningOptout);
    set('#cad-export-warning-cancel', t.cadExportWarningCancel);
    set('#cad-export-warning-confirm', t.cadExportWarningConfirm);
    const aboutDialog = deps.root.querySelector<HTMLDialogElement>('#about-dialog'); if (aboutDialog) { set('#about-bio', t.aboutBio); set('#about-study', t.aboutStudy); set('#about-thanks', t.aboutThanks); set('#about-support-label', t.supportKofi); set('#about-contact-label', t.aboutContact); const fields = aboutDialog.querySelectorAll('dt'); if (fields[0]) fields[0]!.textContent = t.version; }
    for (const button of [...deps.root.querySelectorAll<HTMLButtonElement>('[data-dialog-close]')]) {
      if (button.id === 'cad-export-warning-cancel') button.textContent = t.cadExportWarningCancel;
      else if (button.classList.contains('examples-window-close')) { button.textContent = '×'; button.setAttribute('aria-label', t.close); }
      else button.textContent = t.close;
    }
    set('#unsaved-close-title', t.unsavedTitle); set('[data-close-choice="save"]', t.unsavedSave);
    set('[data-close-choice="discard"]', t.unsavedDiscard); set('[data-close-choice="cancel"]', t.cancel);
    set('#beta-title', t.betaTitle); set('#beta-text', t.betaText); set('#beta-ok', t.betaOk);
    set('#simulate-overload', t.overload); set('#reset-simulation-inputs', t.reset);
    for (const option of [...deps.root.querySelectorAll<HTMLOptionElement>('#palette-language option')]) option.selected = option.value === deps.paletteLang();
    for (const button of deps.root.querySelectorAll<HTMLElement>('.language-option')) {
      const active = button.dataset.lang === deps.paletteLang();
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-checked', String(active));
    }
    deps.paletteLanguage.setAttribute('aria-label', t.languageNames);
    const fname = deps.schema().sheet.fileName || t.new;
    deps.fileName.textContent = fname;
  };
  return translate;
}
