/**
 * Этап 5.2a: связность отрезков проводов, без клемм.
 *
 * Провод в .cad это отрезок, а не связь «клемма–клемма», поэтому электрическая
 * связность выводится из геометрии. Правила:
 *  - концы двух отрезков совпали -> соединены;
 *  - конец одного отрезка лежит на теле другого (Т) -> соединены; если в этой
 *    точке нет точки соединения 4001, выдаётся предупреждение `t-without-junction`;
 *  - точка соединения 4001 соединяет все отрезки, проходящие через её координату
 *    (в том числе насквозь);
 *  - пересечение двух проходящих насквозь линий без точки соединения разделяет
 *    сети, даже если линии представлены несколькими отрезками;
 *  - отрезок нулевой длины допустим (это просто точка).
 *
 * Номера групп не зависят от порядка отрезков во входе: группы нумеруются по
 * наименьшему id провода в группе.
 */

import type { ElementId, Point, WireSegment } from '../model/types';
import { samePoint } from '../model/geometry';
import { UnionFind } from './union-find';

/**
 * Правило Т-соединения. Если автор подтвердит, что в оригинале конец провода
 * на теле другого без точки 4001 НЕ соединяет, достаточно поставить false.
 */
export const T_JOIN_WITHOUT_JUNCTION = true;

export type WireGroupId = number;

export interface WireLinkWarning {
  code: 't-without-junction';
  /** Точка Т-соединения. */
  at: Point;
  /** Провод, чей конец лежит в точке (a), и провод, на теле которого он лежит (b). */
  wires: [ElementId, ElementId];
  message: string;
}

export interface WireLinks {
  /** Провод (в том числе точка соединения) -> номер группы, с 0 подряд. */
  groupOf: Map<ElementId, WireGroupId>;
  /** Состав групп: id проводов по возрастанию; индекс = номер группы. */
  groups: ElementId[][];
  warnings: WireLinkWarning[];
}

/** Лежит ли точка на отрезке (включая концы). Нулевая длина: точка равна отрезку. */
export function pointOnSegment(p: Point, a: Point, b: Point): boolean {
  const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
  if (cross !== 0) return false;
  return (
    p.x >= Math.min(a.x, b.x) &&
    p.x <= Math.max(a.x, b.x) &&
    p.y >= Math.min(a.y, b.y) &&
    p.y <= Math.max(a.y, b.y)
  );
}

const pointKey = (p: Point): string => `${p.x},${p.y}`;

const EPSILON = 1e-9;

function segmentIntersection(a: WireSegment, b: WireSegment): Point | undefined {
  const rx = a.to.x - a.from.x; const ry = a.to.y - a.from.y;
  const sx = b.to.x - b.from.x; const sy = b.to.y - b.from.y;
  const denominator = rx * sy - ry * sx;
  if (Math.abs(denominator) < EPSILON) return undefined;
  const qx = b.from.x - a.from.x; const qy = b.from.y - a.from.y;
  const t = (qx * sy - qy * sx) / denominator;
  const u = (qx * ry - qy * rx) / denominator;
  if (t < -EPSILON || t > 1 + EPSILON || u < -EPSILON || u > 1 + EPSILON) return undefined;
  return { x: a.from.x + t * rx, y: a.from.y + t * ry };
}

/** Оси, по которым провод непрерывно проходит через точку. */
function throughAxesAt(point: Point, wires: readonly WireSegment[]): Point[] {
  const axes: Point[] = [];
  const rays: Point[] = [];
  const addAxis = (x: number, y: number): void => {
    const length = Math.hypot(x, y);
    if (length < EPSILON) return;
    const axis = { x: x / length, y: y / length };
    if (axis.x < -EPSILON || (Math.abs(axis.x) <= EPSILON && axis.y < 0)) { axis.x *= -1; axis.y *= -1; }
    if (!axes.some((other) => Math.abs(axis.x * other.y - axis.y * other.x) < EPSILON)) axes.push(axis);
  };
  for (const wire of wires) {
    if (isJunction(wire) || !pointOnSegment(point, wire.from, wire.to)) continue;
    const fromAtPoint = samePoint(point, wire.from);
    const toAtPoint = samePoint(point, wire.to);
    if (!fromAtPoint && !toAtPoint) addAxis(wire.to.x - wire.from.x, wire.to.y - wire.from.y);
    else if (fromAtPoint && !toAtPoint) rays.push({ x: wire.to.x - point.x, y: wire.to.y - point.y });
    else if (toAtPoint && !fromAtPoint) rays.push({ x: wire.from.x - point.x, y: wire.from.y - point.y });
  }
  for (let i = 0; i < rays.length; i += 1) for (let j = i + 1; j < rays.length; j += 1) {
    const a = rays[i]!; const b = rays[j]!;
    const lengths = Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y);
    if (lengths < EPSILON) continue;
    const cross = a.x * b.y - a.y * b.x;
    const dot = a.x * b.x + a.y * b.y;
    if (Math.abs(cross) / lengths < EPSILON && dot < 0) addAxis(a.x, a.y);
  }
  return axes;
}

