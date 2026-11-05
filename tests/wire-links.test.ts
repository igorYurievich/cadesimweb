import { describe, it, expect } from 'vitest';
import { importCad } from '@model/index';
import { buildWireLinks, pointOnSegment, UnionFind } from '@engine/index';
import { dot, el, schemaOf, seg } from './builders';
import { fixture } from './helpers';

/** Группы в виде отсортированных списков id: удобно сравнивать. */
function groupsOf(drafts: Parameters<typeof schemaOf>[0]): number[][] {
  return buildWireLinks(schemaOf(drafts).wires).groups.map((g) => [...g]);
}

describe('UnionFind', () => {
  it('unions, reports changes and compresses paths', () => {
    const uf = new UnionFind(5);
    expect(uf.union(0, 1)).toBe(true);
    expect(uf.union(1, 2)).toBe(true);
    expect(uf.union(0, 2)).toBe(false);
    expect(uf.connected(0, 2)).toBe(true);
    expect(uf.connected(0, 3)).toBe(false);
  });
});

describe('pointOnSegment', () => {
  it('handles ends, body, outside and zero length', () => {
    expect(pointOnSegment({ x: 3, y: 0 }, { x: 0, y: 0 }, { x: 6, y: 0 })).toBe(true);
    expect(pointOnSegment({ x: 6, y: 0 }, { x: 0, y: 0 }, { x: 6, y: 0 })).toBe(true);
    expect(pointOnSegment({ x: 9, y: 0 }, { x: 0, y: 0 }, { x: 6, y: 0 })).toBe(false);
    expect(pointOnSegment({ x: 3, y: 3 }, { x: 0, y: 0 }, { x: 6, y: 0 })).toBe(false);
    expect(pointOnSegment({ x: 3, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 3 })).toBe(true);
  });
});

