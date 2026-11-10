import { describe, expect, it } from 'vitest';
import { createEmptySchema } from '@model/index';
import { createHistory } from '@ui/history';
import { activeDocument, createDocumentState, syncActiveDocument } from '@ui/documents';
import { fitViewport } from '@ui/viewport';

describe('document state', () => {
  it('restores saved tabs and selects the saved active document', () => {
    const schema = createEmptySchema();
    const saved = { activeId: 'second', tabs: [
      { id: 'first', name: 'First', schema },
      { id: 'second', name: 'Second', schema },
    ] };
    const size = { x: 900, y: 600 };
    const viewport = fitViewport({ width: schema.sheet.width, height: schema.sheet.height }, { width: size.x, height: size.y });
    const state = createDocumentState(saved, schema, createHistory(schema), viewport, size);

    expect(state.activeDocumentId).toBe('second');
    expect(activeDocument(state).name).toBe('Second');
    expect(state.documents).toHaveLength(2);
  });

  it('synchronizes the active tab with the current editor state', () => {
    const schema = createEmptySchema();
    schema.sheet.fileName = 'renamed.cad';
    const size = { x: 900, y: 600 };
    const viewport = fitViewport({ width: schema.sheet.width, height: schema.sheet.height }, { width: size.x, height: size.y });
    const state = createDocumentState(undefined, schema, createHistory(schema), viewport, size);
    const nextSchema = createEmptySchema();
    nextSchema.sheet.fileName = 'current.cad';
    const nextHistory = createHistory(nextSchema);
    const nextViewport = { ...viewport, scale: viewport.scale * 1.1 };

    syncActiveDocument(state, nextSchema, nextHistory, nextViewport, 'New');
    expect(activeDocument(state)).toMatchObject({
      schema: nextSchema,
      history: nextHistory,
      viewport: nextViewport,
      name: 'current.cad',
    });
  });
});
