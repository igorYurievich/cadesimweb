import { describe, expect, it } from 'vitest';
import { createEmptySchema } from '@model/types';
import { isDocumentDirty, markDocumentSaved } from '../src/ui/document-dirty';

describe('unsaved changes of a document tab', () => {
  it('is clean after open or save, dirty after an edit and clean again after undoing it', () => {
    const tab: { schema: ReturnType<typeof createEmptySchema>; savedHash?: string } = { schema: createEmptySchema() };
    expect(isDocumentDirty(tab)).toBe(false);
    markDocumentSaved(tab);
    expect(isDocumentDirty(tab)).toBe(false);
    tab.schema.sheet.title = 'Actividad 1.7';
    expect(isDocumentDirty(tab)).toBe(true);
    tab.schema.sheet.title = '';
    expect(isDocumentDirty(tab)).toBe(false);
    tab.schema.sheet.title = 'Actividad 1.7';
    markDocumentSaved(tab);
    expect(isDocumentDirty(tab)).toBe(false);
  });
});
