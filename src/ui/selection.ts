import type { Schema } from '@model/types';
import type { Point } from './viewport';
import type { Selectable } from './constants';
import { normalizedBounds, overlaps, selectionKey } from './helpers';

export function getSelectionHit(target: EventTarget | null): Selectable | undefined {
  if (!(target instanceof Element)) return undefined;
  const element = target.closest<SVGGElement>('[data-element-id]');
  if (element) return { kind: 'element', id: Number(element.dataset.elementId) };
  const wire = target.closest<SVGElement>('[data-wire-id]');
  if (wire) return { kind: 'wire', id: Number(wire.getAttribute('data-wire-id')) };
  return undefined;
}

export function selectedObjects(schema: Schema, selected: Map<string, Selectable>): Array<{ item: Selectable; position?: Point; from?: Point; to?: Point }> {
  const objects: Array<{ item: Selectable; position?: Point; from?: Point; to?: Point }> = [];
  for (const item of selected.values()) {
    if (item.kind === 'element') {
      const element = schema.elements.find((candidate) => candidate.id === item.id);
      if (element) objects.push({ item, position: { ...element.position } });
    } else {
      const wire = schema.wires.find((candidate) => candidate.id === item.id);
      if (wire) objects.push({ item, from: { ...wire.from }, to: { ...wire.to } });
    }
  }
  return objects;
}

export function updateMarqueeSelection(schema: Schema, selected: Map<string, Selectable>, box: ReturnType<typeof normalizedBounds>, additive: boolean): void {
  if (!additive) selected.clear();
  for (const element of schema.elements) {
    if (element.typeCode === 20000) continue;
    const points = [{ x: element.position.x, y: element.position.y }, { x: element.position.x + element.size.w, y: element.position.y + element.size.h }, ...element.terminals.map((terminal) => ({ x: element.position.x + terminal.offset.x, y: element.position.y + terminal.offset.y }))];
    const bounds = points.reduce((b, p) => ({ minX: Math.min(b.minX, p.x), minY: Math.min(b.minY, p.y), maxX: Math.max(b.maxX, p.x), maxY: Math.max(b.maxY, p.y) }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
    if (overlaps(box, bounds)) {
      const item: Selectable = { kind: 'element', id: element.id };
      selected.set(selectionKey(item), item);
    }
  }
  for (const wire of schema.wires) {
    if (overlaps(box, normalizedBounds(wire.from, wire.to))) {
      const item: Selectable = { kind: 'wire', id: wire.id };
      selected.set(selectionKey(item), item);
    }
  }
}
