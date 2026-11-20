/**
 * Несохранённые изменения вкладки: «*» у имени и вопрос «Сохранить перед закрытием?».
 * Вкладка помнит отпечаток схемы на момент открытия или сохранения файла; другой отпечаток — есть изменения.
 */

import { serializeSchemaJson } from '@model/schema-json';
import type { Schema } from '@model/types';

/** Короткий отпечаток схемы (FNV-1a по JSON): хранить в localStorage дешевле, чем копию. */
export function schemaFingerprint(schema: Schema): string {
  const text = serializeSchemaJson(schema);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${(hash >>> 0).toString(36)}:${text.length}`;
}

export interface TrackedDocument {
  schema: Schema;
  /** Отпечаток схемы на момент открытия или сохранения; нет — изменений нет. */
  savedHash?: string;
}

export function isDocumentDirty(tab: TrackedDocument): boolean {
  return tab.savedHash !== undefined && tab.savedHash !== schemaFingerprint(tab.schema);
}

export function markDocumentSaved(tab: TrackedDocument): void {
  tab.savedHash = schemaFingerprint(tab.schema);
}

export type CloseChoice = 'save' | 'discard' | 'cancel';

export interface UnsavedDialogText {
  unsavedTitle: string; unsavedText: string; unsavedSave: string; unsavedDiscard: string; cancel: string;
}

/** Диалог «Сохранить изменения в «имя» перед закрытием?»: сохранить, не сохранять или отмена (Esc). */
export function askSaveBeforeClose(root: HTMLElement, name: string, text: UnsavedDialogText): Promise<CloseChoice> {
  const dialog = root.querySelector<HTMLDialogElement>('#unsaved-close-dialog');
  if (!dialog) return Promise.resolve('discard');
  const set = (selector: string, value: string): void => {
    const node = dialog.querySelector<HTMLElement>(selector);
    if (node) node.textContent = value;
  };
  set('#unsaved-close-title', text.unsavedTitle);
  set('#unsaved-close-text', text.unsavedText.replace('{name}', name));
  set('[data-close-choice="save"]', text.unsavedSave);
  set('[data-close-choice="discard"]', text.unsavedDiscard);
  set('[data-close-choice="cancel"]', text.cancel);
  return new Promise((resolve) => {
    let choice: CloseChoice = 'cancel';
    const onClick = (event: Event): void => {
      const button = (event.target as Element).closest<HTMLButtonElement>('[data-close-choice]');
      if (!button) return;
      choice = button.dataset.closeChoice as CloseChoice;
      dialog.close();
    };
    const onClose = (): void => {
      dialog.removeEventListener('click', onClick);
      dialog.removeEventListener('close', onClose);
      resolve(choice);
    };
    dialog.addEventListener('click', onClick);
    dialog.addEventListener('close', onClose);
    dialog.showModal();
  });
}
