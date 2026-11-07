import type { Schema } from '@model/types';
import type { History } from './history';

export type HistoryState = History<Schema>;

/** Shared view of mutable mountApp state; accessor callbacks preserve its existing closure and timing. */
export interface AppContext {
  readonly root: HTMLElement;
  schema: Schema;
  history: HistoryState;
}

export function createAppContext(
  root: HTMLElement,
  readSchema: () => Schema,
  writeSchema: (schema: Schema) => void,
  readHistory: () => HistoryState,
  writeHistory: (history: HistoryState) => void,
): AppContext {
  return {
    root,
    get schema() { return readSchema(); },
    set schema(schema) { writeSchema(schema); },
    get history() { return readHistory(); },
    set history(history) { writeHistory(history); },
  };
}
