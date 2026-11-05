import { describe, it, expect } from 'vitest';
import { importCad } from '@model/cad-import';
import { samePoint, schemaBounds, terminalPosition, rotateOffset } from '@model/geometry';
import type { SchemaElement } from '@model/types';
import { fixture } from './helpers';

const full = importCad(fixture('a1_1_1.cad'));
const excerpt = importCad(fixture('a1_5_excerpt.cad'));

function el(r: typeof full, name: string, type: number): SchemaElement {
  const e = r.schema.elements.find((x) => x.name === name && x.typeCode === type);
  if (!e) throw new Error(`no element ${name} (${type})`);
  return e;
}
const pos = (e: SchemaElement, i: number) => terminalPosition(e, i);

describe('cad-import: Actividad 1.1.1', () => {
  it('splits records into elements and wires', () => {
    expect(full.schema.elements).toHaveLength(14);
    expect(full.schema.wires).toHaveLength(54);
    const count = (k: string) => full.schema.wires.filter((w) => w.kind === k).length;
    expect(count('phase')).toBe(35);
    expect(count('neutral')).toBe(13);
    expect(count('protection')).toBe(3);
    expect(count('junction')).toBe(3);
    expect(full.unknownTypes).toEqual([]);
  });

  it('reads the title block', () => {
    const s = full.schema.sheet;
    expect(s.author).toBe('IGOR LIPSKIY');
    expect(s.entity).toBe('IES LAS LAGUNAS');
    expect(s.title).toBe('Actividad 1');
    expect(s.date).toBe('18/09/25');
    expect(s.fileName).toBe('Actividad_A1_1_IGOR_LIPSKIY.cad');
    expect([s.width, s.height]).toEqual([279, 210]);
  });

  it('places the motor terminals in one row with step 6', () => {
    const m = el(full, '-M1', 1000);
    expect(m.terminals.map((t) => t.label)).toEqual(['U1', 'V1', 'W1', 'PE']);
    expect([0, 1, 2, 3].map((i) => pos(m, i))).toEqual([
      { x: 48, y: 186 },
      { x: 54, y: 186 },
      { x: 60, y: 186 },
      { x: 66, y: 186 },
    ]);
  });

  it('places two rows of terminals: row gap is frame height minus 3', () => {
    const f1 = el(full, '-F1', 6004); // h = 15
    expect(f1.terminals).toHaveLength(8);
    expect(pos(f1, 0)).toEqual({ x: 48, y: 51 });
    expect(pos(f1, 4)).toEqual({ x: 48, y: 63 });
    const q1 = el(full, '-Q1', 6012); // h = 24
    expect(pos(q1, 4)).toEqual({ x: 48, y: 111 });
  });

  it('uses step 9 for the thermal-relay auxiliary contact', () => {
    const t = el(full, '-FG1', 8018);
    expect(t.terminals.map((x) => x.label)).toEqual(['95', '97', '96', '98']);
    expect([pos(t, 1), pos(t, 3)]).toEqual([
      { x: 126, y: 87 },
      { x: 126, y: 99 },
    ]);
  });

  it('turns a rotated lamp into a horizontal one', () => {
    const h = el(full, '-H', 9008);
    expect(h.rotation).toBe(3);
    expect([pos(h, 0), pos(h, 1)]).toEqual([
      { x: 135, y: 102 },
      { x: 147, y: 102 },
    ]);
  });

  it('makes a terminal strip without flags from its width', () => {
    const x = el(full, '-X', 3007);
    expect(x.terminals).toHaveLength(5);
    expect(pos(x, 4)).toEqual({ x: 72, y: 42 });
  });

  it('every terminal of the sample sits on a wire end (geometry check)', () => {
    let total = 0;
    for (const e of full.schema.elements) {
      for (let i = 0; i < e.terminals.length; i += 1) {
        total += 1;
        const p = pos(e, i)!;
        const touched = full.schema.wires.some(
          (w) => w.kind !== 'junction' && (samePoint(w.from, p) || samePoint(w.to, p)),
        );
        expect(touched).toBe(true);
      }
    }
    expect(total).toBe(55);
  });

  it('keeps the service object but leaves it out of the sheet bounds', () => {
    expect(full.schema.elements.some((e) => e.typeCode === 20000)).toBe(true);
    const b = schemaBounds(full.schema)!;
    expect(b.maxY).toBeLessThan(300);
    expect(b.minX).toBe(48);
  });

  it('keeps the source fields of every record', () => {
    for (const e of full.schema.elements) expect(e.raw?.nums).toHaveLength(23);
    for (const w of full.schema.wires) expect(w.raw?.texts).toHaveLength(10);
  });
});

describe('cad-import: Actividad 1.5 excerpt', () => {
  it('reads timer coil parameters', () => {
    const t1 = el(excerpt, '-KM1', 9004);
    const t2 = el(excerpt, '-KM2', 9004);
    expect(t1.params).toEqual({ scale: 0, time: 5, extra: '0#5' });
    expect(t2.params).toEqual({ scale: 0, time: 10, extra: '0#10' });
    expect(t1.terminals.map((t) => t.label)).toEqual(['A1', 'A2']);
  });

  it('reads the lamp colour index', () => {
    expect(el(excerpt, '-H1', 9008).params.color).toBe(1);
  });

  it('reads an empty title block and sheet size', () => {
    const s = excerpt.schema.sheet;
    expect([s.author, s.title, s.entity]).toEqual(['', '', '']);
    expect(s.date).toBe('08-Oct-2025');
    expect(s.fileName).toBe('Actividad15.cad');
  });

  it('wire thickness is read from the record', () => {
    expect(excerpt.schema.wires.every((w) => w.kind === 'junction' || w.thickness === 2)).toBe(true);
  });

  it('places a tall Q1 (6006): row gap 18', () => {
    const q = el(excerpt, '-Q1', 6006);
    expect(pos(q, 4)).toEqual({ x: 18, y: 93 });
  });

  it('shows a visible junction dot only when the record has a size', () => {
    const dots = excerpt.schema.wires.filter((w) => w.kind === 'junction');
    expect(dots).toHaveLength(1);
    expect(dots[0]?.dot).toBe(true);
  });

  it('single-pole contactor and timed contact fall to a 12-high column', () => {
    expect(pos(el(excerpt, '-KM1', 2006), 1)).toEqual({ x: 150, y: 150 });
    expect(pos(el(excerpt, '-KM1', 7004), 1)).toEqual({ x: 174, y: 150 });
  });
});

describe('cad-import: unknown types and rotation', () => {
  it('reports an unknown type but still imports it', () => {
    const text =
      'CADe_SIMU*0*9999#-Z1##A#B######*1*1*0*0*0*0*0*0*30*30*0*0*0*0*6*15*0*0*0*1*0*0*0#$$$*1*1*1*2*4*0*1*0*0*279*210&&&*a*b*c*d*e*f*g*h*i*j***$$$&&&';
    const r = importCad(text);
    expect(r.unknownTypes).toEqual([9999]);
    expect(r.schema.elements[0]?.terminals.map((t) => t.label)).toEqual(['A', 'B']);
  });

  it('rotateOffset: four turns return to the start, k=3 maps (0,12) to (12,0)', () => {
    const p = { x: 3, y: 12 };
    let q = p;
    for (let i = 0; i < 4; i += 1) q = rotateOffset(q, 1);
    expect(q).toEqual(p);
    expect(rotateOffset({ x: 0, y: 12 }, 3)).toEqual({ x: 12, y: 0 });
  });
});
