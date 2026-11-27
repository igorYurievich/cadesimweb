import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { importCad } from '@model/cad-import';
import { terminalPosition } from '@model/geometry';
import type { Schema, SchemaElement } from '@model/types';
import { continuity, voltageBetween } from '@engine/meter';
import { probeContact } from '@engine/meter-probe';
import { createEmptyInputs, simulate } from '@engine/simulate';
import { cachedNets } from '@engine/topology';
import { terminalKey } from '@engine/types';
import { readMeter } from '../src/ui/multimeter/meter-reading';
import { formatVolts } from '../src/ui/multimeter/meter-reading';

const DEMO = resolve(process.cwd(), 'src/data/examples/Ejemplos 2/Ejemplo 2.8.cad');
const demo = (): Schema => importCad(readFileSync(DEMO, 'utf8')).schema;

function netOf(schema: Schema, element: SchemaElement, label: string): number {
  const index = element.terminals.findIndex((terminal) => terminal.label === label);
  const net = cachedNets(schema).terminalNet[terminalKey(element.id, index)];
  if (net === undefined) throw new Error(`no net ${element.name}:${label}`);
  return net;
}

describe('multimeter: voltage', () => {
  it('reads 400 V between phases, 230 V to neutral, 24 V DC and 0 on dead wires', () => {
    expect(voltageBetween(['L1'], ['L2'])).toEqual({ volts: 400, dc: false });
    expect(voltageBetween(['L3'], ['N'])).toEqual({ volts: 230, dc: false });
    expect(voltageBetween(['PE'], ['L2'])).toEqual({ volts: 230, dc: false });
    expect(voltageBetween(['N'], ['PE']).volts).toBe(0);
    expect(voltageBetween(['L1'], ['L1']).volts).toBe(0);
    expect(voltageBetween(['+'], ['-'])).toEqual({ volts: 24, dc: true });
    expect(voltageBetween(['-'], ['+'])).toEqual({ volts: -24, dc: true });
    expect(voltageBetween(['L1'], []).volts).toBe(0);
    expect(voltageBetween(['L1'], ['+']).volts).toBe(0);
    expect([400, 230, 24, 0, -24].map(formatVolts)).toEqual(['400', '230', '24.0', '0.0', '-24.0']);
  });

  it('measures a running demo schema: L1–L2 400 V, L1–N 230 V', () => {
    const schema = demo();
    const result = simulate({ schema, inputs: createEmptyInputs(), time: 0 });
    const potentials = (net: number) => result.nets.find((item) => item.id === net)?.potentials ?? [];
    const supply = schema.elements.filter((element) => element.terminals.some((t) => t.label === 'L1'));
    const l1 = supply.map((element) => netOf(schema, element, 'L1'))[0] as number;
    const l2 = supply.map((element) => netOf(schema, element, 'L2'))[0] as number;
    const nStrip = schema.elements.find((element) => element.terminals.some((t) => t.label === 'N')) as SchemaElement;
    const n = netOf(schema, nStrip, 'N');
    expect(voltageBetween(potentials(l1), potentials(l2)).volts).toBe(400);
    expect(voltageBetween(potentials(l1), potentials(n)).volts).toBe(230);
  });
});

describe('multimeter: continuity', () => {
  it('beeps through a closed NC contact and not through an open NO contact', () => {
    const schema = demo();
    const inputs = createEmptyInputs();
    const contacts = schema.elements.filter((element) => element.terminals.some((t) => t.label === '11'));
    const nc = contacts.find((element) => element.terminals.some((t) => t.label === '12')) as SchemaElement;
    expect(continuity({ schema, inputs }, netOf(schema, nc, '11'), netOf(schema, nc, '12'))).toBe(true);
    const no = schema.elements.find((element) =>
      element.name.includes('KM1') && element.terminals.some((t) => t.label === '13'));
    expect(no).toBeDefined();
    const noEl = no as SchemaElement;
    expect(continuity({ schema, inputs }, netOf(schema, noEl, '13'), netOf(schema, noEl, '14'))).toBe(false);
  });

  it('burns when the probes touch a live net in Ω mode', () => {
    const schema = demo();
    const result = simulate({ schema, inputs: createEmptyInputs(), time: 0 });
    const live = result.nets.find((net) => net.potentials.length > 0)?.id;
    const inputs = createEmptyInputs();
    const reading = readMeter({ mode: 'ohm', schema, result, inputs }, { red: live, black: undefined });
    expect(reading.burns).toBe(true);
    const safe = readMeter({ mode: 'ohm', schema, result: undefined, inputs }, { red: live, black: live });
    expect(safe).toEqual({ display: { kind: 'ohm', closed: true }, burns: false });
  });
});

describe('multimeter: probe contact', () => {
  it('snaps to a terminal and finds its net', () => {
    const schema = demo();
    const element = schema.elements.find((item) => item.terminals.length > 1) as SchemaElement;
    const at = terminalPosition(element, 0);
    if (!at) throw new Error('no terminal');
    const contact = probeContact(schema, { x: at.x + 0.3, y: at.y - 0.2 }, 2);
    expect(contact?.point).toEqual(at);
    expect(contact?.net).toBe(cachedNets(schema).terminalNet[terminalKey(element.id, 0)]);
    expect(probeContact(schema, { x: -1000, y: -1000 }, 2)).toBeUndefined();
  });
});
