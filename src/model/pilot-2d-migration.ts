/**
 * Пилот 2D 8101: до 2026-11-26 веб-версия ставила клеммы X1 (3, 0) и X2 (3, 21) — догадка без проводов. По файлам
 * CADe_SIMU (tests/fixtures/s7-1214) они на (0, 0) и (0, 18). Схема из автосохранения со старыми клеммами
 * переносится: пилот сдвигается так, чтобы X1 осталась на месте, а концы проводов у старой X2 — на новую X2.
 */

import { rotateOffset } from './geometry';
import { PILOT_2D } from './realistic-2d-types';
import type { Point, Schema } from './types';

const OLD: readonly Point[] = [{ x: 3, y: 0 }, { x: 3, y: 21 }];
const NEW: readonly Point[] = [{ x: 0, y: 0 }, { x: 0, y: 18 }];

const same = (a: Point | undefined, b: Point): boolean => a !== undefined && a.x === b.x && a.y === b.y;

export function migratePilot2dTerminals(schema: Schema): void {
  for (const element of schema.elements) {
    if (element.typeCode !== PILOT_2D || element.terminals.length !== 2) continue;
    const old = OLD.map((p) => rotateOffset(p, element.rotation));
    if (!element.terminals.every((terminal, k) => same(terminal.offset, old[k] as Point))) continue;
    const fresh = NEW.map((p) => rotateOffset(p, element.rotation));
    const [oldX1, oldX2] = old as [Point, Point];
    const [newX1, newX2] = fresh as [Point, Point];
    const position = { x: element.position.x + oldX1.x - newX1.x, y: element.position.y + oldX1.y - newX1.y };
    const from = { x: element.position.x + oldX2.x, y: element.position.y + oldX2.y };
    const to = { x: position.x + newX2.x, y: position.y + newX2.y };
    for (const wire of schema.wires) {
      if (same(wire.from, from)) wire.from = { ...to };
      if (same(wire.to, from)) wire.to = { ...to };
    }
    element.position = position;
    element.terminals = element.terminals.map((terminal, k) => ({ ...terminal, offset: { ...(fresh[k] as Point) } }));
  }
}
