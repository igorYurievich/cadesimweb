import { describe, expect, it } from 'vitest';
import { catalog } from '@model/catalog';
import { cadTypeForCommand, getCadType, isKnownCadType } from '@model/cad-types';
import { importCad } from '@model/cad-import';
import { createEngineInput, simulate } from '@engine/index';
import { invalidTerminalIndexes, missingBehaviors } from '../src/engine/behaviors';
import { el, schemaOf, seg } from './builders';
import { fixture } from './helpers';

/** Образец motores-elementos.cad: по одной кнопке панели «Motores», в порядке панели. Линейный привод (10550) не делаем. */
const MOTOR_CODES = [1000, 1001, 1002, 1008, 1010, 1003, 1005, 1004, 1006, 1007, 1011, 1012, 1009];
const TERMINALS: Record<number, number> = { 1000: 4, 1001: 7, 1002: 3, 1008: 5, 1010: 4, 1003: 7, 1005: 7, 1004: 7, 1006: 3, 1007: 5, 1011: 6, 1012: 4, 1009: 3 };

describe('motors: panel roster', () => {
  it('every motor button except the linear actuator maps to a .cad type, in panel order', () => {
    const items = catalog.inGroup('motors');
    expect(items).toHaveLength(14);
    expect(items.slice(0, 13).map((c) => cadTypeForCommand(c.id)?.code)).toEqual(MOTOR_CODES);
    expect(cadTypeForCommand(33257)).toBeUndefined();
  });

  it('all motor codes are known and have engine behavior', () => {
    for (const code of MOTOR_CODES) {
      expect(isKnownCadType(code)).toBe(true);
      expect(getCadType(code).family).toBe('motor');
    }
    // Type 8 is a text annotation and intentionally has no engine behavior.
    expect(missingBehaviors()).toEqual([8]);
  });

  it('the sample file imports with the expected terminals; the actuator record (10550) is read but its type is unknown', () => {
    const { schema, warnings, unknownTypes } = importCad(fixture('motores-elementos.cad'));
    // У линейного привода запись длиннее обычной (11 текстовых полей, 24 числа, хвост «-MI»): после расширения парсера (FORMATO_CAD.md §3)
    // она читается без предупреждений, но тип 10550 в таблице нет: клеммы расставлены по умолчанию, элемент в ростер не входит.
    expect(unknownTypes).toEqual([10550]);
    expect(warnings).toEqual([]);
    expect(schema.elements.some((item) => item.typeCode === 10550)).toBe(true);
    for (const code of MOTOR_CODES) {
      const e = schema.elements.find((item) => item.typeCode === code);
      expect(e?.terminals.length).toBe(TERMINALS[code]);
      expect(invalidTerminalIndexes(code, e?.terminals.length ?? 0)).toEqual([]);
    }
    const offsets = (code: number): number[][] => (schema.elements.find((item) => item.typeCode === code)?.terminals ?? []).map((t) => [t.offset.x, t.offset.y]);
    expect(offsets(1002)).toEqual([[0, 0], [12, 0], [18, 0]]);
    expect(offsets(1008)).toEqual([[0, 0], [12, 0], [18, 0], [0, 27], [12, 27]]);
    expect(offsets(1003)).toEqual([[0, 0], [6, 0], [12, 0], [18, 0], [0, 24], [6, 24], [12, 24]]);
    expect(offsets(1010)).toEqual([[0, 0], [6, 0], [12, 0], [18, 0]]);
    expect(offsets(1007)[3]).toEqual([0, -12]);
  });

  it('terminal labels follow the file order', () => {
    const { schema } = importCad(fixture('motores-elementos.cad'));
    const labels = (code: number): string[] => (schema.elements.find((item) => item.typeCode === code)?.terminals ?? []).map((t) => t.label);
    expect(labels(1008)).toEqual(['U1', 'V1', 'PE', 'U2', 'V2']);
    expect(labels(1004)).toEqual(['U1', 'V1', 'W1', 'PE', 'K', 'L', 'M']);
    expect(labels(1007)).toEqual(['A1', 'A2', 'PE', 'F1', 'F2']);
    expect(labels(1011)).toEqual(['1', '2', '3', '4', '5', '6']);
  });
});

/** Питание: полоса 3004 (L1 L2 L3) слева, двигатель в (30, 30); верхние выводы подключены по порядку. */
function threePhase(typeCode: number, terminals: ReadonlyArray<readonly [number, number, string]>, wired: number[]) {
  const source = el(3004, 0, 0, { id: 1, name: '-X', terminals: [[0, 0, 'L1'], [6, 0, 'L2'], [12, 0, 'L3']] });
  const motor = el(typeCode, 30, 30, { id: 2, name: '-M1', terminals });
  const wires = [];
  for (const index of wired) {
    const sourceX = index * 6;
    const routeY = 6 + index * 9;
    const target = terminals[index];
    if (!target) continue;
    const motorX = 30 + target[0];
    const motorY = 30 + target[1];
    wires.push(seg(sourceX, 0, sourceX, routeY), seg(sourceX, routeY, motorX, routeY), seg(motorX, routeY, motorX, motorY));
  }
  return schemaOf(wires, [source, motor]);
}

const TOP3: ReadonlyArray<readonly [number, number, string]> = [[0, 0, 'U1'], [6, 0, 'V1'], [12, 0, 'W1'], [18, 0, 'PE']];

