import { describe, expect, it } from 'vitest';
import { catalog } from '@model/catalog';
import { cadTypeForCommand, getCadType, isKnownCadType } from '@model/cad-types';
import { parseCad, serializeCad } from '@model/cad-format';
import { importCad } from '@model/cad-import';
import { exportCad } from '@model/cad-export';
import { createEngineInput, simulate } from '@engine/index';
import { invalidTerminalIndexes, missingBehaviors } from '../src/engine/behaviors';
import { computeSwitching } from '../src/engine/switching';
import type { UserInputs } from '../src/engine/types';
import { el, schemaOf, seg } from './builders';
import { fixture } from './helpers';

/** Образец potencia_elementos.cad: по одной кнопке панели «Potencia: resistencias, arrancadores, variadores, controladores» (17 кнопок). */
const SAMPLE = 'potencia_elementos.cad';
/** Все 17 кнопок панели в порядке панели. */
const CODES = [1050, 1051, 1052, 1053, 1062, 1063, 1054, 1055, 1056, 1057, 1058, 1059, 1060, 1061, 1065, 1066, 1067];
const TERMINALS: Record<number, number> = { 1050: 2, 1051: 6, 1052: 9, 1053: 7, 1062: 3, 1063: 4, 1054: 7, 1055: 8, 1056: 13, 1057: 5, 1058: 7, 1059: 6, 1060: 8, 1061: 7, 1065: 8, 1066: 7, 1067: 7 };
const LABELS: Record<number, string[]> = {
  1050: ['1', '2'],
  1051: ['1', '3', '5', '2', '4', '6'],
  1052: ['1', '4', '7', '2', '5', '8', '3', '6', '9'],
  1053: ['1', '3', '5', '2', '4', '6', 'PE'],
  1062: ['IN', 'A1', 'A2'],
  1063: ['I1', 'I2', 'A1', 'A2'],
  1054: ['L1', 'N', 'PE', 'U', 'V', 'W', 'PE'],
  1055: ['L1', 'L2', 'L3', 'PE', 'U', 'V', 'W', 'PE'],
  1056: ['RA', 'RC', 'I1', 'I2', 'I3', 'I4', '+', 'R+', 'R-', '+', 'AI', '0V', 'AO'],
  1057: ['L1', 'N', 'PE', 'M1', 'M2'],
  1058: ['L1', 'N', 'PE', 'M1', 'M2', 'F1', 'F2'],
  1059: ['L1', 'L2', 'L3', 'PE', 'M1', 'M2'],
  1060: ['L1', 'L2', 'L3', 'PE', 'M1', 'M2', 'F1', 'F2'],
  1061: ['RA', 'RC', 'IN', 'V+', '+', 'AI', '0V'],
  1065: ['I1', 'I2', 'I3', 'I4', 'Q1', 'Q2', 'Q3', 'Q4'],
  1066: ['I1', 'I2', 'I3', 'Q1', 'Q2', 'Q3', 'Q4'],
  1067: ['I1', 'I2', 'I3', 'Q1', 'Q2', 'Q3', 'Q4'],
};
const SIZES: Record<number, [number, number]> = { 1050: [6, 18], 1051: [18, 18], 1052: [18, 21], 1053: [21, 27], 1062: [15, 27], 1063: [24, 27], 1054: [24, 33], 1055: [24, 33], 1056: [54, 33], 1057: [18, 33], 1058: [24, 33], 1059: [24, 33], 1060: [24, 33], 1061: [39, 33], 1065: [40, 24], 1066: [40, 24], 1067: [40, 24] };
/** Типы образца, которых в ростере ещё нет: импорт их читает, но тип неизвестен. */
const NOT_YET: number[] = [];

describe('power electronics: panel roster (all 17)', () => {
  it('the panel has 17 buttons and all 17 map to .cad types in panel order', () => {
    const items = catalog.inGroup('power-electronics');
    expect(items).toHaveLength(17);
    expect(items.map((c) => cadTypeForCommand(c.id)?.code)).toEqual(CODES);
  });

  it('all part-1 codes are known and have engine behavior', () => {
    for (const code of CODES) {
      expect(isKnownCadType(code)).toBe(true);
      expect(getCadType(code).layout.kind === 'none').toBe(false);
    }
    expect(CODES.map((code) => getCadType(code).family)).toEqual(['resistor', 'resistor', 'transformer', 'electronic-starter', 'control-unit', 'control-unit', 'drive', 'drive', 'control-unit', 'drive', 'drive', 'drive', 'drive', 'control-unit', 'control-unit', 'control-unit', 'control-unit']);
    expect(missingBehaviors()).toEqual([]);
  });
});