function isJunction(w: WireSegment): boolean {
  return w.kind === 'junction';
}

export function buildWireLinks(wires: readonly WireSegment[]): WireLinks {
  // Рабочий порядок: по id (при равных id по исходному индексу), чтобы результат
  // не зависел от порядка отрезков во входе.
  const order = wires
    .map((w, i) => ({ w, i }))
    .sort((p, q) => p.w.id - q.w.id || p.i - q.i)
    .map((p) => p.w);
  const n = order.length;
  const uf = new UnionFind(n);

  const junctionPoints = new Set<string>();
  for (const w of order) if (isJunction(w)) junctionPoints.add(pointKey(w.from));

  // A crossing is an intersection where both line paths continue through the
  // point. Keep each path connected to itself but do not bridge the paths.
  const crossingPoints = new Set<string>();
  for (let i = 0; i < n; i += 1) {
    const a = order[i] as WireSegment;
    if (isJunction(a)) continue;
    for (let j = i + 1; j < n; j += 1) {
      const b = order[j] as WireSegment;
      if (isJunction(b)) continue;
      const point = segmentIntersection(a, b);
      if (point && throughAxesAt(point, order).length > 1) crossingPoints.add(pointKey(point));
    }
  }

  const warned = new Set<string>();
  const warnings: WireLinkWarning[] = [];

  // Конец `a` лежит на теле `b` строго внутри (не в её конце): Т-соединение.
  const tryT = (ia: number, ib: number): void => {
    const a = order[ia] as WireSegment;
    const b = order[ib] as WireSegment;
    for (const p of [a.from, a.to]) {
      if (!pointOnSegment(p, b.from, b.to)) continue;
      if (samePoint(p, b.from) || samePoint(p, b.to)) continue; // совпадение концов
      if (!T_JOIN_WITHOUT_JUNCTION && !junctionPoints.has(pointKey(p))) continue;
      uf.union(ia, ib);
      if (junctionPoints.has(pointKey(p))) continue;
      const key = `${a.id}|${b.id}|${pointKey(p)}`;
      if (warned.has(key)) continue;
      warned.add(key);
      warnings.push({
        code: 't-without-junction',
        at: { x: p.x, y: p.y },
        wires: [a.id, b.id],
        message: `t-without-junction: конец провода ${a.id} лежит на проводе ${b.id} в (${p.x}, ${p.y}) без точки соединения`,
      });
    }
  };

  for (let i = 0; i < n; i += 1) {
    const a = order[i] as WireSegment;
    for (let j = i + 1; j < n; j += 1) {
      const b = order[j] as WireSegment;
      if (isJunction(a) || isJunction(b)) {
        // Точка соединения: соединяет всё, что проходит через её координату.
        const [jn, other] = isJunction(a) ? [a, b] : [b, a];
        if (isJunction(other)) {
          if (samePoint(jn.from, other.from)) uf.union(i, j);
        } else if (pointOnSegment(jn.from, other.from, other.to)) {
          uf.union(i, j);
        }
        continue;
      }
      const crossing = segmentIntersection(a, b);
      if (crossing && crossingPoints.has(pointKey(crossing)) && !junctionPoints.has(pointKey(crossing))) {
        // Leave the two crossing paths separate until the user places an
        // explicit junction. Collinear pieces still join through endpoint/T rules.
        continue;
      }
      // Совпадение концов.
      const touch = [a.from, a.to].some((p) => samePoint(p, b.from) || samePoint(p, b.to));
      if (touch) uf.union(i, j);
      // Т в обе стороны.
      tryT(i, j);
      tryT(j, i);
    }
  }

  // Точка соединения, проходящая через отрезок, уже объединена парами выше.
  // Группы нумеруем по наименьшему id (порядок `order` уже по id).
  const groupByRoot = new Map<number, WireGroupId>();
  const groups: ElementId[][] = [];
  const groupOf = new Map<ElementId, WireGroupId>();
  for (let i = 0; i < n; i += 1) {
    const root = uf.find(i);
    let g = groupByRoot.get(root);
    if (g === undefined) {
      g = groups.length;
      groupByRoot.set(root, g);
      groups.push([]);
    }
    const w = order[i] as WireSegment;
    (groups[g] as ElementId[]).push(w.id);
    groupOf.set(w.id, g);
  }

  warnings.sort(
    (p, q) =>
      p.wires[0] - q.wires[0] || p.wires[1] - q.wires[1] || p.at.x - q.at.x || p.at.y - q.at.y,
  );
  return { groups, groupOf, warnings };
}
