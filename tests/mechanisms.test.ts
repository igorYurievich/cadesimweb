import { describe, expect, it } from 'vitest';
import { createEngineInput, simulate } from '@engine/index';
import { exportCad } from '@model/cad-export';
import { importCad } from '@model/cad-import';
import { cadTypeForCommand } from '@model/cad-types';
import { catalog } from '@model/catalog';
import { hasVerifiedBadge } from '@model/catalog-verification';
import { terminalPosition } from '@model/geometry';
import {
  MECHANISM_COMMANDS, MECHANISM_SPECS, MECHANISM_TYPES, MECH_BULB, MECH_CROSS, MECH_PUSH, MECH_SOCKET, MECH_TWO_WAY,
} from '@model/mechanisms';
import { createEmptySchema } from '@model/types';
import type { Point, SchemaElement } from '@model/types';
import { createPlacedElement } from '../src/ui/helpers';

// Механизмы Niessen (только веб): выключатель, проходной и перекрёстный переключатели, кнопка, розетка.

function bench() {
  const schema = createEmptySchema();
  schema.sheet = { ...schema.sheet, width: 420, height: 297 };
  const place = (code: number, at: Point): SchemaElement => {
    const element = createPlacedElement(code, at, 0, schema);
    schema.elements.push(element);
    return element;
  };
  const wire = (a: Point, b: Point): void => {
    const id = Math.max(0, ...schema.elements.map((e) => e.id), ...schema.wires.map((w) => w.id)) + 1;
    schema.wires.push({ id, typeCode: 4000, kind: 'phase', from: { ...a }, to: { ...b }, thickness: 1, dot: false });
  };
  const at = (element: SchemaElement, index: number) => terminalPosition(element, index) as Point;
  const feed = (code: number, to: Point, dy: number): void => {
    place(code, { x: to.x, y: to.y + dy });
    wire({ x: to.x, y: to.y + dy }, to);
  };
  /** Лампа: X1 к точке, X2 на N. */
  const lamp = (from: Point): SchemaElement => {
    const h = place(9008, { x: from.x, y: from.y + 12 });
    wire(from, at(h, 0));
    feed(3001, at(h, 1), 9);
    return h;
  };
  return { schema, place, wire, at, feed, lamp };
}

describe('mechanisms (8120…8124, web only)', () => {
  it('form the «Mecanismos» palette category with green badges and their own terminals', () => {
    const group = catalog.getGroup('mechanisms');
    expect(group?.componentIds).toEqual([34003, 34004, 34005, 34006, 34007, 34008]);
    for (const code of MECHANISM_TYPES) {
      const command = MECHANISM_COMMANDS[code]!;
      expect(cadTypeForCommand(command)?.code).toBe(code);
      expect(hasVerifiedBadge('mechanisms', command)).toBe(true);
      const { schema, place } = bench();
      const element = place(code, { x: 30, y: 30 });
      expect(element.terminals.map((t) => t.label)).toEqual([...MECHANISM_SPECS[code]!.labels]);
      expect(element.name).toBe(code === MECH_SOCKET ? 'XS1' : code === MECH_BULB ? 'E1' : 'S1');
      expect(schema.elements).toHaveLength(1);
    }
  });

  it('switch a lamp from three places: two-way, intermediate, two-way', () => {
    const { schema, place, wire, at, feed, lamp } = bench();
    const s1 = place(MECH_TWO_WAY, { x: 30, y: 30 });
    const x = place(MECH_CROSS, { x: 30, y: 81 });
    const s2 = place(MECH_TWO_WAY, { x: 30, y: 132 });
    // S2 перевёрнут логически: L снизу не бывает, поэтому общий L у S2 сверху, а 1 / 2 приходят снизу от «креста».
    feed(3000, at(s1, 0), -9);
    wire(at(s1, 1), at(x, 0));
    wire(at(s1, 2), at(x, 1));
    wire(at(x, 2), at(s2, 1));
    wire(at(x, 3), at(s2, 2));
    // От L второго переключателя — в сторону, к лампе.
    const out = { x: at(s2, 0).x + 60, y: at(s2, 0).y - 6 };
    wire(at(s2, 0), { x: at(s2, 0).x, y: out.y });
    wire({ x: at(s2, 0).x, y: out.y }, out);
    const h = lamp(out);
    const lit = (toggled: SchemaElement[]): boolean => {
      const input = createEngineInput(schema);
      for (const element of toggled) input.inputs.toggled[element.id] = true;
      const state = simulate(input);
      expect(state.faults).toEqual([]);
      return state.lamps[h.id] ?? false;
    };
    // Покой: L → 1 → прямо → 1 → L: горит. Любое одно переключение гасит, два — снова зажигают.
    expect(lit([])).toBe(true);
    expect([lit([s1]), lit([x]), lit([s2])]).toEqual([false, false, false]);
    expect([lit([s1, x]), lit([x, s2]), lit([s1, s2])]).toEqual([true, true, true]);
    expect(lit([s1, x, s2])).toBe(false);
  });

  it('push button lights the lamp only while held', () => {
    const { schema, place, at, feed, lamp } = bench();
    const button = place(MECH_PUSH, { x: 30, y: 30 });
    feed(3000, at(button, 0), -9);
    const h = lamp(at(button, 1));
    const run = (pressed: boolean) => {
      const input = createEngineInput(schema);
      if (pressed) input.inputs.pressed[button.id] = true;
      return simulate(input).lamps[h.id] ?? false;
    };
    expect([run(false), run(true)]).toEqual([false, true]);
  });

  it('light bulb E27 lights from a switch like a signal lamp', () => {
    const { schema, place, at, feed, wire } = bench();
    const sw = place(MECHANISM_TYPES[0], { x: 30, y: 30 });
    feed(3000, at(sw, 0), -9);
    const bulb = place(MECH_BULB, { x: 27, y: 72 });
    wire(at(sw, 1), at(bulb, 0));
    feed(3001, at(bulb, 1), 9);
    const run = (on: boolean) => {
      const input = createEngineInput(schema);
      if (on) input.inputs.toggled[sw.id] = true;
      const state = simulate(input);
      expect(state.faults).toEqual([]);
      return state.lamps[bulb.id] ?? false;
    };
    expect([run(false), run(true)]).toEqual([false, true]);
  });

  it('are written to .cad and read back', () => {
    const { schema, place } = bench();
    MECHANISM_TYPES.forEach((code, k) => place(code, { x: 30 + 36 * k, y: 30 }));
    const again = importCad(exportCad(schema));
    expect(again.unknownTypes).toEqual([]);
    expect(again.schema.elements.map((e) => e.typeCode)).toEqual([...MECHANISM_TYPES]);
    expect(again.schema.elements.map((e) => e.terminals.length)).toEqual([2, 3, 4, 2, 3, 2]);
  });
});
