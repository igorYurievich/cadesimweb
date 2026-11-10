import type { Schema } from '@model/types';
import { parseSchemaJson } from '@model/schema-json';
import { AUTOSAVE_KEY } from './constants';
import { MAX_VIEWPORT_SCALE, MIN_VIEWPORT_SCALE, screenToSheet } from './viewport';
import type { Point, Viewport } from './viewport';

export const DOCUMENT_TABS_KEY = 'cadesim-web:documents:v1';

export interface SavedDocuments {
  activeId: string;
  tabs: Array<{ id: string; name: string; schema: Schema }>;
}

export function readAutosavedSchema(): Schema | undefined {
  try {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    return saved ? parseSchemaJson(saved) : undefined;
  } catch { return undefined; }
}

export function readSavedDocuments(): SavedDocuments | undefined {
  try {
    const raw = localStorage.getItem(DOCUMENT_TABS_KEY);
    if (!raw) return undefined;
    const saved = JSON.parse(raw) as { activeId?: unknown; tabs?: unknown };
    if (!Array.isArray(saved.tabs)) return undefined;
    const tabs = saved.tabs.flatMap((item): SavedDocuments['tabs'] => {
      try {
        if (!item || typeof item.id !== 'string' || typeof item.name !== 'string' || typeof item.schema !== 'string') return [];
        return [{ id: item.id, name: item.name, schema: parseSchemaJson(item.schema) }];
      } catch { return []; }
    });
    if (!tabs.length) return undefined;
    return { activeId: tabs.some((tab) => tab.id === saved.activeId) ? String(saved.activeId) : tabs[0]!.id, tabs };
  } catch { return undefined; }
}
export function writeAutosavedSchema(schema: Schema, serialize: (value: Schema) => string): void {
  try { localStorage.setItem(AUTOSAVE_KEY, serialize(schema)); } catch { /* Editor remains usable when storage is unavailable. */ }
}

export function writeSavedDocuments(
  activeId: string,
  tabs: Array<{ id: string; name: string; schema: string }>,
): void {
  try { localStorage.setItem(DOCUMENT_TABS_KEY, JSON.stringify({ activeId, tabs })); }
  catch { /* The current document remains available even when storage is full. */ }
}

const VIEWPORT_KEY = 'cadesimu-viewport';

export function readSavedViewport(viewSize: Point): Viewport | undefined {
  try {
    const raw = localStorage.getItem(VIEWPORT_KEY);
    if (!raw) return undefined;
    const saved = JSON.parse(raw) as { scale?: unknown; cx?: unknown; cy?: unknown };
    const { scale, cx, cy } = saved;
    if (typeof scale !== 'number' || typeof cx !== 'number' || typeof cy !== 'number') return undefined;
    if (![scale, cx, cy].every(Number.isFinite) || scale < MIN_VIEWPORT_SCALE || scale > MAX_VIEWPORT_SCALE) return undefined;
    return { scale, offsetX: viewSize.x / 2 - cx * scale, offsetY: viewSize.y / 2 - cy * scale };
  } catch { return undefined; }
}

export function writeSavedViewport(viewSize: Point, viewport: Viewport): void {
  try {
    const center = screenToSheet({ x: viewSize.x / 2, y: viewSize.y / 2 }, viewport);
    localStorage.setItem(VIEWPORT_KEY, JSON.stringify({ scale: viewport.scale, cx: center.x, cy: center.y }));
  } catch { /* The view simply is not restored next time. */ }
}
