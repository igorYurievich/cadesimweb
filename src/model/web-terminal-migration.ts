import { getCadType } from './cad-types';
import { buildTerminals, rotateOffset } from './geometry';
import { MECH_BULB, BULB_SIZE } from './mechanisms';
import { STAIR_TIMER_2D, STAIR_TIMER_SIZE } from './stair-timer';
import type { Point, Schema, Size } from './types';

/**
 * Элементы только веб-версии, у которых 21.11.2026 уменьшили рамку и сдвинули клеммы: минутник Alst 8 (было 15×45,
 * клеммы (3, 0) (12, 0) (3, 42) (12, 42)) и лампочка E27 (было 24×36, клеммы (9, 36) (15, 36)).
 * Старые схемы (JSON с прежними смещениями клемм, JSON или .cad с прежней рамкой) переводятся на новую раскладку:
 * клеммы и рамка пересчитываются, концы проводов из старых точек клемм переезжают в новые.
 */
const OLD_LAYOUTS: Readonly<Record<number, { points: readonly Point[]; size: Size }>> = {
  [STAIR_TIMER_2D]: {
    points: [{ x: 3, y: 0 }, { x: 12, y: 0 }, { x: 3, y: 42 }, { x: 12, y: 42 }], size: { w: 15, h: 45 },
  },
  [MECH_BULB]: { points: [{ x: 9, y: 36 }, { x: 15, y: 36 }], size: { w: 24, h: 36 } },
};

const NEW_SIZES: Readonly<Record<number, Size>> = { [STAIR_TIMER_2D]: STAIR_TIMER_SIZE, [MECH_BULB]: BULB_SIZE };

const same = (a: Point, b: Point): boolean => a.x === b.x && a.y === b.y;

export function migrateResizedWebTerminals(schema: Schema): void {
  for (const element of schema.elements) {
    const old = OLD_LAYOUTS[element.typeCode];
    const size = NEW_SIZES[element.typeCode];
    if (!old || !size) continue;
    const rotation = element.rotation;
    const labels = element.terminals.map((terminal) => terminal.label);
    const fresh = buildTerminals(getCadType(element.typeCode), labels.length, size, rotation, labels);
    const at = (offset: Point): Point => ({ x: element.position.x + offset.x, y: element.position.y + offset.y });
    const oldAbs = old.points.map((point) => at(rotateOffset(point, rotation)));
    const newAbs = fresh.map((terminal) => at(terminal.offset));
    const storedOld = element.terminals.length === old.points.length
      && element.terminals.every((terminal, k) => same(terminal.offset, rotateOffset(old.points[k]!, rotation)));
    const oldSize = rotation % 2 === 1 ? { w: old.size.h, h: old.size.w } : old.size;
    // В JSON лежат смещения клемм и рамка, в .cad — рамка: по старой рамке и узнаём схему до уменьшения.
    const sizeOld = element.size.w === oldSize.w && element.size.h === oldSize.h;
    if (!storedOld && !sizeOld) continue;
    for (const wire of schema.wires) {
      for (const key of ['from', 'to'] as const) {
        const k = oldAbs.findIndex((point) => same(point, wire[key]));
        if (k >= 0 && newAbs[k]) wire[key] = { ...newAbs[k]! };
      }
    }
    element.terminals = fresh;
    element.size = rotation % 2 === 1 ? { w: size.h, h: size.w } : { ...size };
  }
}
