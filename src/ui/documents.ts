import type { Schema } from '@model/types';
import { createHistory } from './history';
import type { SavedDocuments } from './persistence';
import { cloneSchema, fullSheet } from './helpers';
import { fitViewport } from './viewport';
import type { Point, Viewport } from './viewport';

export interface DocumentTab {
  id: string;
  name: string;
  schema: Schema;
  history: ReturnType<typeof createHistory<Schema>>;
  viewport: Viewport;
}

export interface DocumentState {
  documents: DocumentTab[];
  activeDocumentId: string;
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
  })) ?? [{ id: crypto.randomUUID(), name: schema.sheet.fileName || 'Новая схема', schema, history, viewport }];
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

export function renderDocumentTabs(
  state: DocumentState,
  documentTabBar: HTMLElement | null,
  uiText: { new: string; close: string },
): void {
  if (!documentTabBar) return;
  documentTabBar.replaceChildren();
  const tabList = documentTabBar.ownerDocument.createElement('div');
  tabList.className = 'document-tab-list';
  for (const document of state.documents) {
    const tab = documentTabBar.ownerDocument.createElement('div');
    tab.className = `document-tab${document.id === state.activeDocumentId ? ' is-active' : ''}`;
    const select = documentTabBar.ownerDocument.createElement('button');
    select.type = 'button';
    select.className = 'document-tab-select';
    select.dataset.documentTab = document.id;
    const documentName = document.schema.sheet.fileName || uiText.new;
    select.textContent = documentName;
    select.title = documentName;
    const close = documentTabBar.ownerDocument.createElement('button');
    close.type = 'button';
    close.className = 'document-tab-close';
    close.dataset.closeDocument = document.id;
    close.setAttribute('aria-label', `${uiText.close} «${documentName}»`);
    close.title = uiText.close;
    close.textContent = '×';
    tab.append(select, close);
    tabList.append(tab);
  }
  documentTabBar.append(tabList);
  const add = documentTabBar.ownerDocument.createElement('button');
  add.type = 'button';
  add.id = 'new-document-tab';
  add.className = 'document-tab-add';
  add.title = uiText.new;
  add.setAttribute('aria-label', uiText.new);
  add.textContent = '+';
  documentTabBar.append(add);
  const activeTab = tabList.querySelector<HTMLElement>('.document-tab.is-active');
  if (activeTab) {
    const tabLeft = activeTab.getBoundingClientRect().left - tabList.getBoundingClientRect().left + tabList.scrollLeft;
    if (tabLeft < tabList.scrollLeft) tabList.scrollLeft = tabLeft;
    else if (tabLeft + activeTab.offsetWidth > tabList.scrollLeft + tabList.clientWidth) {
      tabList.scrollLeft = tabLeft + activeTab.offsetWidth - tabList.clientWidth;
    }
  }
}