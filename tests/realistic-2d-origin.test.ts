import { describe, expect, it } from 'vitest';
import { importCad } from '@model/cad-import';
import { AUTOMATIC_2D, DIFFERENTIAL_2D, REALISTIC_2D_ORIGIN_DX } from '@model/realistic-2d-types';
import { parseSchemaJson, serializeSchemaJson } from '@model/schema-json';
import { fixture } from './helpers';

/** Actividad 1.7, сохранённая в CADe_SIMU 4.2: символы 2D с проводами. */

const key = (x: number, y: number) => `${x},${y}`;
type Placed = { position: { x: number; y: number }; terminals: Array<{ offset: { x: number; y: number } }> };
const absolute = (element: Placed) =>
  element.terminals.map((t) => [element.position.x + t.offset.x, element.position.y + t.offset.y] as const);
const sample = () => importCad(fixture('actividad_1_7_2d.cad')).schema;

describe('2D symbols: element position is the left edge of the body', () => {
  it('puts every wired 2D terminal of Actividad 1.7 on a wire end', () => {
    const schema = sample();
    const ends = new Set(schema.wires.flatMap((wire) => [key(wire.from.x, wire.from.y), key(wire.to.x, wire.to.y)]));
    const onWire = (name: string, typeCode: number) => {
      const element = schema.elements.find((candidate) => candidate.name === name && candidate.typeCode === typeCode)!;
      const points = absolute(element);
      return element.terminals.filter((_, index) => ends.has(key(...points[index]!))).map((terminal) => terminal.label);
    };
    expect(onWire('-F1', AUTOMATIC_2D.IIN)).toEqual(['1', '3', '5', '2', '4', '6']);
    expect(onWire('-F2', DIFFERENTIAL_2D.IN)).toEqual(['N', '1', 'N', '2']);
    expect(onWire('-KM1', 7018)).toEqual(['A1', 'A2', '1', '2', '3', '4', '5', '6', '13', '14']);
    expect(onWire('-Q', 6015)).toEqual(['1', '3', '5', '2', '4', '6']);
    expect(onWire('-S3', 8100)).toEqual(['.1', '.3', '.2', '.4']);
    expect(onWire('-KT1', 7020)).toEqual(['57', '58', '65', '66']);
  });

  it('reads the pole variant from nums[16] ignoring the extra 0..8 part (20 → IIN, 2 → IN)', () => {
    const schema = sample();
    expect(schema.elements.find((element) => element.name === '-F1')!.typeCode).toBe(AUTOMATIC_2D.IIN);
    expect(schema.elements.find((element) => element.name === '-F2')!.typeCode).toBe(DIFFERENTIAL_2D.IN);
  });

  it('keeps old web schemas in place: terminals stay where the wires are, the body moves', () => {
    const schema = sample();
    const element = schema.elements.find((candidate) => candidate.name === '-KM1')!;
    const dx = REALISTIC_2D_ORIGIN_DX[element.typeCode]!;
    const before = absolute(element);
    // Так хранила схему прежняя версия: позиция у клеммы 1, смещения клемм от неё.
    element.position = { x: element.position.x + dx, y: element.position.y };
    element.terminals = element.terminals.map((t) => ({ ...t, offset: { x: t.offset.x - dx, y: t.offset.y } }));
    const loaded = parseSchemaJson(serializeSchemaJson(schema)).elements
      .find((candidate) => candidate.name === '-KM1')!;
    expect(absolute(loaded)).toEqual(before);
    expect(loaded.terminals[2]!.offset.x).toBe(dx);
  });
});
