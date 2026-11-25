import { importCad } from '@model/cad-import';
import { parseSchemaJson } from '@model/schema-json';
import { schemaBounds } from '@model/geometry';
import type { AppContext } from './context';
import type { Point, Viewport } from './viewport';
import type { Selectable } from './constants';
import type { SimulationController } from './sim-controller';
import { createHistory } from './history';
import { fitViewport } from './viewport';
import { cloneSchema, fitBounds, fullSheet, errorReason } from './helpers';
import { currentText, fillText } from './i18n';

export interface DocumentOpenSetup {
  svg: SVGSVGElement; fileName: HTMLElement; status: HTMLElement;
  selected: Map<string, Selectable>; simulation: SimulationController;
  clearPlacement(): void; clearWireDrawing(): void; placeTypeSelect: HTMLSelectElement | null;
  persistSchemaNow(): void; viewSize(): Point;
  setViewport(value: Viewport): void; drawViewport(): void; renderSchema(): void;
  beforeOpenDocument?(name: string): void;
  /** Схема только что открыта из файла: запомнить её как сохранённую (document-dirty.ts). */
  afterOpenDocument?(): void;
}

export function setupDocumentOpen(ctx: AppContext, deps: DocumentOpenSetup): (text: string, name: string) => void {
  const openDocumentText = (text: string, name: string): void => {
    deps.status.textContent = fillText(currentText().loadingFile, { name });
    try {
      const isJson = /\.json$/i.test(name);
      let openedSchema;
      let warningMessages: string[] = [];
      let unknownTypes: number[] = [];
      if (isJson) openedSchema = parseSchemaJson(text);
      else {
        const result = importCad(text);
        openedSchema = result.schema;
        warningMessages = result.warnings.map((warning) => warning.message);
        unknownTypes = result.unknownTypes;
      }
      deps.clearPlacement(); deps.clearWireDrawing();
      deps.svg.classList.remove('is-drawing-wire');
      if (deps.placeTypeSelect) deps.placeTypeSelect.value = '';
      deps.svg.classList.remove('is-placing'); deps.selected.clear();
      deps.beforeOpenDocument?.(name);
      ctx.schema = openedSchema;
      ctx.schema.sheet.fileName = name;
      const contentBounds = schemaBounds(ctx.schema);
      // Размер листа из файла сохраняется. Лист растёт, только если схема реально выходит за него
      // (старые файлы CADe_SIMU, где схема вылезает за рамку), и ровно под содержимое. Раньше лист
      // увеличивался до A3, едва схема подходила к краю, — а экспорт .cad как раз прижимает схему к
      // нижнему полю, поэтому сохранённый размер листа после повторного открытия терялся.
      if (contentBounds && (contentBounds.maxY > ctx.schema.sheet.height || contentBounds.maxX > ctx.schema.sheet.width)) {
        ctx.schema.sheet.width = Math.max(ctx.schema.sheet.width, Math.ceil(contentBounds.maxX + 20));
        ctx.schema.sheet.height = Math.max(ctx.schema.sheet.height, Math.ceil(contentBounds.maxY + 24));
        const settings = ctx.schema.sheet.cadFooter?.settings;
        if (settings && settings.length >= 2) { settings[settings.length - 2] = ctx.schema.sheet.width; settings[settings.length - 1] = ctx.schema.sheet.height; }
      }
      ctx.history = createHistory(cloneSchema(ctx.schema));
      deps.afterOpenDocument?.();
      deps.persistSchemaNow(); deps.simulation.resetSimulation(); deps.renderSchema();
      deps.fileName.textContent = name;
      const t = currentText();
      const summary = fillText(t.openedSummary, {
        elements: ctx.schema.elements.length,
        wires: ctx.schema.wires.filter((wire) => wire.kind !== 'junction').length,
        nodes: ctx.schema.wires.filter((wire) => wire.kind === 'junction' && wire.dot).length,
      });
      const warnings = warningMessages.length + unknownTypes.length;
      deps.status.textContent = warnings ? `${summary} · ${fillText(t.openedWarnings, { count: warnings })}` : summary;
      const unknownNotes = unknownTypes.map((type) => fillText(t.unknownElementType, { type }));
      if (warnings) deps.status.title = [...warningMessages, ...unknownNotes].join('\n');
      else deps.status.removeAttribute('title');
      const bounds = schemaBounds(ctx.schema); const size = deps.viewSize();
      deps.setViewport(bounds ? fitBounds(bounds, size) : fitViewport(fullSheet(ctx.schema.sheet), { width: size.x, height: size.y }));
      deps.drawViewport();
    } catch (error) {
      deps.status.textContent = fillText(currentText().openFailed, { reason: errorReason(error) });
    }
  };
  return openDocumentText;
}

/** Launch Handler API (Chrome/Edge): файлы, с которыми запустили установленное приложение. */
interface LaunchQueueLike {
  setConsumer(consumer: (params: { files?: ReadonlyArray<{ getFile(): Promise<File> }> }) => void | Promise<void>): void;
}

export function setupDocumentInputEvents(root: HTMLElement, fileInput: HTMLInputElement, openDocumentText: (text: string, name: string) => void, stopSimulation: () => void): void {
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    openDocumentText(await file.text(), file.name);
  });
  // Установленная PWA: двойной клик по .cad в проводнике открывает файл здесь (manifest → file_handlers).
  const launchQueue = (window as Window & { launchQueue?: LaunchQueueLike }).launchQueue;
  launchQueue?.setConsumer(async (params) => {
    for (const handle of params.files ?? []) {
      const file = await handle.getFile();
      openDocumentText(await file.text(), file.name);
    }
  });
  // Окно «Примеры» — отдельный кусок сборки (examples-window.ts): список и тексты примеров скачиваются
  // при первом открытии окна (и заранее в фоне после запуска), а не при старте программы.
  let examplesWindow: Promise<() => void> | undefined;
  const loadExamplesWindow = (): Promise<() => void> => {
    examplesWindow ??= import('./examples-window')
      .then((module) => module.setupExamplesWindow(root, stopSimulation, openDocumentText));
    examplesWindow.catch(() => { examplesWindow = undefined; });
    return examplesWindow;
  };
  // Названия — на текущем языке интерфейса: пересобираем список при каждом открытии окна.
  const renderExamples = (): void => { loadExamplesWindow().then((render) => render(), () => undefined); };
  if (typeof window !== 'undefined') window.setTimeout(() => { loadExamplesWindow().catch(() => undefined); }, 3000);
  root.querySelector('.examples-menu > summary')?.addEventListener('click', renderExamples);
}
