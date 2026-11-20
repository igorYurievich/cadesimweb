import { describe, expect, it } from 'vitest';
import { exportCad } from '@model/cad-export';
import { importCad } from '@model/cad-import';
import { cadTypeForCommand } from '@model/cad-types';
import { LOGO_TYPE } from '@model/plc-types';
import type { Schema } from '@model/types';
import { createEngineInput, simulate } from '@engine/index';
import type { EngineMemory } from '@engine/types';
import { fixture } from './helpers';

// LOGO! 10202 и Ladder по образцу CADe_S1.cad:
// пуск вперёд (B2 → I3 → Q1 → K1), стоп (B1 → I2), реверс (B3 → I4 → Q2 → K2).
const load = (): Schema => importCad(fixture('CADe_S1.cad')).schema;
const find = (schema: Schema, name: string, code: number) => {
  const element = schema.elements.find((e) => e.name === name && e.typeCode === code);
  if (!element) throw new Error(`нет ${name}`);
  return element;
};

describe('LOGO! and Ladder (CADe_S1.cad)', () => {
  it('maps the palette buttons and reads all records without unknown types', () => {
    expect([33238, 33062, 33063, 33067].map((id) => cadTypeForCommand(id)?.code)).toEqual([10202, 10050, 10051, 10060]);
    const result = importCad(fixture('CADe_S1.cad'));
    expect(result.unknownTypes).toEqual([]);
    const logo = result.schema.elements.find((e) => e.typeCode === LOGO_TYPE);
    const at = (label: string) => {
      const terminal = logo?.terminals.find((t) => t.label === label);
      return terminal && logo ? [logo.position.x + terminal.offset.x, logo.position.y + terminal.offset.y] : undefined;
    };
    expect([at('P1'), at('P2'), at('I1'), at('I4'), at('Q1.1'), at('Q2.2')]).toEqual([
      [30, 66], [36, 66], [42, 66], [60, 66], [30, 168], [54, 168],
    ]);
  });

  it('runs the ladder program: start, seal-in, stop and reverse', () => {
    const schema = load();
    let memory: EngineMemory | undefined;
    const step = (pressed: Record<number, boolean>) => {
      const input = createEngineInput(schema);
      input.inputs.pressed = pressed;
      if (memory) input.memory = memory;
      const state = simulate(input);
      memory = state.memory;
      return [state.coils.Q1, state.coils.Q2, state.coils.K1, state.coils.K2];
    };
    const [b1, b2, b3] = [find(schema, 'B1', 8001).id, find(schema, 'B2', 8000).id, find(schema, 'B3', 8000).id];
    expect(step({})).toEqual([false, false, false, false]);
    expect(step({ [b2]: true })).toEqual([true, false, true, false]);
    expect(step({})).toEqual([true, false, true, false]);
    expect(step({ [b3]: true })).toEqual([true, false, true, false]);
    expect(step({ [b1]: true })).toEqual([false, false, false, false]);
    expect(step({})).toEqual([false, false, false, false]);
    expect(step({ [b3]: true })).toEqual([false, true, false, true]);
  });

  it('keeps inputs and outputs off while the module has no supply', () => {
    const schema = load();
    const logo = schema.elements.find((e) => e.typeCode === LOGO_TYPE);
    if (!logo) throw new Error('нет LOGO');
    schema.wires = schema.wires.filter((w) => !(w.from.x === 30 && w.to.x === 30 && w.to.y === 66));
    const state = simulate(createEngineInput(schema));
    expect([state.coils.I1, state.coils.I2, state.coils[`@LOGO${logo.id}`]]).toEqual([false, false, false]);
  });

  it('writes the module back without terminal flags and keeps its IP address', () => {
    const text = exportCad(load());
    const record = text.match(/\*\d+\*10202#LOGO#[^*]*(\*[-\d]+)+#([^*]*)/);
    expect(record?.[2]).toBe('192.128.0.1');
    const again = importCad(text);
    expect(again.unknownTypes).toEqual([]);
    expect(again.schema.elements.filter((e) => e.typeCode === 10050)).toHaveLength(8);
  });
});
