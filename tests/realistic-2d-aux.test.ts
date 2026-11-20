import { describe, expect, it } from 'vitest';
import { computeSwitching, createEmptyInputs } from '@engine/index';
import { getBehavior, invalidTerminalIndexes } from '@engine/behaviors';
import { cadTypeForCommand, getCadType } from '@model/cad-types';
import { exportCad } from '@model/cad-export';
import { importCad } from '@model/cad-import';
import { AUX_BLOCK_2D } from '@model/realistic-2d-types';
import { createEmptySchema } from '@model/types';
import { createPlacedElement } from '../src/ui/helpers';
import { el, schemaOf } from './builders';
import { fixture } from './helpers';

const TERMINALS = [[3, 0, '53'], [3, 27, '54'], [9, 0, '61'], [9, 27, '62'],
  [15, 0, '71'], [15, 27, '72'], [21, 0, '83'], [21, 27, '84']] as const;

describe('2D auxiliary contact block 7019', () => {
  it('maps the «Contactos auxiliares» button of the 2D panel and has valid links', () => {
    expect(cadTypeForCommand(33380)?.code).toBe(AUX_BLOCK_2D);
    expect(invalidTerminalIndexes(AUX_BLOCK_2D, getCadType(AUX_BLOCK_2D).terminalCount ?? 0)).toEqual([]);
  });

  it('reads fixed terminals 53 54 61 62 71 72 83 84 from the empty record of the sample', () => {
    const block = importCad(fixture('2d-simbolos.cad')).schema.elements.find((e) => e.typeCode === AUX_BLOCK_2D)!;
    expect(block.name).toBe('-KM2');
    expect(block.terminals.map((t) => `${t.label}@${t.offset.x},${t.offset.y}`))
      .toEqual(TERMINALS.map(([x, y, label]) => `${label}@${x},${y}`));
  });

  it('writes a record without terminal flags or labels, as in the sample', () => {
    const schema = createEmptySchema();
    schema.elements.push(createPlacedElement(AUX_BLOCK_2D, { x: 60, y: 60 }, 0, schema));
    const text = exportCad(schema);
    expect(text).toMatch(/\*7019#-KM1#[^#]*########(\*0){8}\*60\*\d+\*0\*0\*-12\*-3\*27\*30\*/);
    expect(importCad(text).schema.elements[0]!.terminals).toHaveLength(8);
  });

  it('follows the coil with the same name: 53-54 and 83-84 close, 61-62 and 71-72 open', () => {
    const block = el(AUX_BLOCK_2D, 0, 0, { id: 1, name: '-KM1', terminals: TERMINALS });
    const closed = (coil: boolean) => computeSwitching(schemaOf([], [block]), createEmptyInputs(), { '-KM1': coil })
      .edges.map((edge) => `${edge.a.index}-${edge.b.index}`);
    expect(closed(false)).toEqual(['2-3', '4-5']);
    expect(closed(true)).toEqual(['0-1', '6-7']);
    expect(getBehavior(AUX_BLOCK_2D).links).toHaveLength(4);
  });
});
