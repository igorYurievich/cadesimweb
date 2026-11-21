import { describe, expect, it } from 'vitest';
import { exportCad } from '@model/cad-export';
import { importCad } from '@model/cad-import';
import { terminalPosition } from '@model/geometry';
import { MECH_BULB } from '@model/mechanisms';
import { parseSchemaJson, serializeSchemaJson } from '@model/schema-json';
import { STAIR_TIMER_2D } from '@model/stair-timer';
import { migrateResizedWebTerminals } from '@model/web-terminal-migration';
import { createEmptySchema } from '@model/types';
import type { Point, Schema, SchemaElement } from '@model/types';
import { createPlacedElement } from '../src/ui/helpers';

// Схемы, сохранённые до уменьшения минутника (15×45) и лампочки (24×36): клеммы и провода переезжают на новые точки.

/** Схема «как раньше»: минутник и перевёрнутая лампочка со старыми клеммами и проводами к ним. */
function oldSchema(): { schema: Schema; ends: Point[][] } {
  const schema = createEmptySchema();
  const timer = createPlacedElement(STAIR_TIMER_2D, { x: 30, y: 30 }, 0, schema);
  schema.elements.push(timer);
  const bulb = createPlacedElement(MECH_BULB, { x: 120, y: 120 }, 2, schema);
  schema.elements.push(bulb);
  const shape = (element: SchemaElement, points: Point[], size: { w: number; h: number }, sign: number) => {
    element.terminals = points.map((p, k) => ({
      label: element.terminals[k]!.label, offset: { x: sign * p.x + 0, y: sign * p.y + 0 },
    }));
    element.size = size;
  };
  shape(timer, [{ x: 3, y: 0 }, { x: 12, y: 0 }, { x: 3, y: 42 }, { x: 12, y: 42 }], { w: 15, h: 45 }, 1);
  shape(bulb, [{ x: 9, y: 36 }, { x: 15, y: 36 }], { w: 24, h: 36 }, -1);
  const ends: Point[][] = [];
  let id = 10;
  for (const element of [timer, bulb]) {
    ends.push(element.terminals.map((_, k) => terminalPosition(element, k)!));
    for (const end of ends.at(-1)!) {
      const from = { x: end.x + 1, y: end.y - 9 };
      schema.wires.push({ id: id++, typeCode: 4000, kind: 'phase', from, to: end, thickness: 1, dot: false });
    }
  }
  return { schema, ends };
}

const attached = (schema: Schema) => schema.elements.map((element) =>
  element.terminals.map((_, k) => {
    const at = terminalPosition(element, k)!;
    return schema.wires.some((wire) => wire.to.x === at.x && wire.to.y === at.y);
  }));

describe('resized web elements: old schemes keep their wires', () => {
  it('JSON autosave: terminals move to the new layout and wire ends follow them', () => {
    const { schema } = oldSchema();
    const again = parseSchemaJson(serializeSchemaJson(schema));
    const [timer, bulb] = again.elements;
    expect(timer!.terminals.map((t) => t.offset))
      .toEqual([{ x: 3, y: 0 }, { x: 9, y: 0 }, { x: 3, y: 27 }, { x: 9, y: 27 }]);
    expect(timer!.size).toEqual({ w: 15, h: 30 });
    expect(bulb!.terminals.map((t) => t.offset)).toEqual([{ x: -6, y: -27 }, { x: -12, y: -27 }]);
    expect(attached(again)).toEqual([[true, true, true, true], [true, true]]);
  });

  it('.cad: old frame and wires at the old terminal points are reattached', () => {
    // importCad строит клеммы по типу (уже новые), а рамка и провода в файле — старые.
    const { schema } = oldSchema();
    const fresh = createEmptySchema();
    for (const element of schema.elements) {
      const placed = createPlacedElement(element.typeCode, element.position, element.rotation, fresh);
      element.terminals = placed.terminals;
    }
    migrateResizedWebTerminals(schema);
    expect(schema.elements.map((e) => e.size)).toEqual([{ w: 15, h: 30 }, { w: 18, h: 27 }]);
    expect(attached(schema)).toEqual([[true, true, true, true], [true, true]]);
    expect(importCad(exportCad(schema)).unknownTypes).toEqual([]);
  });

  it('leaves new schemes alone', () => {
    const schema = createEmptySchema();
    const timer = createPlacedElement(STAIR_TIMER_2D, { x: 30, y: 30 }, 0, schema);
    schema.elements.push(timer);
    const at = terminalPosition(timer, 1)!;
    const from = { x: at.x, y: at.y - 9 };
    schema.wires.push({ id: 9, typeCode: 4000, kind: 'phase', from, to: at, thickness: 1, dot: false });
    const again = parseSchemaJson(serializeSchemaJson(schema));
    expect(again.wires[0]!.to).toEqual(at);
    expect(again.elements[0]!.terminals).toEqual(timer.terminals);
  });
});
