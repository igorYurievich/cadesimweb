import { describe, expect, it } from 'vitest';
import { catalog } from '@model/catalog';
import { cadTypeForCommand, getCadType, isKnownCadType } from '@model/cad-types';
import { importCad } from '@model/cad-import';
import { createEmptyInputs } from '@engine/simulate';
import { computeSwitching } from '../src/engine/switching';
import { invalidTerminalIndexes, missingBehaviors } from '../src/engine/behaviors';
import type { TimerState } from '../src/engine/types';
import { fixture } from './helpers';

/** Образец contactos_elementos.cad: по одной кнопке панели «Contactos auxiliares y temporizados» (16 штук) в порядке панели. */
const AUX_CODES = Array.from({ length: 16 }, (_, i) => 7000 + i);
const LABELS: Record<number, string[]> = {
  7000: ['13', '14'], 7001: ['11', '12'], 7002: ['11', '13', '12', '14'], 7003: ['11', '12', '14'],
  7004: ['67', '68'], 7005: ['55', '56'], 7006: ['55', '57', '56', '58'], 7007: ['55', '56', '58'],
};
for (let code = 7008; code <= 7015; code += 1) LABELS[code] = LABELS[code - 4] as string[];

describe('aux contacts: panel roster', () => {
  it('all 16 buttons of the aux-contacts group map to .cad types in panel order', () => {
    const items = catalog.inGroup('aux-contacts');
    expect(items).toHaveLength(16);
    expect(items.map((c) => cadTypeForCommand(c.id)?.code)).toEqual(AUX_CODES);
  });

  it('all codes are known aux contacts with engine behavior', () => {
    for (const code of AUX_CODES) {
      expect(isKnownCadType(code)).toBe(true);
      expect(getCadType(code).family).toBe('aux-contact');
    }
    expect(missingBehaviors()).toEqual([]);
  });

  it('the sample file imports without unknown types, with the expected terminals and geometry', () => {
    const { schema, unknownTypes, warnings } = importCad(fixture('contactos_elementos.cad'));
    expect(unknownTypes).toEqual([]);
    expect(warnings.filter((w) => w.code === 'bad-record')).toEqual([]);
    for (const code of AUX_CODES) {
      const e = schema.elements.find((item) => item.typeCode === code);
      expect(e?.terminals.map((t) => t.label)).toEqual(LABELS[code]);
      expect(invalidTerminalIndexes(code, e?.terminals.length ?? 0)).toEqual([]);
    }
    const offsets = (code: number): number[][] => (schema.elements.find((e) => e.typeCode === code)?.terminals ?? []).map((t) => [t.offset.x, t.offset.y]);
    expect(offsets(7000)).toEqual([[0, 0], [0, 12]]);
    expect(offsets(7002)).toEqual([[0, 0], [9, 0], [0, 12], [9, 12]]);
    expect(offsets(7003)).toEqual([[3, 0], [0, 12], [6, 12]]);
    expect(offsets(7007)).toEqual([[3, 0], [0, 12], [6, 12]]);
  });
});

describe('aux contacts: behavior', () => {
  const { schema } = importCad(fixture('contactos_elementos.cad'));
  const find = (code: number) => schema.elements.find((e) => e.typeCode === code)!;
  const closedPairs = (id: number, coils: Record<string, boolean>, timers: Record<number, TimerState> = {}, withSchema = schema): string[] =>
    computeSwitching(withSchema, createEmptyInputs(), coils, undefined, timers).edges
      .filter((edge) => edge.element === id)
      .map((edge) => `${edge.a.index}-${edge.b.index}`);

  it('NO+NC (7002) swaps its two poles when the coil with the same name is energized', () => {
    const e = find(7002);
    expect(closedPairs(e.id, { '-K': false })).toEqual(['0-2']);
    expect(closedPairs(e.id, { '-K': true })).toEqual(['1-3']);
  });

  it('CON (7003) connects the common terminal to NC at rest and to NO when switched', () => {
    const e = find(7003);
    expect(closedPairs(e.id, {})).toEqual(['0-1']);
    expect(closedPairs(e.id, { '-K': true })).toEqual(['0-2']);
  });

  it('on-delay contacts (7005, 7007) wait for the 9004 timer with the same name', () => {
    const timer = { ...find(7000), id: 900, typeCode: 9004, name: '-KA', terminals: [] };
    const withTimer = { ...schema, elements: [...schema.elements, timer] };
    const nc = find(7005);
    const con = find(7007);
    const done: Record<number, TimerState> = { 900: { phase: 'done', elapsed: 5, lastTime: 5 } };
    const counting: Record<number, TimerState> = { 900: { phase: 'counting', elapsed: 1, lastTime: 1 } };
    // Катушка уже включена, но выдержка не прошла: контакты в покое.
    expect(closedPairs(nc.id, { '-KA': true }, counting, withTimer)).toEqual(['0-1']);
    expect(closedPairs(con.id, { '-KA': true }, counting, withTimer)).toEqual(['0-1']);
    expect(closedPairs(nc.id, { '-KA': true }, done, withTimer)).toEqual([]);
    expect(closedPairs(con.id, { '-KA': true }, done, withTimer)).toEqual(['0-2']);
  });

  it('off-delay and on/off-delay contacts (7008..7015) are symbols only: they never conduct', () => {
    for (let code = 7008; code <= 7015; code += 1) {
      const e = find(code);
      expect(closedPairs(e.id, { '-KA': true })).toEqual([]);
      expect(closedPairs(e.id, {})).toEqual([]);
    }
  });
});
