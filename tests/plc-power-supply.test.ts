import { describe, expect, it } from 'vitest';
import { exportCad } from '@model/cad-export';
import { importCad } from '@model/cad-import';
import { cadTypeForCommand, getCadType } from '@model/cad-types';
import { catalog } from '@model/catalog';
import { hasVerifiedBadge } from '@model/catalog-verification';
import { DIN_PSU_COMMAND, DIN_PSU_LABELS, DIN_PSU_TYPE } from '@model/plc-power-supply';
import { LOGO_LABELS, LOGO_TYPE } from '@model/plc-types';
import type { Schema } from '@model/types';
import { createEngineInput, simulate } from '@engine/index';
import { logoLowVoltageSupplied, logoMainsSupplied } from '@engine/plc';
import { terminalKey } from '@engine/types';
import { el, schemaOf, seg } from './builders';
import { fixture } from './helpers';

// Блок питания 230 В~ → 24 В= на DIN-рейку (10220): вход L N снизу, выход +V −V сверху.
// Схема: колодка L/N → вход блока; +V → P1 и I1 модуля LOGO, −V → P2.

const pointsOf = (code: number, labels: readonly string[]) => {
  const layout = getCadType(code).layout;
  if (layout.kind !== 'points') throw new Error(`у ${code} нет точек клемм`);
  return layout.points.map((p, k) => [p.x, p.y, labels[k] ?? ''] as const);
};

/** PSU в (30, 30): +V (36, 30), −V (42, 30), N (36, 132), L (42, 132); LOGO в (60, 30): P1 72, P2 78, I1 84. */
function build(withPhase = true): Schema {
  const wires = [
    seg(6, 150, 6, 144, { kind: 'neutral' }), seg(6, 144, 36, 144, { kind: 'neutral' }),
    seg(36, 144, 36, 132, { kind: 'neutral' }),
    seg(36, 30, 36, 9), seg(36, 9, 72, 9), seg(72, 9, 72, 30), seg(72, 9, 84, 9), seg(84, 9, 84, 30),
    seg(42, 30, 42, 18), seg(42, 18, 78, 18), seg(78, 18, 78, 30),
  ];
  if (withPhase) wires.push(seg(0, 150, 0, 138), seg(0, 138, 42, 138), seg(42, 138, 42, 132));
  return schemaOf(wires, [
    el(3007, 0, 150, { name: 'X1', terminals: [[0, 0, 'L'], [6, 0, 'N']] }),
    el(DIN_PSU_TYPE, 30, 30, { name: '-G1', terminals: pointsOf(DIN_PSU_TYPE, DIN_PSU_LABELS) }),
    el(LOGO_TYPE, 60, 30, { name: 'LOGO', terminals: pointsOf(LOGO_TYPE, LOGO_LABELS) }),
  ]);
}

const psuOf = (schema: Schema) => schema.elements.find((e) => e.typeCode === DIN_PSU_TYPE);
const logoOf = (schema: Schema) => schema.elements.find((e) => e.typeCode === LOGO_TYPE);

describe('DIN rail power supply 24 V DC (10220)', () => {
  it('is a palette item of the PLC group with a green badge', () => {
    expect(cadTypeForCommand(DIN_PSU_COMMAND)?.code).toBe(DIN_PSU_TYPE);
    expect(catalog.getById(DIN_PSU_COMMAND)?.groups).toEqual(['io-plc']);
    expect(catalog.inGroup('io-plc').map((c) => c.id)).toContain(DIN_PSU_COMMAND);
    expect(hasVerifiedBadge('io-plc', DIN_PSU_COMMAND)).toBe(true);
  });

  it('gives +V and −V from L and N and powers the LOGO with its input', () => {
    const schema = build();
    const state = simulate(createEngineInput(schema));
    const psu = psuOf(schema);
    const logo = logoOf(schema);
    if (!psu || !logo) throw new Error('нет элементов');
    const potentials = (index: number) =>
      state.nets.find((net) => net.id === state.terminalNet[terminalKey(psu.id, index)])?.potentials ?? [];
    expect([potentials(2), potentials(3)]).toEqual([['+'], ['-']]);
    expect([state.coils[`@LOGO${logo.id}`], state.coils.I1]).toEqual([true, true]);
    expect(state.faults).toEqual([]);
  });

  it('has no output and leaves the LOGO off without the phase on its input', () => {
    const schema = build(false);
    const state = simulate(createEngineInput(schema));
    const logo = logoOf(schema);
    if (!logo) throw new Error('нет LOGO');
    expect([state.coils[`@LOGO${logo.id}`], state.coils.I1]).toEqual([false, false]);
  });

  it('writes the block to .cad and reads it back with its terminals', () => {
    const schema = build();
    const again = importCad(exportCad(schema));
    expect(again.unknownTypes).toEqual([]);
    const psu = psuOf(again.schema);
    expect(psu?.name).toBe('-G1');
    expect(psu?.terminals.map((t) => [t.offset.x, t.offset.y, t.label])).toEqual(
      pointsOf(DIN_PSU_TYPE, DIN_PSU_LABELS).map(([x, y, label]) => [x, y, label]),
    );
    expect(simulate(createEngineInput(again.schema)).coils.I1).toBe(true);
  });

  it('warns about a LOGO fed straight from 230 V, not about one fed through the block', () => {
    const throughBlock = build();
    const state = simulate(createEngineInput(throughBlock));
    expect(logoMainsSupplied(throughBlock, state.terminalNet, state.nets)).toEqual([]);
    // Образец CADe_S1.cad: P1 / P2 модуля прямо на L и N — модуль работает, но предупреждение есть.
    const direct = importCad(fixture('CADe_S1.cad')).schema;
    const mains = simulate(createEngineInput(direct));
    expect(logoMainsSupplied(direct, mains.terminalNet, mains.nets).map((e) => e.typeCode)).toEqual([LOGO_TYPE]);
  });

  it('runs a 230 V LOGO straight from L and N without a warning', () => {
    const direct = importCad(fixture('CADe_S1.cad')).schema;
    const logo = logoOf(direct);
    if (!logo) throw new Error('нет LOGO');
    logo.params.supply = 230;
    const state = simulate(createEngineInput(direct));
    expect([state.coils[`@LOGO${logo.id}`], state.coils.I1, state.coils.I2]).toEqual([true, true, true]);
    expect(logoMainsSupplied(direct, state.terminalNet, state.nets)).toEqual([]);
    expect(logoLowVoltageSupplied(direct, state.terminalNet, state.nets)).toEqual([]);
  });

  it('does not start a 230 V LOGO from the 24 V block and warns about it', () => {
    const schema = build();
    const logo = logoOf(schema);
    if (!logo) throw new Error('нет LOGO');
    logo.params.supply = 230;
    const state = simulate(createEngineInput(schema));
    expect([state.coils[`@LOGO${logo.id}`], state.coils.I1]).toEqual([false, false]);
    expect(logoLowVoltageSupplied(schema, state.terminalNet, state.nets).map((e) => e.id)).toEqual([logo.id]);
    expect(logoMainsSupplied(schema, state.terminalNet, state.nets)).toEqual([]);
  });
});
