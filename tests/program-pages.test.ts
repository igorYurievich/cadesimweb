import { describe, expect, it } from 'vitest';
import { createEngineInput, simulate } from '@engine/index';
import { exportCad } from '@model/cad-export';
import { importCad } from '@model/cad-import';
import { schemaBounds, terminalPosition } from '@model/geometry';
import {
  PAGE_PITCH, ensureProgramPage, growProgramPagesToContent, programPageSize, packProgramPagesForCad, pageOfElement, pageOrigin, programPageOwner,
} from '@model/program-pages';
import { S7_1200, S7_INDEX } from '@model/s7-1200';
import { parseSchemaJson, serializeSchemaJson } from '@model/schema-json';
import { createEmptySchema } from '@model/types';
import type { Point, Schema, SchemaElement } from '@model/types';
import { clampElementPosition, clampPointToSheet } from '../src/ui/bounds';
import { createPlacedElement } from '../src/ui/helpers';

// Лист программы ПЛК: Ladder на своём листе (x = PAGE_PITCH …), симуляция вместе с основным листом.

function rig(): { schema: Schema; cpu: SchemaElement; lamp: SchemaElement; button: SchemaElement } {
  const schema = createEmptySchema();
  schema.sheet = { ...schema.sheet, width: 420, height: 297 };
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
  const feed = (code: number, to: Point, dy: number): void => { place(code, { x: to.x, y: to.y + dy }); wire({ x: to.x, y: to.y + dy }, to); };
  const cpu = place(S7_1200, { x: 30, y: 60 });
  feed(3008, at(cpu, S7_INDEX.L), -18);
  feed(3009, at(cpu, S7_INDEX.M), -18);
  feed(3009, at(cpu, S7_INDEX.INPUT_COMMON), -18);
  const button = place(8000, { x: at(cpu, S7_INDEX.FIRST_INPUT).x, y: 18 }, 'S1');
  feed(3008, at(button, 0), -6);
  wire(at(button, 1), at(cpu, S7_INDEX.FIRST_INPUT));
  feed(3008, at(cpu, S7_INDEX.OUTPUT_SUPPLY), 18);
  feed(3009, at(cpu, S7_INDEX.OUTPUT_COMMON), 18);
  const q0 = at(cpu, S7_INDEX.FIRST_OUTPUT);
  const lamp = place(9008, { x: q0.x, y: q0.y + 12 });
  wire(q0, at(lamp, 0));
  feed(3009, at(lamp, 1), 6);
  // Программа на листе 1, в тех же «местных» координатах, что и на основном листе.
  const page = ensureProgramPage(schema, cpu);
  schema.sheet = { ...schema.sheet };
  const ox = pageOrigin(page);
  place(3008, { x: ox + 30, y: 60 }); place(3009, { x: ox + 105, y: 60 });
  for (const x of [ox + 30, ox + 105]) wire({ x, y: 60 }, { x, y: 66 });
  place(10050, { x: ox + 39, y: 66 }, 'I0.0'); place(10060, { x: ox + 60, y: 66 }, 'Q0.0');
  for (const [a, b] of [[ox + 30, ox + 39], [ox + 51, ox + 60], [ox + 72, ox + 105]] as const) wire({ x: a, y: 66 }, { x: b, y: 66 });
  return { schema, cpu, lamp, button };
}

const lit = (schema: Schema, lamp: SchemaElement, pressed: SchemaElement[]): boolean => {
  const input = createEngineInput(schema);
  for (const element of pressed) input.inputs.pressed[element.id] = true;
  return simulate(input).lamps[lamp.id] ?? false;
};

