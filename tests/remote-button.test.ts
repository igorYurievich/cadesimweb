import { describe, expect, it } from 'vitest';
import { createEngineInput, simulate } from '@engine/index';
import { exportCad } from '@model/cad-export';
import { importCad } from '@model/cad-import';
import { terminalPosition } from '@model/geometry';
import { MECH_PUSH } from '@model/mechanisms';
import { createEmptySchema } from '@model/types';
import type { Point, SchemaElement } from '@model/types';
import { createPlacedElement } from '../src/ui/helpers';

// «Botón pulsador» 8023: круглая кнопка без клемм нажимает одноимённые кнопки схемы и хранит любой цвет.

function rig(buttonCode: number) {
  // У кнопки 2D НО-контакт — .3–.4 (клеммы 1 и 3), у остальных — первые две клеммы.
  const [a, b] = buttonCode === 8100 ? [1, 3] : [0, 1];
  const schema = createEmptySchema();
  const place = (code: number, at: Point, name?: string): SchemaElement => {
    const element = createPlacedElement(code, at, 0, schema);
    if (name !== undefined) element.name = name;
    schema.elements.push(element);
    return element;
  };
  const wire = (a: Point, b: Point): void => {
    const id = Math.max(0, ...schema.elements.map((e) => e.id), ...schema.wires.map((w) => w.id)) + 1;
    schema.wires.push({ id, typeCode: 4000, kind: 'phase', from: { ...a }, to: { ...b }, thickness: 1, dot: false });
  };
  const at = (element: SchemaElement, index: number) => terminalPosition(element, index) as Point;
  const button = place(buttonCode, { x: 60, y: 60 }, 'S1');
  const l1 = place(3000, { x: at(button, a).x, y: at(button, a).y - 9 });
  wire(at(l1, 0), at(button, a));
  const lamp = place(9008, { x: at(button, b).x + 30, y: at(button, b).y + 12 });
  wire(at(button, b), at(lamp, 0));
  const n = place(3001, { x: at(lamp, 1).x, y: at(lamp, 1).y + 9 });
  wire(at(lamp, 1), at(n, 0));
  const remote = place(8023, { x: 150, y: 60 }, 'S1');
  const run = (pressed: SchemaElement[]) => {
    const input = createEngineInput(schema);
    for (const element of pressed) input.inputs.pressed[element.id] = true;
    return simulate(input).lamps[lamp.id] ?? false;
  };
  return { schema, remote, run };
}

describe('Botón pulsador 8023 as a remote push button', () => {
  for (const [code, title] of [[8000, 'Pulsador NA'], [8100, 'pushbutton 2D'], [MECH_PUSH, 'mechanism push']] as const) {
    it(`presses the same-named ${title} (${code})`, () => {
      const { remote, run } = rig(code);
      expect([run([]), run([remote])]).toEqual([false, true]);
    });
  }

  it('does nothing for a different name', () => {
    const { remote, run } = rig(8000);
    remote.name = 'S2';
    expect(run([remote])).toBe(false);
  });

  it('keeps any colour in .cad', () => {
    const { schema, remote } = rig(8000);
    remote.params.buttonColor = '#7a2cff';
    const again = importCad(exportCad(schema)).schema;
    expect(again.elements.find((e) => e.typeCode === 8023)?.params.buttonColor).toBe('#7a2cff');
  });
});