describe('motors: engine', () => {
  it('wound-rotor motor 1004 runs on three phases at the stator', () => {
    const terminals = [...TOP3, [0, 24, 'K'], [6, 24, 'L'], [12, 24, 'M']] as const;
    expect(simulate(createEngineInput(threePhase(1004, terminals, [0, 1, 2]))).motors[2]).toEqual({ running: true, faulted: false });
    expect(simulate(createEngineInput(threePhase(1004, terminals, [0, 1]))).motors[2]).toEqual({ running: false, faulted: true });
  });

  it('Dahlander 1003 and two-speed 1005 run from either winding', () => {
    const terminals = [...TOP3, [0, 24, 'U2'], [6, 24, 'V2'], [12, 24, 'W2']] as const;
    for (const code of [1003, 1005]) {
      expect(simulate(createEngineInput(threePhase(code, terminals, [0, 1, 2]))).motors[2]?.running).toBe(true);
      expect(simulate(createEngineInput(threePhase(code, terminals, [0]))).motors[2]).toEqual({ running: false, faulted: true });
      expect(simulate(createEngineInput(threePhase(code, terminals, []))).motors[2]).toEqual({ running: false, faulted: false });
    }
  });

  it('three-phase motor as single-phase 1010 runs on one phase plus neutral', () => {
    const source = el(3000, 0, 0, { id: 1, terminals: [[0, 0, 'L']] });
    const neutral = el(3001, 60, 0, { id: 3, terminals: [[0, 0, 'N']] });
    const motor = el(1010, 30, 30, { id: 2, name: '-M1', terminals: TOP3 });
    const wires = [seg(0, 0, 0, 30), seg(0, 30, 30, 30), seg(60, 0, 60, 33, { kind: 'neutral' }), seg(60, 33, 42, 33, { kind: 'neutral' }), seg(42, 33, 42, 30, { kind: 'neutral' })];
    expect(simulate(createEngineInput(schemaOf(wires, [source, neutral, motor]))).motors[2]).toEqual({ running: true, faulted: false });
  });

  it('single-phase motors 1002 and 1008 need a phase and the neutral on U1/V1', () => {
    for (const [code, terminals] of [
      [1002, [[0, 0, 'U1'], [12, 0, 'V1'], [18, 0, 'PE']]],
      [1008, [[0, 0, 'U1'], [12, 0, 'V1'], [18, 0, 'PE'], [0, 27, 'U2'], [12, 27, 'V2']]],
    ] as const) {
      const source = el(3000, 0, 0, { id: 1, terminals: [[0, 0, 'L']] });
      const neutral = el(3001, 60, 0, { id: 3, terminals: [[0, 0, 'N']] });
      const motor = el(code, 30, 30, { id: 2, name: '-M1', terminals });
      const live = [seg(0, 0, 0, 30), seg(0, 30, 30, 30)];
      const nWire = [seg(60, 0, 60, 33, { kind: 'neutral' }), seg(60, 33, 42, 33, { kind: 'neutral' }), seg(42, 33, 42, 30, { kind: 'neutral' })];
      expect(simulate(createEngineInput(schemaOf([...live, ...nWire], [source, neutral, motor]))).motors[2]?.running).toBe(true);
      expect(simulate(createEngineInput(schemaOf(live, [source, neutral, motor]))).motors[2]?.running).toBe(false);
    }
  });

  it('DC motor 1006 runs on + and − and reverses when polarity is swapped', () => {
    const terminals = [[0, 0, 'A1'], [18, 0, 'A2'], [9, 6, 'PE']] as const;
    const build = (plusOnA1: boolean) => {
      const plus = el(3008, plusOnA1 ? 0 : 60, 0, { id: 1, terminals: [[0, 0, '+']] });
      const minus = el(3009, plusOnA1 ? 60 : 0, 0, { id: 3, terminals: [[0, 0, '-']] });
      const motor = el(1006, 30, 30, { id: 2, name: '-M1', terminals });
      const wires = [seg(0, 0, 0, 30), seg(0, 30, 30, 30), seg(60, 0, 60, 30), seg(60, 30, 48, 30)];
      return schemaOf(wires, [plus, minus, motor]);
    };
    expect(simulate(createEngineInput(build(true))).motors[2]).toEqual({ running: true, faulted: false, reversed: false });
    expect(simulate(createEngineInput(build(false))).motors[2]).toEqual({ running: true, faulted: false, reversed: true });
  });

  it('separately excited motor 1007 also needs the field winding powered', () => {
    const terminals = [[0, -3, 'A1'], [18, -3, 'A2'], [9, 3, 'PE'], [0, -12, 'F1'], [18, -12, 'F2']] as const;
    const plus = el(3008, 0, 0, { id: 1, terminals: [[0, 0, '+']] });
    const minus = el(3009, 60, 0, { id: 3, terminals: [[0, 0, '-']] });
    const motor = el(1007, 30, 30, { id: 2, name: '-M1', terminals });
    const armature = [seg(0, 0, 0, 27), seg(0, 27, 30, 27), seg(60, 0, 60, 27), seg(60, 27, 48, 27)];
    const field = [seg(0, 0, 0, 18), seg(0, 18, 30, 18), seg(60, 0, 60, 18), seg(60, 18, 48, 18)];
    expect(simulate(createEngineInput(schemaOf(armature, [plus, minus, motor]))).motors[2]?.running).toBe(false);
    expect(simulate(createEngineInput(schemaOf([...armature, ...field], [plus, minus, motor]))).motors[2]?.running).toBe(true);
  });

  it('stepper motors and the brake are symbols only: no motor state', () => {
    const { schema } = importCad(fixture('motores-elementos.cad'));
    const state = simulate(createEngineInput(schema));
    for (const code of [1011, 1012, 1009]) {
      const id = schema.elements.find((item) => item.typeCode === code)?.id ?? -1;
      expect(state.motors[id]).toBeUndefined();
    }
  });
});