describe('PLC program pages', () => {
  it('runs the ladder from the program page together with the schematic', () => {
    const { schema, cpu, lamp, button } = rig();
    expect(schema.sheet.programPages).toBe(1);
    expect(programPageOwner(schema, 1)?.id).toBe(cpu.id);
    expect(schema.elements.filter((e) => pageOfElement(e) === 1).map((e) => e.typeCode).sort((a, b) => a - b))
      .toEqual([3008, 3009, 10050, 10060]);
    expect([lit(schema, lamp, []), lit(schema, lamp, [button])]).toEqual([false, true]);
  });

  it('keeps the program page through JSON and through .cad (right of the frame)', () => {
    const { schema, lamp, button } = rig();
    const json = parseSchemaJson(serializeSchemaJson(schema));
    expect(lit(json, lamp, [button])).toBe(true);
    const packed = packProgramPagesForCad(schema);
    const packedLadder = packed.elements.filter((e) => e.typeCode === 10050)[0]!;
    expect(packedLadder.position.x).toBeGreaterThan(schema.sheet.width);
    expect(packedLadder.position.x).toBeLessThan(2 * schema.sheet.width + 30);
    const again = importCad(exportCad(schema)).schema;
    expect(again.sheet.programPages).toBe(1);
    // .cad сдвигает всю схему по y под рамку CADe_SIMU; по x листы возвращаются на место.
    expect(again.elements.map((e) => e.position.x)).toEqual(schema.elements.map((e) => e.position.x));
    const dy = again.elements[0]!.position.y - schema.elements[0]!.position.y;
    expect(again.elements.map((e) => e.position.y - dy)).toEqual(schema.elements.map((e) => e.position.y));
    expect(again.wires.map((w) => [w.from.x, w.to.x])).toEqual(schema.wires.map((w) => [w.from.x, w.to.x]));
    expect(programPageOwner(again, 1)?.typeCode).toBe(S7_1200);
    expect(lit(again, again.elements.find((e) => e.id === lamp.id)!, [again.elements.find((e) => e.id === button.id)!]))
      .toBe(true);
  });

  it('fits and clamps per page', () => {
    const { schema } = rig();
    const main = schemaBounds(schema)!;
    expect(main.maxX).toBeLessThan(schema.sheet.width);
    expect(schemaBounds(schema, undefined, 1)!.minX).toBeGreaterThanOrEqual(PAGE_PITCH);
    // Лист программы по умолчанию того же размера, что основной (420 × 297), размер задаётся отдельно.
    expect(clampPointToSheet({ x: PAGE_PITCH + 500, y: 500 }, schema.sheet)).toEqual({ x: PAGE_PITCH + 420, y: 297 });
    schema.sheet.programPageWidth = 180; schema.sheet.programPageHeight = 120;
    expect(clampPointToSheet({ x: PAGE_PITCH + 500, y: 500 }, schema.sheet)).toEqual({ x: PAGE_PITCH + 180, y: 120 });
    // Шире основного листа лист программы не бывает (в .cad он пишется полосой справа от рамки).
    schema.sheet.programPageWidth = 999;
    expect(programPageSize(schema.sheet).width).toBe(420);
    // Содержимое за краем листа увеличивает лист (старые схемы и .cad).
    schema.sheet.programPageWidth = 60; schema.sheet.programPageHeight = 30;
    expect(growProgramPagesToContent(schema)).toBe(true);
    expect(programPageSize(schema.sheet)).toEqual({ width: 117, height: 81 });
    expect(growProgramPagesToContent(schema)).toBe(false);
    expect(clampPointToSheet({ x: 2 * PAGE_PITCH + 5, y: 10 }, schema.sheet).x).toBe(420);
    const contact = schema.elements.find((e) => e.typeCode === 10050)!;
    expect(clampElementPosition({ x: PAGE_PITCH - 6, y: 30 }, contact, schema.sheet).x).toBeGreaterThanOrEqual(PAGE_PITCH);
  });

  it('leaves plain CADe files and schematics without a PLC alone', () => {
    const schema = createEmptySchema();
    const far = createPlacedElement(9008, { x: 30, y: 30 }, 0, schema);
    schema.elements.push(far);
    expect(importCad(exportCad(schema)).schema.sheet.programPages).toBeUndefined();
  });
});
