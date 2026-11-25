/**
 * Сетка для поиска проводов рядом с точкой или с другим проводом. Соединение возможно, только
 * если рамки отрезков пересекаются, поэтому вместо сравнения «каждый с каждым» (на 1900 проводах —
 * миллионы пар) смотрим лишь провода из тех же клеток. Лишний кандидат ничего не портит: правила
 * соединения всё равно проверяются точно, сетка только отсекает заведомо далёкие пары.
 */

import type { Point, WireSegment } from '../model/types';

/** Размер клетки в единицах .cad: порядок длины типичного отрезка. */
const CELL = 30;
/** Запас рамки: пересечение ищется с допуском, сетка не должна его отрезать. */
const PAD = 0.5;
/** Отрезок на слишком много клеток (длинная диагональ) не раскладываем, а проверяем всегда. */
const MAX_CELLS = 4096;

/** Номер клетки; совпадение номеров разных клеток даёт лишь лишних кандидатов. */
const cellKey = (cx: number, cy: number): number => cx * 1_000_003 + cy;

export class SegmentGrid {
  private readonly cells = new Map<number, number[]>();
  /** Отрезки, которые проверяются всегда (огромная рамка или нечисловые координаты). */
  private readonly always: number[] = [];
  private readonly stamp: Int32Array;
  private pass = 0;

  constructor(private readonly wires: readonly WireSegment[]) {
    this.stamp = new Int32Array(wires.length);
    wires.forEach((wire, index) => {
      const range = this.range(wire);
      if (!range) { this.always.push(index); return; }
      for (let cx = range.x0; cx <= range.x1; cx += 1) {
        for (let cy = range.y0; cy <= range.y1; cy += 1) {
          const key = cellKey(cx, cy);
          const list = this.cells.get(key);
          if (list) list.push(index);
          else this.cells.set(key, [index]);
        }
      }
    });
  }

  /** Индексы отрезков, рамка которых может содержать точку; по возрастанию. */
  atPoint(point: Point): number[] {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return this.wires.map((_, index) => index);
    return this.collect([this.cells.get(cellKey(Math.floor(point.x / CELL), Math.floor(point.y / CELL))) ?? []]);
  }

  /** Индексы отрезков, рамка которых может пересекаться с рамкой отрезка `index`; по возрастанию. */
  near(index: number): number[] {
    const range = this.range(this.wires[index] as WireSegment);
    if (!range) return this.wires.map((_, other) => other);
    const lists: number[][] = [];
    for (let cx = range.x0; cx <= range.x1; cx += 1) {
      for (let cy = range.y0; cy <= range.y1; cy += 1) {
        const list = this.cells.get(cellKey(cx, cy));
        if (list) lists.push(list);
      }
    }
    return this.collect(lists);
  }

  private range(wire: WireSegment): { x0: number; x1: number; y0: number; y1: number } | undefined {
    const x0 = Math.floor((Math.min(wire.from.x, wire.to.x) - PAD) / CELL);
    const x1 = Math.floor((Math.max(wire.from.x, wire.to.x) + PAD) / CELL);
    const y0 = Math.floor((Math.min(wire.from.y, wire.to.y) - PAD) / CELL);
    const y1 = Math.floor((Math.max(wire.from.y, wire.to.y) + PAD) / CELL);
    if (![x0, x1, y0, y1].every(Number.isFinite)) return undefined;
    if ((x1 - x0 + 1) * (y1 - y0 + 1) > MAX_CELLS) return undefined;
    return { x0, x1, y0, y1 };
  }

  private collect(lists: readonly (readonly number[])[]): number[] {
    this.pass += 1;
    const result: number[] = [];
    for (const list of [...lists, this.always]) {
      for (const index of list) {
        if (this.stamp[index] === this.pass) continue;
        this.stamp[index] = this.pass;
        result.push(index);
      }
    }
    return result.sort((a, b) => a - b);
  }
}
