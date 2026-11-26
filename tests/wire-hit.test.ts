import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createEmptySchema } from '../src/model/index';
import type { WireSegment } from '../src/model/types';
import { nearestWireAt, pickCanvasHit } from '../src/ui/wire-hit';

const wire = (id: number, from: [number, number], to: [number, number], kind: WireSegment['kind'] = 'phase'): WireSegment =>
  ({ id, typeCode: 4000, kind, from: { x: from[0], y: from[1] }, to: { x: to[0], y: to[1] }, thickness: 1, dot: false });

/** Узел SVG в тестах без DOM: элемент схемы или провод по data-атрибуту. */
class FakeElement {
  constructor(private readonly attrs: Record<string, string>) {}
  get classList(): { contains(name: string): boolean } {
    const names = (this.attrs.class ?? '').split(' ');
    return { contains: (name: string) => names.includes(name) };
  }
  get dataset(): Record<string, string> { return { elementId: this.attrs['data-element-id'] ?? '' }; }
  getAttribute(name: string): string | null { return this.attrs[name] ?? null; }
  closest(selector: string): FakeElement | null {
    const name = selector.slice(1, -1);
    return name in this.attrs ? this : null;
  }
}

describe('выбор провода рядом с элементом', () => {
  const saved = (globalThis as { Element?: unknown }).Element;
  beforeAll(() => { (globalThis as { Element?: unknown }).Element = FakeElement; });
  afterAll(() => { (globalThis as { Element?: unknown }).Element = saved; });

  const schema = createEmptySchema();
  schema.wires.push(wire(10, [0, 0], [30, 0]), wire(11, [0, 6], [30, 6]), wire(12, [15, 3], [15, 3], 'junction'));

  it('находит ближайший провод в пределах допуска и пропускает точки соединения', () => {
    expect(nearestWireAt(schema, { x: 10, y: 1 }, 1.5)).toBe(10);
    expect(nearestWireAt(schema, { x: 10, y: 5 }, 1.5)).toBe(11);
    expect(nearestWireAt(schema, { x: 15, y: 3 }, 1)).toBeUndefined();
    expect(nearestWireAt(schema, { x: 40, y: 0 }, 1.5)).toBeUndefined();
  });

  const hitArea = new FakeElement({ 'data-element-id': '7', class: 'hit-area' }) as unknown as EventTarget;
  const drawn = new FakeElement({ 'data-element-id': '7' }) as unknown as EventTarget;

  it('клик по пустой рамке элемента рядом с проводом выделяет провод', () => {
    expect(pickCanvasHit(hitArea, schema, { x: 10, y: 0.5 }, 1.5)).toEqual({ kind: 'wire', id: 10 });
  });

  it('клик по линиям символа или внутрь его фигуры выделяет элемент даже рядом с проводом', () => {
    expect(pickCanvasHit(drawn, schema, { x: 10, y: 0.5 }, 1.5)).toEqual({ kind: 'element', id: 7 });
    expect(pickCanvasHit(hitArea, schema, { x: 10, y: 0.5 }, 1.5, true)).toEqual({ kind: 'element', id: 7 });
  });

  it('клик по элементу вдали от проводов выделяет элемент', () => {
    expect(pickCanvasHit(hitArea, schema, { x: 10, y: 3 }, 1.5)).toEqual({ kind: 'element', id: 7 });
  });
});
