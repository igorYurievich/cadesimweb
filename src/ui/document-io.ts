import { importCad } from '@model/cad-import';
import { parseSchemaJson } from '@model/schema-json';
import { schemaBounds } from '@model/geometry';
import type { AppContext } from './context';
import type { Point, Viewport } from './viewport';
import type { Selectable } from './constants';
import type { SimulationController } from './sim-controller';
import { createHistory } from './history';
import { fitViewport } from './viewport';
import { cloneSchema, fitBounds, fullSheet } from './helpers';
import { AUTHOR_FOLDER, EXAMPLES, EXAMPLE_FOLDERS } from '../data/examples';
import { EXAMPLE_FOLDER_TRANSLATIONS, exampleTitle } from '../data/example-titles';
import type { ExampleLang } from '../data/example-titles';
import { INTERFACE_TEXT } from './i18n';

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
    deps.status.textContent = `Загрузка ${name}…`;
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
      if (contentBounds && (contentBounds.maxY > ctx.schema.sheet.height - 30 || contentBounds.maxX > ctx.schema.sheet.width - 20)) {
        ctx.schema.sheet.width = Math.max(ctx.schema.sheet.width, 420, Math.ceil(contentBounds.maxX + 40));
        ctx.schema.sheet.height = Math.max(ctx.schema.sheet.height, 297, Math.ceil(contentBounds.maxY + 40));
        const settings = ctx.schema.sheet.cadFooter?.settings;
        if (settings && settings.length >= 2) { settings[settings.length - 2] = ctx.schema.sheet.width; settings[settings.length - 1] = ctx.schema.sheet.height; }
      }
      ctx.history = createHistory(cloneSchema(ctx.schema));
      deps.afterOpenDocument?.();
      deps.persistSchemaNow(); deps.simulation.resetSimulation(); deps.renderSchema();
      deps.fileName.textContent = name;
      const notes = [
        `${ctx.schema.elements.length} элементов`,
        `${ctx.schema.wires.filter((wire) => wire.kind !== 'junction').length} отрезков`,
        `${ctx.schema.wires.filter((wire) => wire.kind === 'junction' && wire.dot).length} узлов`,
      ];
      const warnings = warningMessages.length + unknownTypes.length;
      deps.status.textContent = `${notes.join(' · ')}${warnings ? ` · предупреждений: ${warnings}` : ''}`;
      if (warnings) deps.status.title = [...warningMessages, ...unknownTypes.map((type) => `Неизвестный тип элемента ${type}`)].join('\n');
      else deps.status.removeAttribute('title');
      const bounds = schemaBounds(ctx.schema); const size = deps.viewSize();
      deps.setViewport(bounds ? fitBounds(bounds, size) : fitViewport(fullSheet(ctx.schema.sheet), { width: size.x, height: size.y }));
      deps.drawViewport();
    } catch (error) {
      deps.status.textContent = `Не удалось открыть файл: ${error instanceof Error ? error.message : String(error)}`;
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
  // Окно «Примеры»: все папки сразу, одна под другой, без переходов между папками — клик по схеме открывает её.
  const escape = (value: string): string => value.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  const fileIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2.5h8l4 4v15H6z"/><path d="M14 2.5v4h4M9 12h6M9 15h6M9 18h4"/></svg>';
  const renderExamples = (): void => {
    const groups = root.querySelector<HTMLElement>('.example-groups');
    const count = root.querySelector<HTMLElement>('#examples-count');
    if (!groups || !count) return;
    const text = INTERFACE_TEXT[root.lang as keyof typeof INTERFACE_TEXT] ?? INTERFACE_TEXT.ru;
    groups.innerHTML = EXAMPLE_FOLDERS.map((folder) => {
      const items = EXAMPLES.filter((example) => example.folder === folder);
      if (!items.length) return '';
      const title = folder === AUTHOR_FOLDER ? text.examplesAuthor
        : EXAMPLE_FOLDER_TRANSLATIONS[folder]?.[root.lang as ExampleLang] ?? folder;
      const author = folder === AUTHOR_FOLDER ? ' data-examples-author' : '';
      const name = (example: (typeof items)[number]): string =>
        escape(exampleTitle(example.file, root.lang, example.title.replace(/\.cad$/i, '')));
      return `<section class="example-group"><h3 class="example-group-title"${author}>${escape(title)}</h3>`
        + `<div class="example-group-items">${items.map((example) => `<button type="button" class="example-file" `
        + `data-example="${example.number}" title="${escape(example.fileName)}">${fileIcon}`
        + `<span class="example-file-name">${name(example)}</span></button>`).join('')}</div></section>`;
    }).join('');
    count.dataset.visibleCount = String(EXAMPLES.length);
    count.textContent = text.examplesCount.replace('{count}', new Intl.NumberFormat(root.lang || 'ru').format(EXAMPLES.length));
  };
  root.querySelector<HTMLElement>('.example-groups')?.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-example]');
    if (!button) return;
    const example = EXAMPLES.find((candidate) => candidate.number === Number(button.dataset.example));
    if (example) {
      root.querySelector<HTMLDialogElement>('#examples-dialog')?.close();
      stopSimulation(); openDocumentText(example.text, example.fileName);
    }
  });
  renderExamples();
  // Названия — на текущем языке интерфейса: пересобираем список при каждом открытии окна.
  root.querySelector('.examples-menu > summary')?.addEventListener('click', renderExamples);
}
