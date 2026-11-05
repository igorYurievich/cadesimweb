/**
 * Помощники тестов: собрать Schema из отрезков и элементов в одну строку.
 *
 *   const s = schemaOf([seg(0, 0, 6, 0), seg(6, 0, 6, 6), dot(6, 0)]);
 *
 * id выдаются по порядку с 1, если не заданы явно (`seg(..., { id: 10 })`).
 */

import { createEmptySchema } from '../src/model/types';
import type { Point, Rotation, Schema, SchemaElement, WireKind, WireSegment } from '../src/model/types';

export type WireDraft = Omit<WireSegment, 'id'> & { id?: number };
export type ElementDraft = Omit<SchemaElement, 'id'> & { id?: number };

const WIRE_CODES: Record<WireKind, number> = {
  phase: 4000,
  neutral: 4009,
  protection: 4010,
  junction: 4001,
};

export interface SegOptions {
  id?: number;
  kind?: Exclude<WireKind, 'junction'>;
}

/** Отрезок провода (по умолчанию фаза, толщина 1). */
export function seg(x1: number, y1: number, x2: number, y2: number, opt: SegOptions = {}): WireDraft {
  const kind = opt.kind ?? 'phase';
  const w: WireDraft = {
    typeCode: WIRE_CODES[kind],
    kind,
    from: { x: x1, y: y1 },
    to: { x: x2, y: y2 },
    thickness: 1,
    dot: false,
  };
  if (opt.id !== undefined) w.id = opt.id;
  return w;
}

/** Точка соединения 4001 в (x, y). */
export function dot(x: number, y: number, id?: number): WireDraft {
  const w: WireDraft = {
    typeCode: 4001,
    kind: 'junction',
    from: { x, y },
    to: { x, y },
    thickness: 0,
    dot: true,
  };
  if (id !== undefined) w.id = id;
  return w;
}

export interface ElOptions {
  id?: number;
  name?: string;
  rotation?: Rotation;
  /** Клеммы: [dx, dy, label?] относительно позиции элемента. */
  terminals?: ReadonlyArray<readonly [number, number, string?]>;
}

/** Элемент заданного типа в (x, y) с клеммами. */
export function el(typeCode: number, x: number, y: number, opt: ElOptions = {}): ElementDraft {
  const e: ElementDraft = {
    typeCode,
    name: opt.name ?? '',
    func: '',
    position: { x, y },
    rotation: opt.rotation ?? 0,
    size: { w: 12, h: 12 },
    labelOffset: { x: 0, y: 0 },
    terminals: (opt.terminals ?? []).map(([dx, dy, label]) => ({
      label: label ?? '',
      offset: { x: dx, y: dy },
    })),
    params: {},
  };
  if (opt.id !== undefined) e.id = opt.id;
  return e;
}

/** Собирает Schema. Объекты без id получают свободные id по порядку, начиная с 1. */
export function schemaOf(wires: readonly WireDraft[] = [], elements: readonly ElementDraft[] = []): Schema {
  const used = new Set<number>();
  for (const o of [...wires, ...elements]) if (o.id !== undefined) used.add(o.id);
  let next = 1;
  const take = (): number => {
    while (used.has(next)) next += 1;
    used.add(next);
    return next;
  };
  const schema = createEmptySchema();
  schema.wires = wires.map((w) => ({ ...w, id: w.id ?? take() }));
  schema.elements = elements.map((e) => ({ ...e, id: e.id ?? take() }));
  return schema;
}

export type { Point };
