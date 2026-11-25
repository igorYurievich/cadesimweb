import type { Schema } from '@model/types';
import { createEmptySchema } from '@model/index';
import { createHistory } from './history';
import type { SavedDocuments } from './persistence';
import { cloneSchema, fullSheet } from './helpers';
import { fitViewport } from './viewport';
import { isDocumentDirty, markDocumentSaved } from './document-dirty';
import { renderDocumentTabs } from './document-tab-bar';
import type { Point, Viewport } from './viewport';
import { currentText, fillText } from './i18n';

export interface DocumentTab {
  id: string;
  name: string;
  schema: Schema;
  history: ReturnType<typeof createHistory<Schema>>;
  viewport: Viewport;
  /** Отпечаток схемы на момент открытия или сохранения файла (document-dirty.ts). */
  savedHash?: string;
}

export interface DocumentState {
  documents: DocumentTab[];
  activeDocumentId: string;
}

export interface DocumentTabControllerOptions {
  state: DocumentState;
  tabBar: HTMLElement | null;
  fileInput: HTMLInputElement;
  fileName: HTMLSpanElement;
  schema: () => Schema;
  setSchema: (schema: Schema) => void;
  setHistory: (history: DocumentTab['history']) => void;
  setViewport: (viewport: Viewport) => void;
  viewSize: () => Point;
  uiText: () => { new: string; close: string };
  syncCurrentDocument: () => void;
  persistDocuments: () => void;
  persistSchemaNow: () => void;
  stopSimulation: () => void;
  resetSimulation: () => void;
  clearSelection: () => void;
  clearEditorTools: () => void;
  renderSchema: () => void;
  drawViewport: () => void;
  updateHistoryButtons: () => void;
  translateInterface: () => void;
  status: HTMLElement;
  /** Перед закрытием вкладки с изменениями (она уже активна): true — можно закрывать. */
  confirmCloseDirty?: (tab: DocumentTab) => Promise<boolean>;
}

export interface DocumentTabController {
  activateDocument: (id: string, skipSavingCurrent?: boolean) => void;
  createDocumentTab: (name?: string) => void;
  closeDocumentTab: (id: string) => void;
}

export interface AppDocumentTabsOptions {
  state: DocumentState;
  tabBar: HTMLElement | null;
  elements: { fileInput: HTMLInputElement; fileName: HTMLSpanElement; status: HTMLElement };
  schemaState: {
    schema: () => Schema;
    setSchema: (schema: Schema) => void;
    setHistory: (history: DocumentTab['history']) => void;
    setViewport: (viewport: Viewport) => void;
    viewSize: () => Point;
  };
  persistence: {
    syncCurrentDocument: () => void;
    persistDocuments: () => void;
    persistSchemaNow: () => void;
  };
  simulation: { stopSimulation: () => void; resetSimulation: () => void };
  editor: {
    clearSelection: () => void;
    clearEditorTools: () => void;
    renderSchema: () => void;
    drawViewport: () => void;
    updateHistoryButtons: () => void;
    translateInterface: () => void;
  };
  uiText: () => { new: string; close: string };
  confirmCloseDirty?: (tab: DocumentTab) => Promise<boolean>;
}

export function setupAppDocumentTabs(options: AppDocumentTabsOptions): DocumentTabController {
  return setupDocumentTabController({
    state: options.state,
    tabBar: options.tabBar,
    fileInput: options.elements.fileInput,
    fileName: options.elements.fileName,
    status: options.elements.status,
    schema: options.schemaState.schema,
    setSchema: options.schemaState.setSchema,
    setHistory: options.schemaState.setHistory,
    setViewport: options.schemaState.setViewport,
    viewSize: options.schemaState.viewSize,
    uiText: options.uiText,
    syncCurrentDocument: options.persistence.syncCurrentDocument,
    persistDocuments: options.persistence.persistDocuments,
    persistSchemaNow: options.persistence.persistSchemaNow,
    stopSimulation: options.simulation.stopSimulation,
    resetSimulation: options.simulation.resetSimulation,
    clearSelection: options.editor.clearSelection,
    clearEditorTools: options.editor.clearEditorTools,
    renderSchema: options.editor.renderSchema,
    drawViewport: options.editor.drawViewport,
    updateHistoryButtons: options.editor.updateHistoryButtons,
    translateInterface: options.editor.translateInterface,
    ...(options.confirmCloseDirty ? { confirmCloseDirty: options.confirmCloseDirty } : {}),
  });
}

