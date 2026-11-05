/** Immutable snapshot history for editor actions; contains no browser or DOM code. */
export interface History<T> {
  past: T[];
  present: T;
  future: T[];
  limit: number;
}

export function createHistory<T>(initial: T, limit = 100): History<T> {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError('History limit must be a positive integer.');
  return { past: [], present: initial, future: [], limit };
}

export function commitHistory<T>(history: History<T>, next: T): History<T> {
  const past = [...history.past, history.present];
  return { past: past.slice(-history.limit), present: next, future: [], limit: history.limit };
}

export function undoHistory<T>(history: History<T>): History<T> {
  if (history.past.length === 0) return history;
  return {
    past: history.past.slice(0, -1),
    present: history.past[history.past.length - 1] as T,
    future: [history.present, ...history.future],
    limit: history.limit,
  };
}

export function redoHistory<T>(history: History<T>): History<T> {
  if (history.future.length === 0) return history;
  return {
    past: [...history.past, history.present].slice(-history.limit),
    present: history.future[0] as T,
    future: history.future.slice(1),
    limit: history.limit,
  };
}

export function canUndo<T>(history: History<T>): boolean { return history.past.length > 0; }
export function canRedo<T>(history: History<T>): boolean { return history.future.length > 0; }
