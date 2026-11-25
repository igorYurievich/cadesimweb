import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildWireLinks, pointOnSegment } from '@engine/wire-links';
import { SegmentGrid } from '@engine/segment-grid';
import { terminalPosition } from '@model/geometry';
import { importCad } from '@model/cad-import';
import type { Schema, WireSegment } from '@model/types';
import { buildWireLinksBruteForce } from './reference/wire-links-brute';
import { tiledSchema } from './perf/tiled-schema';

/** Все .cad из примеров и фикстур. */
function allCadFiles(): string[] {
  const roots = ['src/data/examples', 'tests/fixtures'];
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(resolve(process.cwd(), dir), { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.cad')) files.push(path);
    }
  };
  roots.forEach(walk);
  return files;
}

const load = (file: string): Schema => importCad(readFileSync(resolve(process.cwd(), file), 'latin1')).schema;

/** Случайные провода на мелкой решётке: много Т, пересечений, совпадающих концов и точек 4001. */
function randomWires(seed: number, count: number): WireSegment[] {
  let state = seed;
  const next = (n: number): number => { state = (state * 1103515245 + 12345) % 2147483648; return state % n; };
  const wires: WireSegment[] = [];
  for (let id = 1; id <= count; id += 1) {
    const x = next(40) * 3; const y = next(40) * 3;
    const roll = next(10);
    if (roll === 0) {
      wires.push({ id, typeCode: 4001, kind: 'junction', from: { x, y }, to: { x, y }, thickness: 0, dot: true });
      continue;
    }
    const length = next(15) * 3;
    const to = roll < 5 ? { x: x + length, y } : roll < 9 ? { x, y: y + length } : { x: x + length, y: y + length };
    wires.push({ id, typeCode: 4000, kind: 'phase', from: { x, y }, to, thickness: 1, dot: false });
  }
  return wires;
}

describe('связность проводов через сетку', () => {
  it.each(allCadFiles())('совпадает с полным перебором: %s', (file) => {
    const wires = load(file).wires;
    expect(buildWireLinks(wires)).toEqual(buildWireLinksBruteForce(wires));
  });

  it('совпадает с полным перебором на схеме из 1800+ проводов', () => {
    const wires = tiledSchema(12).wires;
    expect(wires.length).toBeGreaterThan(1800);
    expect(buildWireLinks(wires)).toEqual(buildWireLinksBruteForce(wires));
  });

  it('совпадает с полным перебором на случайных путаных проводах', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const wires = randomWires(seed, 300);
      expect(buildWireLinks(wires), `seed ${seed}`).toEqual(buildWireLinksBruteForce(wires));
    }
  });

  it('сетка находит каждый провод, на котором лежит клемма (клеммы → сети, разметка в редакторе)', () => {
    for (const file of allCadFiles()) {
      const schema = load(file);
      const grid = new SegmentGrid(schema.wires);
      for (const element of schema.elements) {
        element.terminals.forEach((_, index) => {
          const point = terminalPosition(element, index)!;
          const expected = schema.wires.flatMap((wire, i) => (pointOnSegment(point, wire.from, wire.to) ? [i] : []));
          const found = new Set(grid.atPoint(point));
          expect(expected.every((i) => found.has(i)), `${file}: элемент ${element.id}, клемма ${index}`).toBe(true);
        });
      }
    }
  });
});