export function setupDocumentTabController(options: DocumentTabControllerOptions): DocumentTabController {
  const { state, tabBar } = options;
  const renderTabs = (): void => renderDocumentTabs(state, tabBar, options.uiText());

  const activateDocument = (id: string, skipSavingCurrent = false): void => {
    if (id === state.activeDocumentId) return;
    if (!skipSavingCurrent) {
      options.syncCurrentDocument();
      options.persistDocuments();
    }
    options.stopSimulation();
    const target = state.documents.find((tab) => tab.id === id);
    if (!target) return;
    state.activeDocumentId = target.id;
    options.setSchema(target.schema);
    options.setHistory(target.history);
    options.setViewport(target.viewport);
    options.clearSelection();
    options.fileInput.value = '';
    options.fileName.textContent = options.schema().sheet.fileName || target.name;
    options.clearEditorTools();
    options.resetSimulation();
    options.renderSchema();
    options.drawViewport();
    options.updateHistoryButtons();
    options.translateInterface();
    options.status.textContent = fillText(currentText().schemaOpened, { name: target.name });
    renderTabs();
  };

  const createDocumentTab = (name = options.uiText().new): void => {
    if (state.documents.length) {
      options.syncCurrentDocument();
      options.persistDocuments();
    }
    options.stopSimulation();
    const schema = createEmptySchema();
    const tab: DocumentTab = {
      id: crypto.randomUUID(),
      name,
      schema,
      history: createHistory(cloneSchema(schema)),
      viewport: fitViewport(fullSheet(schema.sheet), {
        width: options.viewSize().x,
        height: options.viewSize().y,
      }),
    };
    markDocumentSaved(tab);
    state.documents.push(tab);
    state.activeDocumentId = tab.id;
    options.setSchema(tab.schema);
    options.setHistory(tab.history);
    options.setViewport(tab.viewport);
    options.clearSelection();
    options.fileInput.value = '';
    options.fileName.textContent = name;
    options.clearEditorTools();
    options.resetSimulation();
    options.renderSchema();
    options.drawViewport();
    options.updateHistoryButtons();
    options.translateInterface();
    options.status.textContent = currentText().newSchemaCreated;
    options.persistSchemaNow();
    renderTabs();
  };

  const closeDocumentTab = (id: string): void => {
    const index = state.documents.findIndex((tab) => tab.id === id);
    if (index < 0) return;
    options.syncCurrentDocument();
    state.documents.splice(index, 1);
    if (!state.documents.length) {
      state.activeDocumentId = '';
      createDocumentTab();
      return;
    }
    if (state.activeDocumentId === id) {
      state.activeDocumentId = '';
      activateDocument(state.documents[Math.min(index, state.documents.length - 1)]!.id, true);
    } else {
      options.persistDocuments();
    }
  };

  // Вкладку с изменениями сначала показываем, потом спрашиваем «Сохранить перед закрытием?».
  const requestCloseDocumentTab = async (id: string): Promise<void> => {
    if (id === state.activeDocumentId) options.syncCurrentDocument();
    const tab = state.documents.find((candidate) => candidate.id === id);
    if (tab && options.confirmCloseDirty && isDocumentDirty(tab)) {
      activateDocument(id);
      if (!(await options.confirmCloseDirty(tab))) return;
    }
    closeDocumentTab(id);
  };

  tabBar?.addEventListener('click', (event) => {
    const target = event.target as Element;
    const close = target.closest<HTMLButtonElement>('[data-close-document]');
    if (close?.dataset.closeDocument) {
      event.stopPropagation();
      void requestCloseDocumentTab(close.dataset.closeDocument);
      return;
    }
    const tab = target.closest<HTMLButtonElement>('[data-document-tab]');
    if (tab?.dataset.documentTab) activateDocument(tab.dataset.documentTab);
    else if (target.closest('#new-document-tab')) createDocumentTab();
  });
  renderTabs();
  return { activateDocument, createDocumentTab, closeDocumentTab };
}

export function createDocumentState(
  saved: SavedDocuments | undefined,
  schema: Schema,
  history: DocumentTab['history'],
  viewport: Viewport,
  viewSize: Point,
): DocumentState {
  const documents = saved?.tabs.map((tab) => ({
    ...tab,
    history: createHistory(cloneSchema(tab.schema)),
    viewport: tab.id === saved.activeId
      ? viewport
      : fitViewport(fullSheet(tab.schema.sheet), { width: viewSize.x, height: viewSize.y }),
  })) ?? [{ id: crypto.randomUUID(), name: schema.sheet.fileName || currentText().new, schema, history, viewport }];
  // Без сохранённого отпечатка считаем вкладку сохранённой.
  for (const tab of documents) if (tab.savedHash === undefined) markDocumentSaved(tab);
  return { documents, activeDocumentId: saved?.activeId ?? documents[0]!.id };
}

export function activeDocument(state: DocumentState): DocumentTab {
  return state.documents.find((tab) => tab.id === state.activeDocumentId) ?? state.documents[0]!;
}

export function syncActiveDocument(
  state: DocumentState,
  schema: Schema,
  history: DocumentTab['history'],
  viewport: Viewport,
  defaultName: string,
): void {
  const current = activeDocument(state);
  current.schema = schema;
  current.history = history;
  current.viewport = viewport;
  current.name = schema.sheet.fileName || defaultName;
}

export { renderDocumentTabs };
