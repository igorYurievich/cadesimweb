import { describe, it, expect } from 'vitest';
import { CadParseError, parseCad, serializeCad } from '@model/cad-format';
import { fixture } from './helpers';

const FIRST_FOOTER_END = (text: string): number => text.indexOf('$$$&&&') + '$$$&&&'.length;

describe('cad-format: parse', () => {
  const text = fixture('a1_1_1.cad');
  const file = parseCad(text);

  it('reads all records before the first footer', () => {
    expect(file.records).toHaveLength(68);
    expect(file.records[0]?.type).toBe(1000);
    expect(file.records[0]?.texts).toHaveLength(10);
    expect(file.records[0]?.nums).toHaveLength(23);
  });

  it('reads the motor record fields', () => {
    const m = file.records[0]!;
    expect(m.id).toBe(0);
    expect(m.texts.slice(0, 6)).toEqual(['-M1', '', 'U1', 'V1', 'W1', 'PE']);
    expect(m.nums.slice(0, 10)).toEqual([1, 1, 1, 1, 0, 0, 0, 0, 48, 186]);
  });

  it('reads the footer: sheet settings and the title block as is', () => {
    expect(file.footer?.settings).toEqual([1, 1, 1, 2, 4, 0, 1, 0, 0, 279, 210]);
    expect(file.footer?.fields[1]).toBe('IGOR       ');
    expect(file.footer?.fields[3]).toBe('LIPSKIY    ');
    expect(file.footer?.fields[4]).toBe('IES LAS LAGUNAS          ');
  });

  it('ignores the stale tail left by an older, longer save', () => {
    expect(file.ignoredTailLength).toBe(text.length - FIRST_FOOTER_END(text));
    expect(file.ignoredTailLength).toBeGreaterThan(0);
    expect(file.warnings.map((w) => w.code)).toEqual(['trailing-data']);
  });

  it('a clean file has no warnings', () => {
    expect(parseCad(fixture('a1_5_excerpt.cad')).warnings).toHaveLength(0);
  });
});

describe('cad-format: round trip', () => {
  it('serialize(parse(x)) restores the file up to the first footer', () => {
    for (const name of ['a1_1_1.cad', 'a1_5_excerpt.cad']) {
      const text = fixture(name);
      const out = serializeCad(parseCad(text));
      expect(out).toBe(text.slice(0, FIRST_FOOTER_END(text)));
    }
  });

  it('parse(serialize(parse(x))) is stable', () => {
    const once = parseCad(fixture('a1_1_1.cad'));
    const twice = parseCad(serializeCad(once));
    expect(twice.records).toEqual(once.records);
    expect(twice.footer).toEqual(once.footer);
    expect(twice.warnings).toHaveLength(0);
  });

  it('refuses to write a record with a wrong number of fields', () => {
    const bad = { records: [{ id: 1, type: 1000, texts: ['a'], nums: [1] }], footer: null };
    expect(() => serializeCad(bad)).toThrow();
  });
});

describe('cad-format: damaged input', () => {
  const clean = fixture('a1_5_excerpt.cad');

  it('rejects text that is not a CADe_SIMU file', () => {
    expect(() => parseCad('hello')).toThrow();
    try {
      parseCad('hello');
    } catch (e) {
      expect(e instanceof CadParseError).toBe(true);
    }
  });

  it('keeps the records read before a broken one and warns', () => {
    const cut = clean.indexOf('*3*6004') + 20; // обрыв внутри второй записи
    const file = parseCad(clean.slice(0, cut));
    expect(file.records).toHaveLength(1);
    expect(file.warnings.map((w) => w.code)).toContain('bad-record');
    expect(file.footer).toBe(null);
  });

  it('warns when the footer is missing', () => {
    const noFooter = clean.slice(0, clean.indexOf('$$$'));
    const file = parseCad(noFooter);
    expect(file.records).toHaveLength(17);
    expect(file.warnings.map((w) => w.code)).toEqual(['missing-footer']);
  });

  it('warns about a repeated record id', () => {
    const one = clean.slice(0, clean.indexOf('#*3*6004') + 1);
    const dup = parseCad(one + one.slice('CADe_SIMU'.length));
    expect(dup.records).toHaveLength(2);
    expect(dup.warnings.map((w) => w.code)).toContain('duplicate-id');
  });

  it('reads a header-only file as an empty schema', () => {
    const file = parseCad('CADe_SIMU');
    expect(file.records).toHaveLength(0);
    expect(file.warnings.map((w) => w.code)).toEqual(['missing-footer']);
  });
});
