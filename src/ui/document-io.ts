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

export interface DocumentOpenSetup {
  svg: SVGSVGElement; fileName: HTMLElement; status: HTMLElement;
  selected: Map<string, Selectable>; simulation: SimulationController;
  clearPlacement(): void; clearWireDrawing(): void; placeTypeSelect: HTMLSelectElement | null;
  persistSchemaNow(): void; viewSize(): Point;
  setViewport(value: Viewport): void; drawViewport(): void; renderSchema(): void;
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
  root.querySelector<HTMLElement>('.menu-examples')?.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-example]');
    if (!button) return;
    const example = EXAMPLES.find((candidate) => candidate.number === Number(button.dataset.example));
    root.querySelectorAll<HTMLDetailsElement>('.menu-group[open]').forEach((menu) => menu.removeAttribute('open'));
    if (example) { stopSimulation(); openDocumentText(example.text, example.fileName); }
  });
}
