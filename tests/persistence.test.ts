import { afterEach, describe, expect, it } from 'vitest';
import { createEmptySchema } from '@model/index';
import { serializeSchemaJson } from '@model/schema-json';
import {
  readAutosavedSchema,
  readSavedDocuments,
  readSavedViewport,
  writeAutosavedSchema,
  writeSavedDocuments,
  writeSavedViewport,
} from '@ui/persistence';
import type { Viewport } from '@ui/viewport';

const values = new Map<string, string>();
const storage: Storage = {
  get length() { return values.size; },
  clear: () => values.clear(),
  getItem: (key) => values.get(key) ?? null,
  key: (index) => [...values.keys()][index] ?? null,
  removeItem: (key) => { values.delete(key); },
  setItem: (key, value) => { values.set(key, value); },
};

Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });

afterEach(() => values.clear());

describe('UI persistence', () => {
  it('writes and reads the autosaved schema using the existing storage key', () => {
    const schema = createEmptySchema();
    writeAutosavedSchema(schema, serializeSchemaJson);
    expect(readAutosavedSchema()).toEqual(schema);
    expect(values.has('cadesimu-web:autosave:v1')).toBe(true);
  });

  it('round-trips saved document tabs and the active tab id', () => {
    const schema = createEmptySchema();
    writeSavedDocuments('doc-1', [{ id: 'doc-1', name: 'Example', schema: serializeSchemaJson(schema) }]);
    expect(readSavedDocuments()).toEqual({
      activeId: 'doc-1',
      tabs: [{ id: 'doc-1', name: 'Example', schema }],
    });
  });

  it('keeps valid tabs and chooses the first if the saved active id is invalid', () => {
    const schema = serializeSchemaJson(createEmptySchema());
    values.set('cadesim-web:documents:v1', JSON.stringify({
      activeId: 'missing',
      tabs: [{ id: 'first', name: 'First', schema }],
    }));
    expect(readSavedDocuments()?.activeId).toBe('first');
  });

  it('round-trips viewport center and scale with the current viewport size', () => {
    const size = { x: 800, y: 600 };
    const viewport: Viewport = { scale: 2, offsetX: -100, offsetY: -50 };
    writeSavedViewport(size, viewport);
    expect(readSavedViewport(size)).toEqual(viewport);
  });

  it('ignores malformed or out-of-range saved viewports', () => {
    values.set('cadesimu-viewport', '{bad json');
    expect(readSavedViewport({ x: 800, y: 600 })).toBeUndefined();
    values.set('cadesimu-viewport', JSON.stringify({ scale: 100, cx: 10, cy: 10 }));
    expect(readSavedViewport({ x: 800, y: 600 })).toBeUndefined();
  });
});
