/**
 * «Открыть → сохранить → открыть» не должно двигать чертёж: раньше экспорт подгонял схему под рамку
 * CADe_SIMU и на каждом сохранении сдвигал её то вверх, то вниз (Ejemplo 3: мотор y 162 → 168 → 162).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { importCad } from '@model/cad-import';
import { exportCad } from '@model/cad-export';
import type { Schema } from '@model/types';
import { schemaOf, seg } from './builders';

function cadFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return cadFiles(path);
    return path.endsWith('.cad') ? [path] : [];
  });
}

const FILES = [...cadFiles('src/data/examples'), ...cadFiles('tests/fixtures')];

const positions = (schema: Schema): string[] => [
  ...schema.elements.map((e) => `e${e.id}:${e.position.x},${e.position.y}`),
  ...schema.wires.map((w) => `w${w.id}:${w.from.x},${w.from.y}-${w.to.x},${w.to.y}`),
];

describe('.cad: повторное сохранение', () => {
  it.each(FILES)('%s не сдвигается и сохраняется одинаково', (file) => {
    const original = importCad(readFileSync(file, 'latin1')).schema;
    const first = exportCad(original);
    const reopened = importCad(first).schema;
    expect(exportCad(reopened)).toBe(first);
    // Все файлы CADe_SIMU уже лежат ниже верхнего поля, поэтому координаты не меняются.
    expect(positions(reopened)).toEqual(positions(original));
  });

  it('провода нулевой длины из CADe_SIMU сохраняются как есть', () => {
    const text = readFileSync('src/data/examples/Ejemplos/Ejemplo 3.cad', 'latin1');
    const zero = (schema: Schema): number[] => schema.wires
      .filter((w) => w.kind !== 'junction' && w.from.x === w.to.x && w.from.y === w.to.y)
      .map((w) => w.id);
    const before = zero(importCad(text).schema);
    expect(before).toEqual([179, 180]);
    expect(zero(importCad(exportCad(importCad(text).schema)).schema)).toEqual(before);
  });

  it('схема выше верхнего поля сдвигается вниз один раз, по сетке', () => {
    const schema = schemaOf([seg(30, 4, 30, 40)]);
    const first = importCad(exportCad(schema)).schema;
    expect(first.wires[0]?.from.y).toBe(10);
    expect(exportCad(first)).toBe(exportCad(importCad(exportCad(first)).schema));
    expect(importCad(exportCad(first)).schema.wires[0]?.from.y).toBe(10);
  });
});
