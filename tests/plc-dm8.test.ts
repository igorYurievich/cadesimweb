import { describe, expect, it } from 'vitest';
import { createEngineInput, simulate } from '@engine/index';
import { exportCad } from '@model/cad-export';
import { importCad } from '@model/cad-import';
import { cadTypeForCommand } from '@model/cad-types';
import { terminalPosition } from '@model/geometry';
import { LOGO_BASE, LOGO_DM8, plcAddresses } from '@model/plc-modules';
import { createEmptySchema } from '@model/types';
import type { Point, Schema, SchemaElement } from '@model/types';
import { createPlacedElement } from '../src/ui/helpers';
import { fixture } from './helpers';

// Расширение LOGO! DM8 (10214, образец plcextendedor.cad): адреса продолжают базовый модуль.
function place(schema: Schema, code: number, at: Point): SchemaElement {
  const element = createPlacedElement(code, at, 0, schema);
  schema.elements.push(element);
  return element;
}

function wire(schema: Schema, a: Point, b: Point): void {
  const id = Math.max(0, ...schema.elements.map((e) => e.id), ...schema.wires.map((w) => w.id)) + 1;
  schema.wires.push({ id, typeCode: 4000, kind: 'phase', from: { ...a }, to: { ...b }, thickness: 1, dot: false });
}

describe('LOGO! DM8 expansion', () => {
  it('reads the sample: palette button, terminals and IP-like tail', () => {
    expect(cadTypeForCommand(33336)?.code).toBe(LOGO_DM8);
    const result = importCad(fixture('plcextendedor.cad'));
    expect(result.unknownTypes).toEqual([]);
    const dm8 = result.schema.elements.find((e) => e.typeCode === LOGO_DM8) as SchemaElement;
    expect(dm8.terminals.map((t) => t.label)).toEqual([
      'P1', 'P2', 'I1', 'I2', 'I3', 'I4', 'Q1.1', 'Q1.2', 'Q2.1', 'Q2.2', 'Q3.1', 'Q3.2', 'Q4.1', 'Q4.2',
    ]);
    expect(exportCad(result.schema)).toMatch(/\*10214#LOGO##1#1#+\*[-\d*]+#LOGO/);
  });

  it('continues the numbering after the base module, left to right, and keeps defaults alone', () => {
    const alone = createEmptySchema();
    const first = place(alone, LOGO_DM8, { x: 150, y: 60 });
    expect(plcAddresses(alone).get(first.id)).toMatchObject({
      inputs: ['I1', 'I2', 'I3', 'I4'], outputs: ['Q1', 'Q2', 'Q3', 'Q4'],
    });
    const second = place(alone, LOGO_DM8, { x: 90, y: 60 });
    place(alone, LOGO_BASE, { x: 0, y: 60 });
    const addresses = plcAddresses(alone);
    expect(addresses.get(second.id)).toMatchObject({ firstInput: 9, firstOutput: 5 });
    expect(addresses.get(first.id)).toMatchObject({
      inputs: ['I13', 'I14', 'I15', 'I16'], outputs: ['Q9', 'Q10', 'Q11', 'Q12'],
    });
    expect(exportCad(alone)).toContain('*10214#LOGO1##9#5#');
    // Клеммы подписаны адресами (после открытия файла и при отрисовке листа).
    const reopened = importCad(exportCad(alone)).schema.elements
      .find((e) => e.typeCode === LOGO_DM8 && e.position.x === 90);
    expect(reopened?.terminals.map((t) => t.label)).toEqual([
      'P1', 'P2', 'I9', 'I10', 'I11', 'I12', 'Q5.1', 'Q5.2', 'Q6.1', 'Q6.2', 'Q7.1', 'Q7.2', 'Q8.1', 'Q8.2',
    ]);
  });

  /**
   * Стенд: базовый LOGO + DM8 (x = 99). Питание P1/P2 от колодок прямо над клеммами, кнопка S1 даёт фазу на I9,
   * на I12 фаза всегда. Лампы H1 (на Q5) и H2 (на Q8): фаза на контакт 1, лампа между контактом 2 и нулём.
   * Программа: I9 → Q5, I12 → Q8.
   */
  function rig(powered: boolean) {
    const schema = createEmptySchema();
    place(schema, LOGO_BASE, { x: 3, y: 60 });
    const dm8 = place(schema, LOGO_DM8, { x: 99, y: 60 });
    const at = (index: number) => terminalPosition(dm8, index) as Point;
    const feed = (code: number, to: Point, dy: number): void => {
      place(schema, code, { x: to.x, y: to.y + dy });
      wire(schema, { x: to.x, y: to.y + dy }, to);
    };
    if (powered) feed(3000, at(0), -18);
    feed(3001, at(1), -18);
    const button = place(schema, 8000, { x: at(2).x, y: 24 });
    button.name = 'S1';
    feed(3000, terminalPosition(button, 0) as Point, -6);
    wire(schema, terminalPosition(button, 1) as Point, at(2));
    feed(3000, at(5), -18);
    const lamps = [[6, 7], [12, 13]].map(([one, two]) => {
      feed(3000, at(one as number), 18);
      const lamp = place(schema, 9008, { x: at(two as number).x, y: at(two as number).y + 12 });
      wire(schema, at(two as number), terminalPosition(lamp, 0) as Point);
      feed(3001, terminalPosition(lamp, 1) as Point, 6);
      return lamp;
    });
    place(schema, 3008, { x: 180, y: 180 });
    place(schema, 3009, { x: 240, y: 180 });
    // Ступени на y = 186 и 198; шины разбиты на отрезки до каждой ступени (соединение — по концам проводов).
    for (const x of [180, 240]) {
      wire(schema, { x, y: 180 }, { x, y: 186 });
      wire(schema, { x, y: 186 }, { x, y: 198 });
    }
    for (const [y, operand, output] of [[186, 'I9', 'Q5'], [198, 'I12', 'Q8']] as const) {
      place(schema, 10050, { x: 189, y }).name = operand;
      place(schema, 10060, { x: 210, y }).name = output;
      for (const [x1, x2] of [[180, 189], [201, 210], [222, 240]] as const) wire(schema, { x: x1, y }, { x: x2, y });
    }
    const run = (pressed: boolean) => {
      const input = createEngineInput(schema);
      if (pressed) input.inputs.pressed[button.id] = true;
      return simulate(input);
    };
    return { run, lamps, dm8 };
  }

  it('reads its inputs as I9…I12 and drives loads on Q5…Q8 through the ladder program', () => {
    const { run, lamps: [h1, h2] } = rig(true);
    const idle = run(false);
    expect([idle.coils.I9, idle.coils.I12, idle.lamps[h1!.id], idle.lamps[h2!.id]]).toEqual([false, true, false, true]);
    const pressed = run(true);
    expect([pressed.coils.I9, pressed.coils.Q5, pressed.lamps[h1!.id]]).toEqual([true, true, true]);
    expect(pressed.faults).toEqual([]);
  });

  it('does nothing without its own supply on P1', () => {
    const { run, lamps: [h1, h2] } = rig(false);
    const pressed = run(true);
    expect([pressed.coils.I9, pressed.coils.I12, pressed.lamps[h1!.id], pressed.lamps[h2!.id]])
      .toEqual([false, false, false, false]);
  });
});
