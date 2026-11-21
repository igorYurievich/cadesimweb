import { describe, expect, it } from 'vitest';
import { createEngineInput, simulate } from '@engine/index';
import { s7MainsSupplied, s7PowerKey } from '@engine/s7-1200';
import { exportCad } from '@model/cad-export';
import { importCad } from '@model/cad-import';
import { cadTypeForCommand } from '@model/cad-types';
import { catalog } from '@model/catalog';
import { hasVerifiedBadge } from '@model/catalog-verification';
import { terminalPosition } from '@model/geometry';
import { S7_1200, S7_1200_COMMAND, S7_INDEX, S7_LABELS } from '@model/s7-1200';
import { createEmptySchema } from '@model/types';
import type { Point, Schema, SchemaElement } from '@model/types';
import { createPlacedElement } from '../src/ui/helpers';

// ПЛК S7-1200 CPU 1215C DC/DC/DC (10230, только веб): питание L+ / M, входы относительно 1M, транзисторные выходы от 4L+.

function place(schema: Schema, code: number, at: Point): SchemaElement {
  const element = createPlacedElement(code, at, 0, schema);
  schema.elements.push(element);
  return element;
}

function wire(schema: Schema, a: Point, b: Point): void {
  const id = Math.max(0, ...schema.elements.map((e) => e.id), ...schema.wires.map((w) => w.id)) + 1;
  schema.wires.push({ id, typeCode: 4000, kind: 'phase', from: { ...a }, to: { ...b }, thickness: 1, dot: false });
}

/**
 * Стенд: CPU в (30, 60). Питание L+ / M и 4L+ / 4M — от «+» / «−» (или от L1 / N при mains); кнопка S1 даёт «+» на I0.0;
 * лампа H1 между Q0.0 и «−». Программа: I0.0 → Q0.0.
 */
function rig({ powered = true, mains = false } = {}) {
  const schema = createEmptySchema();
  schema.sheet = { ...schema.sheet, width: 420, height: 297 };
  const cpu = place(schema, S7_1200, { x: 30, y: 60 });
  const at = (index: number) => terminalPosition(cpu, index) as Point;
  const feed = (code: number, to: Point, dy: number): void => {
    place(schema, code, { x: to.x, y: to.y + dy });
    wire(schema, { x: to.x, y: to.y + dy }, to);
  };
  if (powered) feed(mains ? 3000 : 3008, at(S7_INDEX.L), -18);
  feed(mains ? 3001 : 3009, at(S7_INDEX.M), -18);
  feed(3009, at(S7_INDEX.INPUT_COMMON), -18);
  const button = place(schema, 8000, { x: at(S7_INDEX.FIRST_INPUT).x, y: 18 });
  button.name = 'S1';
  feed(3008, terminalPosition(button, 0) as Point, -6);
  wire(schema, terminalPosition(button, 1) as Point, at(S7_INDEX.FIRST_INPUT));
  feed(3008, at(S7_INDEX.OUTPUT_SUPPLY), 18);
  feed(3009, at(S7_INDEX.OUTPUT_COMMON), 18);
  const q0 = at(S7_INDEX.FIRST_OUTPUT);
  const lamp = place(schema, 9008, { x: q0.x, y: q0.y + 12 });
  wire(schema, q0, terminalPosition(lamp, 0) as Point);
  feed(3009, terminalPosition(lamp, 1) as Point, 6);
  place(schema, 3008, { x: 300, y: 240 });
  place(schema, 3009, { x: 360, y: 240 });
  for (const x of [300, 360]) wire(schema, { x, y: 240 }, { x, y: 246 });
  place(schema, 10050, { x: 309, y: 246 }).name = 'I0.0';
  place(schema, 10060, { x: 330, y: 246 }).name = 'Q0.0';
  for (const [x1, x2] of [[300, 309], [321, 330], [342, 360]] as const) wire(schema, { x: x1, y: 246 }, { x: x2, y: 246 });
  const run = (pressed: boolean) => {
    const input = createEngineInput(schema);
    if (pressed) input.inputs.pressed[button.id] = true;
    return simulate(input);
  };
  return { schema, cpu, lamp, run };
}

describe('PLC S7-1200 CPU 1215C DC/DC/DC (10230)', () => {
  it('is the PLC palette button 33240 with a green badge and real terminal names', () => {
    expect(cadTypeForCommand(S7_1200_COMMAND)?.code).toBe(S7_1200);
    expect(catalog.getById(S7_1200_COMMAND)?.groups).toContain('io-plc');
    expect(hasVerifiedBadge('io-plc', S7_1200_COMMAND)).toBe(true);
    const schema = createEmptySchema();
    const cpu = place(schema, S7_1200, { x: 0, y: 0 });
    expect(cpu.name).toBe('PLC');
    expect(cpu.terminals.map((t) => t.label)).toEqual([...S7_LABELS]);
    expect(S7_LABELS.slice(0, 5)).toEqual(['L+', 'M', '1M', '.0', '.1']);
  });

  it('reads I0.0 and switches Q0.0 from 4L+ through the ladder program', () => {
    const { cpu, lamp, run } = rig();
    const idle = run(false);
    expect([idle.coils[s7PowerKey(cpu)], idle.coils['I0.0'], idle.lamps[lamp.id]]).toEqual([true, false, false]);
    const pressed = run(true);
    expect([pressed.coils['I0.0'], pressed.coils['Q0.0'], pressed.lamps[lamp.id]]).toEqual([true, true, true]);
    expect(pressed.faults).toEqual([]);
  });

  it('stays in STOP without L+: inputs and outputs are off', () => {
    const { cpu, lamp, run } = rig({ powered: false });
    const state = run(true);
    expect([state.coils[s7PowerKey(cpu)], state.coils['I0.0'], state.lamps[lamp.id]]).toEqual([false, false, false]);
  });

  it('runs from the 230 V mains but is listed for the yellow warning', () => {
    const dc = rig();
    const dcState = dc.run(false);
    expect(s7MainsSupplied(dc.schema, dcState.terminalNet, dcState.nets)).toEqual([]);
    const ac = rig({ mains: true });
    const acState = ac.run(false);
    expect(acState.coils[s7PowerKey(ac.cpu)]).toBe(true);
    expect(s7MainsSupplied(ac.schema, acState.terminalNet, acState.nets).map((e) => e.id)).toEqual([ac.cpu.id]);
  });

  it('writes the CPU to .cad and reads it back with its terminals', () => {
    const { schema } = rig();
    const again = importCad(exportCad(schema));
    expect(again.unknownTypes).toEqual([]);
    const cpu = again.schema.elements.find((e) => e.typeCode === S7_1200);
    expect(cpu?.name).toBe('PLC');
    expect(cpu?.terminals.map((t) => t.label)).toEqual([...S7_LABELS]);
  });
});