describe('wire links (5.2a)', () => {
  it('empty input gives no groups', () => {
    const r = buildWireLinks([]);
    expect(r.groups).toEqual([]);
    expect(r.groupOf.size).toBe(0);
    expect(r.warnings).toEqual([]);
  });

  it('two collinear segments with a shared end are one group', () => {
    expect(groupsOf([seg(0, 0, 6, 0), seg(6, 0, 12, 0)])).toEqual([[1, 2]]);
  });

  it('L-shaped bend joins by coinciding ends, no warning', () => {
    const r = buildWireLinks(schemaOf([seg(0, 0, 6, 0), seg(6, 0, 6, 6)]).wires);
    expect(r.groups).toEqual([[1, 2]]);
    expect(r.warnings).toEqual([]);
  });

  it('separate segments stay separate and groups are numbered from 0', () => {
    const r = buildWireLinks(schemaOf([seg(0, 0, 6, 0), seg(0, 9, 6, 9)]).wires);
    expect(r.groups).toEqual([[1], [2]]);
    expect(r.groupOf.get(1)).toBe(0);
    expect(r.groupOf.get(2)).toBe(1);
  });

  it('T without a junction connects and warns', () => {
    const r = buildWireLinks(schemaOf([seg(0, 0, 12, 0), seg(6, 0, 6, 6)]).wires);
    expect(r.groups).toEqual([[1, 2]]);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toMatchObject({ code: 't-without-junction', at: { x: 6, y: 0 }, wires: [2, 1] });
  });

  it('T with a junction connects without warning', () => {
    const r = buildWireLinks(schemaOf([seg(0, 0, 12, 0), seg(6, 0, 6, 6), dot(6, 0)]).wires);
    expect(r.groups).toEqual([[1, 2, 3]]);
    expect(r.warnings).toEqual([]);
  });

  it('crossing without a junction does not connect', () => {
    const r = buildWireLinks(schemaOf([seg(0, 3, 12, 3), seg(6, 0, 6, 6)]).wires);
    expect(r.groups).toEqual([[1], [2]]);
    expect(r.warnings).toEqual([]);
  });

  it('crossing with a junction connects both segments through', () => {
    const r = buildWireLinks(schemaOf([seg(0, 3, 12, 3), seg(6, 0, 6, 6), dot(6, 3)]).wires);
    expect(r.groups).toEqual([[1, 2, 3]]);
    expect(r.warnings).toEqual([]);
  });

  it('a junction on the end of a segment connects it too', () => {
    const r = buildWireLinks(schemaOf([seg(0, 0, 6, 0), seg(6, 0, 6, 6), dot(6, 0)]).wires);
    expect(r.groups).toEqual([[1, 2, 3]]);
  });

  it('a lone junction or one elsewhere stays in its own group', () => {
    const r = buildWireLinks(schemaOf([seg(0, 0, 6, 0), dot(30, 30)]).wires);
    expect(r.groups).toEqual([[1], [2]]);
  });

  it('two junctions at one point are one group', () => {
    const r = buildWireLinks(schemaOf([dot(3, 3), dot(3, 3)]).wires);
    expect(r.groups).toEqual([[1, 2]]);
  });

  it('zero-length segment: joins by end, joins on a body as a T, otherwise alone', () => {
    expect(buildWireLinks(schemaOf([seg(0, 0, 6, 0), seg(6, 0, 6, 0)]).wires).groups).toEqual([[1, 2]]);
    const t = buildWireLinks(schemaOf([seg(0, 0, 12, 0), seg(6, 0, 6, 0)]).wires);
    expect(t.groups).toEqual([[1, 2]]);
    expect(t.warnings).toHaveLength(1);
    expect(buildWireLinks(schemaOf([seg(0, 0, 6, 0), seg(3, 3, 3, 3)]).wires).groups).toEqual([[1], [2]]);
  });

  it('chain through a T is transitive', () => {
    const r = buildWireLinks(
      schemaOf([seg(0, 0, 12, 0), seg(6, 0, 6, 6), seg(6, 6, 12, 6), seg(30, 30, 31, 30)]).wires,
    );
    expect(r.groups).toEqual([[1, 2, 3], [4]]);
  });

  it('wire kind does not matter for connectivity', () => {
    const r = buildWireLinks(schemaOf([seg(0, 0, 6, 0, { kind: 'phase' }), seg(6, 0, 6, 6, { kind: 'neutral' })]).wires);
    expect(r.groups).toEqual([[1, 2]]);
  });

  it('result does not depend on input order', () => {
    const base = [
      seg(0, 0, 12, 0, { id: 10 }),
      seg(6, 0, 6, 6, { id: 20 }),
      seg(0, 3, 12, 3, { id: 30 }),
      seg(40, 0, 46, 0, { id: 40 }),
      seg(46, 0, 46, 6, { id: 50 }),
      dot(46, 0, 60),
    ];
    const expected = buildWireLinks(schemaOf(base).wires);
    const orders = [[...base].reverse(), [base[3], base[0], base[5], base[2], base[1], base[4]]];
    for (const o of orders) {
      const r = buildWireLinks(schemaOf(o as typeof base).wires);
      expect(r.groups).toEqual(expected.groups);
      expect([...r.groupOf.entries()].sort()).toEqual([...expected.groupOf.entries()].sort());
      expect(r.warnings).toEqual(expected.warnings);
    }
    expect(expected.groups).toEqual([[10, 20], [30], [40, 50, 60]]);
  });

  it('does not mutate the input and ignores elements', () => {
    const s = schemaOf([seg(0, 0, 6, 0), seg(6, 0, 6, 6)], [el(2001, 0, 0, { terminals: [[0, 0], [6, 0]] })]);
    const before = JSON.stringify(s);
    buildWireLinks(s.wires);
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe('wire links on real samples', () => {
  it('a1_1_1: every wire is in a group, T joints carry junctions (no warnings)', () => {
    const { schema } = importCad(fixture('a1_1_1.cad'));
    const r = buildWireLinks(schema.wires);
    expect(schema.wires.length).toBeGreaterThan(0);
    expect(r.groupOf.size).toBe(schema.wires.length);
    expect(r.groups.flat().length).toBe(schema.wires.length);
    expect(r.warnings).toEqual([]);
    // Группы нумеруются по возрастанию наименьшего id.
    const mins = r.groups.map((g) => g[0] as number);
    expect([...mins].sort((a, b) => a - b)).toEqual(mins);
  });

  it('a1_1_1: shuffling wires gives the same groups', () => {
    const { schema } = importCad(fixture('a1_1_1.cad'));
    const a = buildWireLinks(schema.wires);
    const b = buildWireLinks([...schema.wires].reverse());
    expect(b.groups).toEqual(a.groups);
    expect(b.warnings).toEqual(a.warnings);
  });

  it('a1_5 excerpt: does not crash', () => {
    const { schema } = importCad(fixture('a1_5_excerpt.cad'));
    const r = buildWireLinks(schema.wires);
    expect(r.groupOf.size).toBe(schema.wires.length);
  });
});
