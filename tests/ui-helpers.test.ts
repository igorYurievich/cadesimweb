import { describe, expect, it } from 'vitest';
import { createEmptySchema } from '../src/model/index';
import {
  cloneSchema, createPlacedElement, fitBounds, fullSheet, nextElementName,
  normalizedBounds, overlaps, selectionKey, stampMetrics, stampValue,
} from '../src/ui/helpers';

describe('UI pure helpers', () => {
  it('computes the sheet stamp and footer dimensions', () => {
    expect(stampMetrics(279, 210)).toEqual({
      margin: 5, rowH: 6.3, gap: 2.5, stampWidth: 269,
      stampHeight: 18.9, footerHeight: 23.9,
    });
    expect(fullSheet({ width: 279, height: 210 })).toEqual({ width: 279, height: 233.9 });
    expect(stampValue({ width: 279, height: 210, author: '', entity: '', date: '', fileName: '', number: '', title: 'Panel' }, 'title')).toBe('Panel');
  });

  it('fits bounds and computes selection geometry', () => {
    const fitted = fitBounds({ minX: 10, minY: 20, maxX: 110, maxY: 70 }, { x: 500, y: 300 });
    expect(fitted.scale).toBe(4.2);
    expect(selectionKey({ kind: 'wire', id: 8 })).toBe('wire:8');
    expect(normalizedBounds({ x: 5, y: 12 }, { x: -2, y: 3 })).toEqual({ minX: -2, minY: 3, maxX: 5, maxY: 12 });
    expect(overlaps({ minX: 0, minY: 0, maxX: 4, maxY: 4 }, { minX: 4, minY: 2, maxX: 8, maxY: 6 })).toBe(true);
    expect(overlaps({ minX: 0, minY: 0, maxX: 2, maxY: 2 }, { minX: 3, minY: 0, maxX: 4, maxY: 2 })).toBe(false);
  });

  it('names, clones, and creates placed elements without changing the source schema', () => {
    const schema = createEmptySchema();
    schema.elements.push({
      id: 1, typeCode: 1000, name: 'M1', func: 'Motor', position: { x: 3, y: 3 },
      rotation: 0, size: { w: 24, h: 12 }, labelOffset: { x: 12, y: -3 },
      terminals: [], params: {},
    });
    expect(nextElementName('M', schema)).toBe('M2');
    const copy = cloneSchema(schema);
    copy.elements[0]!.name = 'Changed';
    expect(schema.elements[0]!.name).toBe('M1');
    const placed = createPlacedElement(2009, { x: 100, y: 100 }, 0, schema);
    expect(placed).toMatchObject({ id: 2, name: 'KM1', func: 'KM2', position: { x: 99, y: 99 } });
    expect(schema.elements).toHaveLength(1);
  });
});
