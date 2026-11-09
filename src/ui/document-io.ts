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
import { EXAMPLES } from '../data/examples';
import { INTERFACE_TEXT } from './i18n';

export interface DocumentOpenSetup {
  svg: SVGSVGElement; fileName: HTMLElement; status: HTMLElement;
  selected: Map<string, Selectable>; simulation: SimulationController;
  clearPlacement(): void; clearWireDrawing(): void; placeTypeSelect: HTMLSelectElement | null;
  persistSchemaNow(): void; viewSize(): Point;
  setViewport(value: Viewport): void; drawViewport(): void; renderSchema(): void;
  beforeOpenDocument?(name: string): void;
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

export function setupDocumentInputEvents(root: HTMLElement, fileInput: HTMLInputElement, openDocumentText: (text: string, name: string) => void, stopSimulation: () => void): void {
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    openDocumentText(await file.text(), file.name);
  });
  let currentExampleFolder = '';
  const renderExampleFolder = (): void => {
    const list = root.querySelector<HTMLElement>('.example-file-list');
    const folderLabel = root.querySelector<HTMLElement>('#examples-folder-label');
    const back = root.querySelector<HTMLButtonElement>('[data-examples-back]');
    const count = root.querySelector<HTMLElement>('#examples-count');
    if (!list || !folderLabel || !back || !count) return;
    const visible = EXAMPLES.filter((example) => example.folder === currentExampleFolder);
    root.dataset.examplesFolder = currentExampleFolder;
    folderLabel.textContent = currentExampleFolder || INTERFACE_TEXT[root.lang as keyof typeof INTERFACE_TEXT]?.examplesFolder || INTERFACE_TEXT.ru.examplesFolder;
    back.disabled = !currentExampleFolder;
    const folderRow = (name: string): string => `<button type="button" class="example-folder-row" data-folder="${name}" title="${name}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5h7l2 2h9v10H3z"/></svg><span class="example-file-name">${name}</span><span class="example-file-code"></span></button>`;
    const childFolder = currentExampleFolder === '' ? `${folderRow('Ejemplos')}${folderRow('Ejemplos 2')}` : '';
    list.innerHTML = `${childFolder}${visible.map((example) => `<button type="button" class="example-file" data-example="${example.number}" title="${example.fileName}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2.5h8l4 4v15H6z"/><path d="M14 2.5v4h4M9 12h6M9 15h6M9 18h4"/></svg><span class="example-file-name">${example.title}</span><span class="example-file-code">${example.code}</span></button>`).join('')}`;
    count.dataset.visibleCount = String(visible.length);
    const text = INTERFACE_TEXT[root.lang as keyof typeof INTERFACE_TEXT]?.examplesCount || INTERFACE_TEXT.ru.examplesCount;
    count.textContent = currentExampleFolder ? text.replace('{count}', new Intl.NumberFormat(root.lang || 'ru').format(visible.length)) : '';
  };
  const list = root.querySelector<HTMLElement>('.example-file-list');
  list?.addEventListener('click', (event) => {
    const target = event.target as Element;
    const folderButton = target.closest<HTMLButtonElement>('[data-folder]');
    if (folderButton) { currentExampleFolder = folderButton.dataset.folder ?? ''; renderExampleFolder(); return; }
    const button = target.closest<HTMLButtonElement>('[data-example]');
    if (!button) return;
    const example = EXAMPLES.find((candidate) => candidate.number === Number(button.dataset.example));
    if (example) {
      root.querySelector<HTMLDialogElement>('#examples-dialog')?.close();
      stopSimulation(); openDocumentText(example.text, example.fileName);
    }
  });
  root.querySelector<HTMLButtonElement>('[data-examples-back]')?.addEventListener('click', () => {
    currentExampleFolder = '';
    renderExampleFolder();
  });
  renderExampleFolder();
}