describe('power electronics: sample file', () => {
  it('the whole sample is read without warnings and every type of it is known', () => {
    const { schema, warnings, unknownTypes } = importCad(fixture(SAMPLE));
    expect(warnings).toEqual([]);
    expect(unknownTypes).toEqual(NOT_YET);
    // 17 кнопок панели + служебный 20000; запись -1 отдельным элементом не становится.
    expect(schema.elements).toHaveLength(18);
    expect(schema.elements.some((e) => e.typeCode < 0)).toBe(false);
    expect(schema.wires).toHaveLength(0);
    expect(schema.sheet.cadFooter).toBeDefined();
  });

  it('the 17 types have the expected frames, terminal counts and labels', () => {
    const { schema } = importCad(fixture(SAMPLE));
    for (const code of CODES) {
      const e = schema.elements.find((item) => item.typeCode === code);
      expect(e?.terminals.length).toBe(TERMINALS[code]);
      expect(e?.terminals.map((t) => t.label)).toEqual(LABELS[code]);
      expect([e?.size.w, e?.size.h]).toEqual(SIZES[code]);
      expect(e?.labelOffset).toEqual({ x: -12, y: -3 });
      expect(invalidTerminalIndexes(code, e?.terminals.length ?? 0)).toEqual([]);
    }
    expect(schema.elements.filter((e) => CODES.includes(e.typeCode)).map((e) => e.name)).toEqual(['-R', '-R', '-T', ...Array(14).fill('-G')]);
  });

  it('terminal offsets follow the layouts taken from the screenshot', () => {
    const { schema } = importCad(fixture(SAMPLE));
    const offsets = (code: number): number[][] => (schema.elements.find((e) => e.typeCode === code)?.terminals ?? []).map((t) => [t.offset.x, t.offset.y]);
    expect(offsets(1050)).toEqual([[0, 0], [0, 15]]);
    expect(offsets(1051)).toEqual([[0, 0], [6, 0], [12, 0], [0, 15], [6, 15], [12, 15]]);
    expect(offsets(1052)).toEqual([[0, 0], [6, 0], [12, 0], [0, 18], [6, 18], [12, 18], [3, 9], [9, 9], [15, 9]]);
    expect(offsets(1053)[6]).toEqual([18, 12]);
    expect(offsets(1062)).toEqual([[0, 0], [9, 0], [9, 24]]);
    expect(offsets(1063)).toEqual([[0, 0], [9, 0], [18, 0], [18, 24]]);
    expect(offsets(1054)).toEqual([[0, 0], [6, 0], [12, 0], [0, 30], [6, 30], [12, 30], [18, 30]]);
    expect(offsets(1055)).toEqual([[0, 0], [6, 0], [12, 0], [18, 0], [0, 30], [6, 30], [12, 30], [18, 30]]);
    expect(offsets(1056)).toEqual([[0, 0], [12, 0], [24, 0], [30, 0], [36, 0], [42, 0], [48, 0], [0, 30], [12, 30], [24, 30], [30, 30], [36, 30], [48, 30]]);
    expect(offsets(1057)).toEqual([[0, 0], [6, 0], [12, 0], [0, 30], [12, 30]]);
    expect(offsets(1058)).toEqual([[0, 0], [6, 0], [12, 0], [0, 30], [6, 30], [12, 30], [18, 30]]);
    expect(offsets(1059)).toEqual([[0, 0], [6, 0], [12, 0], [18, 0], [3, 30], [15, 30]]);
    expect(offsets(1060)).toEqual([[0, 0], [6, 0], [12, 0], [18, 0], [0, 30], [6, 30], [12, 30], [18, 30]]);
    expect(offsets(1061)).toEqual([[0, 0], [12, 0], [21, 0], [27, 0], [0, 30], [6, 30], [12, 30]]);
    expect(offsets(1065)).toEqual([[0, 0], [6, 0], [12, 0], [18, 0], [0, 18], [6, 18], [12, 18], [18, 18]]);
    expect(offsets(1066)).toEqual([[0, 0], [6, 0], [12, 0], [0, 18], [6, 18], [12, 18], [18, 18]]);
    expect(offsets(1067)).toEqual(offsets(1066));
  });

  it('the autotransformer record has 11 texts, 24 numbers and 9 flags; position and size are read with the shift', () => {
    const { schema } = importCad(fixture(SAMPLE));
    const t = schema.elements.find((e) => e.typeCode === 1052)!;
    expect(t.raw?.texts).toHaveLength(11);
    expect(t.raw?.nums).toHaveLength(24);
    expect(t.raw?.nums.slice(0, 9)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(t.position).toEqual({ x: 90, y: 51 });
    expect(t.size).toEqual({ w: 18, h: 21 });
    expect(t.rotation).toBe(0);
  });

  it('text after the closing # is kept as the record tail', () => {
    const { schema } = importCad(fixture(SAMPLE));
    for (const code of [1062, 1063]) expect(schema.elements.find((e) => e.typeCode === code)?.raw?.tail).toBe('000/030/000/400');
    expect(schema.elements.find((e) => e.typeCode === 1056)?.raw?.tail).toBe('1-0-0-001-200-010-025-050-05-05-00-0');
    expect(schema.elements.find((e) => e.typeCode === 1050)?.raw?.tail).toBeUndefined();
  });

  it('the -1 record continues Control Variador 1056: 13 terminals, one element, nothing lost', () => {
    const { schema } = importCad(fixture(SAMPLE));
    const e = schema.elements.find((item) => item.typeCode === 1056)!;
    expect(e.terminals.map((t) => t.label)).toEqual(['RA', 'RC', 'I1', 'I2', 'I3', 'I4', '+', 'R+', 'R-', '+', 'AI', '0V', 'AO']);
    expect(e.raw?.continuations).toHaveLength(1);
    expect(e.raw?.continuations?.[0]).toMatchObject({ id: 9, type: -1 });
    expect(e.position).toEqual({ x: 129, y: 96 });
    expect(e.size).toEqual({ w: 54, h: 33 });
  });
});

describe('power electronics: export', () => {
  const recordsPart = (text: string): string => text.slice(0, text.indexOf('$$$'));

  it('import → export gives back the records of the sample byte for byte', () => {
    const original = fixture(SAMPLE);
    const exported = exportCad(importCad(original).schema);
    expect(recordsPart(exported)).toBe(recordsPart(original));
  });

  it('import → export → import gives the same schema and the same records', () => {
    const first = importCad(fixture(SAMPLE));
    const text = exportCad(first.schema);
    const second = importCad(text);
    expect(second.warnings).toEqual([]);
    expect(second.schema.elements).toEqual(first.schema.elements);
    expect(exportCad(second.schema)).toBe(text);
  });

  it('moving an element moves its -1 continuation too', () => {
    const { schema } = importCad(fixture(SAMPLE));
    const drive = schema.elements.find((e) => e.typeCode === 1056)!;
    drive.position = { x: 132, y: 99 };
    const records = parseCad(exportCad(schema)).records;
    const main = records.findIndex((r) => r.type === 1056);
    expect(records[main + 1]?.type).toBe(-1);
    expect(records[main]?.nums.slice(8, 10)).toEqual([132, 99]);
    expect(records[main + 1]?.nums.slice(8, 10)).toEqual([132, 99]);
  });

  it('new elements are written with the record shape of the original: 11 texts and 24 numbers for the autotransformer, the tail for 1062/1063', () => {
    const autotransformer = el(1052, 30, 60, { id: 1, name: '-T1', terminals: LABELS[1052]!.map((label, i) => [[0, 6, 12, 0, 6, 12, 3, 9, 15][i]!, [0, 0, 0, 18, 18, 18, 9, 9, 9][i]!, label] as const) });
    autotransformer.size = { w: 18, h: 21 };
    const control = el(1062, 90, 60, { id: 2, name: '-G1', terminals: [[0, 0, 'IN'], [9, 0, 'A1'], [9, 24, 'A2']] });
    control.size = { w: 15, h: 27 };
    const text = exportCad(schemaOf([], [autotransformer, control]));
    const records = parseCad(text).records;
    expect(records[0]?.texts).toHaveLength(11);
    expect(records[0]?.nums).toHaveLength(24);
    expect(records[1]?.tail).toBe('000/030/000/400');
    const back = importCad(text);
    expect(back.warnings).toEqual([]);
    expect(back.schema.elements.find((e) => e.typeCode === 1052)?.terminals.map((t) => t.label)).toEqual(LABELS[1052]);
    expect(back.schema.elements.find((e) => e.typeCode === 1052)?.position).toEqual({ x: 30, y: 60 });
  });
});

describe('cad-format: records of variable length', () => {
  const head = 'CADe_SIMU';
  const footer = '$$$*1*1*1*2*3*0*1*0*0*279*210&&&*           *           *           *           *                         *                         *05-nov.-2026*1          *1          *test                 *1*1*1*1*1*1*1*1*1*1*1*1*1*1***$$$&&&';
  const plain = '*1*1050#-R##1#2######*1*1*0*0*0*0*0*0*36*51*0*0*-12*-3*6*18*0*0*0*1*0*0*0#';

  it('reads a record with 9 flags and 11 texts', () => {
    const rec = '*2*1052#-T##1#4#7#2#5#8#3#6#9*1*1*1*1*1*1*1*1*1*90*51*0*0*-12*-3*18*21*0*0*0*1*0*0*0#';
    const file = parseCad(head + plain + rec + plain.replace('*1*', '*3*') + footer);
    expect(file.warnings).toEqual([]);
    expect(file.records.map((r) => r.id)).toEqual([1, 2, 3]);
    expect(file.records[1]?.texts).toHaveLength(11);
    expect(file.records[1]?.nums).toHaveLength(24);
  });

  it('reads the text after the closing # and writes it back unchanged, also before the footer', () => {
    const text = head + plain + '*2*1062#-G##IN#A1#A2#####*1*1*1*0*0*0*0*0*180*51*0*0*-12*-3*15*27*0*0*0*1*0*0*0#000/030/000/400' + '*3*1050#-R##1#2######*1*1*0*0*0*0*0*0*36*51*0*0*-12*-3*6*18*0*0*0*1*0*0*0#-MI' + footer;
    const file = parseCad(text);
    expect(file.warnings).toEqual([]);
    expect(file.records.map((r) => r.tail)).toEqual([undefined, '000/030/000/400', '-MI']);
    expect(serializeCad(file)).toBe(text);
  });

  it('accepts a negative record type (-1) as a record', () => {
    const text = head + '*9*-1###R+#R-#+#AI#0V#AO##*1*1*1*1*1*1*0*0*129*96*0*0*-12*-3*54*33*0*0*0*0*0*0*0#' + footer;
    const file = parseCad(text);
    expect(file.warnings).toEqual([]);
    expect(file.records[0]?.type).toBe(-1);
    expect(serializeCad(file)).toBe(text);
  });

  it('still refuses to write a record with fewer fields than the minimum and still warns on a cut record', () => {
    expect(() => serializeCad({ records: [{ id: 1, type: 1000, texts: ['a'], nums: [1] }], footer: null })).toThrow();
    const cut = parseCad(head + plain + '*2*1052#-T##1#4#7#2#5#8#3#6#9*1*1*1*1*1*1');
    expect(cut.records).toHaveLength(1);
    expect(cut.warnings.map((w) => w.code)).toContain('bad-record');
  });

  it('a -1 record that is not preceded by an element does not crash the import', () => {
    const text = head + '*9*-1###R+#R-#+#AI#0V#AO##*1*1*1*1*1*1*0*0*129*96*0*0*-12*-3*54*33*0*0*0*0*0*0*0#' + footer;
    const result = importCad(text);
    expect(result.schema.elements).toHaveLength(1);
    expect(result.unknownTypes).toEqual([-1]);
  });
});

describe('power electronics: Control Variador (1056) written as a new element', () => {
  it('a new 1056 is written as a main record with 7 flags plus a -1 record with 6 and reads back with 13 terminals', () => {
    const labels = LABELS[1056]!;
    const xs = [0, 12, 24, 30, 36, 42, 48, 0, 12, 24, 30, 36, 48];
    const control = el(1056, 30, 60, { id: 1, name: '-G1', terminals: labels.map((label, i) => [xs[i]!, i < 7 ? 0 : 30, label] as const) });
    control.size = { w: 54, h: 33 };
    const text = exportCad(schemaOf([], [control]));
    const records = parseCad(text).records;
    expect(records.map((r) => r.type)).toEqual([1056, -1]);
    expect(records[0]?.nums.slice(0, 8)).toEqual([1, 1, 1, 1, 1, 1, 1, 0]);
    expect(records[1]?.nums.slice(0, 8)).toEqual([1, 1, 1, 1, 1, 1, 0, 0]);
    expect(records[1]?.nums.slice(8, 10)).toEqual([30, 60]);
    const back = importCad(text);
    expect(back.warnings).toEqual([]);
    expect(back.schema.elements).toHaveLength(1);
    expect(back.schema.elements[0]?.terminals.map((t) => t.label)).toEqual(labels);
  });
});

describe('power electronics: stepper controllers and tails', () => {
  it('1066 keeps the empty flag slot 3: Q1..Q4 are read from slots 4..7', () => {
    const { schema } = importCad(fixture(SAMPLE));
    const e = schema.elements.find((item) => item.typeCode === 1066)!;
    expect(e.raw?.nums.slice(0, 8)).toEqual([1, 1, 1, 0, 1, 1, 1, 1]);
    expect(e.raw?.tail).toBe('L+-1-L--1-1');
  });

  it('a new 1066 is written with the empty slot 3 and the tail of the sample, and reads back with 7 terminals', () => {
    const xs = [0, 6, 12, 0, 6, 12, 18];
    const ys = [0, 0, 0, 18, 18, 18, 18];
    const control = el(1066, 30, 60, { id: 1, name: '-G1', terminals: LABELS[1066]!.map((label, i) => [xs[i]!, ys[i]!, label] as const) });
    control.size = { w: 40, h: 24 };
    const text = exportCad(schemaOf([], [control]));
    const record = parseCad(text).records[0]!;
    expect(record.nums.slice(0, 8)).toEqual([1, 1, 1, 0, 1, 1, 1, 1]);
    expect(record.texts.slice(2, 10)).toEqual(['I1', 'I2', 'I3', '', 'Q1', 'Q2', 'Q3', 'Q4']);
    expect(record.tail).toBe('L+-1-L--1-1');
    const back = importCad(text);
    expect(back.warnings).toEqual([]);
    expect(back.schema.elements[0]?.terminals.map((t) => t.label)).toEqual(LABELS[1066]);
  });
});

describe('power electronics: engine', () => {
  const inputs = { pressed: {}, toggled: {}, tripped: {} } as unknown as UserInputs;

  it('resistors conduct between their paired terminals', () => {
    const { schema } = importCad(fixture(SAMPLE));
    const one = schema.elements.find((e) => e.typeCode === 1050)!;
    const three = schema.elements.find((e) => e.typeCode === 1051)!;
    const result = computeSwitching(schema, inputs);
    expect(result.contacts[one.id]).toBe(true);
    expect(result.contacts[three.id]).toBe(true);
    expect(result.edges.filter((e) => e.element === one.id)).toHaveLength(1);
    expect(result.edges.filter((e) => e.element === three.id)).toHaveLength(3);
  });

  it('a three-phase motor runs through Resistencia III and stays stopped without it', () => {
    const source = el(3004, 0, 0, { id: 1, name: '-X', terminals: [[0, 0, 'L1'], [6, 0, 'L2'], [12, 0, 'L3']] });
    const resistor = el(1051, 0, 12, { id: 2, name: '-R1', terminals: [[0, 0, '1'], [6, 0, '3'], [12, 0, '5'], [0, 15, '2'], [6, 15, '4'], [12, 15, '6']] });
    const motor = el(1000, 0, 36, { id: 3, name: '-M1', terminals: [[0, 0, 'U1'], [6, 0, 'V1'], [12, 0, 'W1'], [18, 0, 'PE']] });
    const upper = [0, 6, 12].map((x) => seg(x, 0, x, 12));
    const lower = [0, 6, 12].map((x) => seg(x, 27, x, 36));
    expect(simulate(createEngineInput(schemaOf([...upper, ...lower], [source, resistor, motor]))).motors[3]).toEqual({ running: true, faulted: false });
    expect(simulate(createEngineInput(schemaOf([...upper], [source, resistor, motor]))).motors[3]?.running).toBe(false);
  });

  it('the symbol-only types do not conduct and do not break the simulation', () => {
    const { schema } = importCad(fixture(SAMPLE));
    const state = simulate(createEngineInput(schema));
    expect(state).toBeDefined();
    const result = computeSwitching(schema, inputs);
    for (const code of CODES.filter((c) => c !== 1050 && c !== 1051)) {
      const e = schema.elements.find((item) => item.typeCode === code)!;
      expect(result.edges.filter((edge) => edge.element === e.id)).toEqual([]);
    }
  });
});
