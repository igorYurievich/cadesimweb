import type { Point, Viewport } from './viewport';
import { snapPointToGrid } from './viewport';
import type { Schema, SheetInfo } from '@model/types';
import { buildTerminals, frameSize } from '@model/geometry';
import { getCadType } from '@model/cad-types';
import { clampElementPosition } from './bounds';
import { PLACE_DEFAULTS, PLACE_LABEL_OFFSETS } from './constants';
import type { StampKey, Selectable } from './constants';

export function stampMetrics(width: number, height: number) {
  const margin = Math.min(5, width * 0.03, height * 0.03);
  const rowH = Math.min(7, Math.max(4.5, height * 0.03));
  const gap = 2.5;
  const stampHeight = rowH * 3;
  return { margin, rowH, gap, stampWidth: Math.max(0, width - margin * 2), stampHeight, footerHeight: stampHeight + gap * 2 };
}

export function fullSheet(sheet: { width: number; height: number }) {
  return { width: sheet.width, height: sheet.height + stampMetrics(sheet.width, sheet.height).footerHeight };
}

export function stampValue(sheet: SheetInfo, key: StampKey): string { return (sheet[key] ?? '') as string; }

export function fitBounds(bounds: { minX: number; minY: number; maxX: number; maxY: number }, screen: Point): Viewport {
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const scale = Math.min((screen.x - 80) / width, (screen.y - 80) / height, 8);
  return {
    scale: Math.max(0.2, scale),
    offsetX: (screen.x - width * scale) / 2 - bounds.minX * scale,
    offsetY: (screen.y - height * scale) / 2 - bounds.minY * scale,
  };
}

export function selectionKey(item: Selectable): string { return `${item.kind}:${item.id}`; }

export function normalizedBounds(a: Point, b: Point) {
  return { minX: Math.min(a.x, b.x), minY: Math.min(a.y, b.y), maxX: Math.max(a.x, b.x), maxY: Math.max(a.y, b.y) };
}

export function overlaps(a: ReturnType<typeof normalizedBounds>, b: ReturnType<typeof normalizedBounds>): boolean {
  return a.maxX >= b.minX && a.minX <= b.maxX && a.maxY >= b.minY && a.minY <= b.maxY;
}

export function nextElementName(prefix: string, schema: Schema): string {
  const used = new Set(schema.elements.map((element) => element.name));
  let suffix = 1;
  while (used.has(`${prefix}${suffix}`)) suffix += 1;
  return `${prefix}${suffix}`;
}

export function createPlacedElement(typeCode: number, position: Point, rotation: 0 | 1 | 2 | 3, schema: Schema): Schema['elements'][number] {
  const defaults = PLACE_DEFAULTS[typeCode];
  if (!defaults) throw new RangeError(`Нет шаблона размещения для CAD-типа ${typeCode}.`);
  const info = getCadType(typeCode);
  const id = Math.max(0, ...schema.elements.map((element) => element.id), ...schema.wires.map((wire) => wire.id)) + 1;
  const size = frameSize(defaults.size, rotation);
  const terminals = buildTerminals(info, defaults.labels.length, size, rotation, defaults.labels);
  const element: Schema['elements'][number] = {
    id, typeCode, name: defaults.prefix ? nextElementName(defaults.prefix, schema) : '', func: info.label,
    position: snapPointToGrid(position, 3), rotation, size: { ...size },
    labelOffset: PLACE_LABEL_OFFSETS[typeCode] ? { ...PLACE_LABEL_OFFSETS[typeCode] } : { x: defaults.size.w / 2, y: -3 }, terminals, params: {},
  };
  // Блокировка не имеет клемм: в name и func лежат имена двух блокируемых контакторов.
  if (typeCode === 2009) { element.name = 'KM1'; element.func = 'KM2'; }
  element.position = clampElementPosition(element.position, element, schema.sheet);
  return element;
}

export function cloneSchema(schema: Schema): Schema { return structuredClone(schema); }
