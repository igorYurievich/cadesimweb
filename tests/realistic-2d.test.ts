import { describe, expect, it } from 'vitest';
import { computeSwitching, createEmptyInputs } from '@engine/index';
import { getBehavior, invalidTerminalIndexes } from '@engine/behaviors';
import { cadTypeForCommand, getCadType } from '@model/cad-types';
import { exportCad } from '@model/cad-export';
import { importCad } from '@model/cad-import';
import { buildTail, parseTailLabels } from '@model/cad-tail-terminals';
import { AUTOMATIC_2D, BREAKER_2D, CONTACTOR_2D, DIFFERENTIAL_2D, PUSHBUTTON_2D } from '@model/realistic-2d-types';
import { createEmptySchema } from '@model/types';
import { createPlacedElement } from '../src/ui/helpers';
import { changePoleVariant } from '../src/ui/pole-properties';
import { el, schemaOf } from './builders';
import { fixture } from './helpers';

const labelsOf = (code: number, cad = fixture('2d-simbolos.cad')) =>
  importCad(cad).schema.elements.find((element) => element.typeCode === code)!.terminals
    .map((terminal) => `${terminal.label}@${terminal.offset.x},${terminal.offset.y}`);

describe('2D symbols: catalog and .cad', () => {
  it('maps the 2D palette buttons to their types', () => {
    expect(cadTypeForCommand(33317)?.code).toBe(PUSHBUTTON_2D);
    expect(cadTypeForCommand(33338)?.code).toBe(CONTACTOR_2D);
    expect(cadTypeForCommand(33339)?.code).toBe(BREAKER_2D);
    for (const code of [PUSHBUTTON_2D, CONTACTOR_2D, BREAKER_2D]) {
      expect(getBehavior(code).warning).toBeUndefined();
      expect(invalidTerminalIndexes(code, getCadType(code).terminalCount ?? 0)).toEqual([]);
    }
  });

  it('reads the extra terminals from the record tail of the sample', () => {
    expect(labelsOf(CONTACTOR_2D)).toEqual([
      'A1@21,3', 'A2@21,45', '1@6,0', '2@6,45', '3@12,0', '4@12,45', '5@18,0', '6@18,45',
      '13@9,3', '14@9,42', '21@15,3', '22@15,42',
    ]);
    expect(labelsOf(BREAKER_2D)).toEqual([
      '1@6,0', '3@12,0', '5@18,0', '2@6,51', '4@12,51', '6@18,51', '13@15,3', '14@21,3', '21@3,3', '22@9,3',
    ]);
    expect(labelsOf(PUSHBUTTON_2D)).toEqual(['.1@6,0', '.3@15,0', '.2@6,27', '.4@15,27']);
  });

  it('writes the tail back exactly as CADe_SIMU does', () => {
    expect(buildTail(['5', '6', '13', '14', '21', '22'], 11))
      .toBe(' 5-1- 6-1-13-1-14-1-21-1-22-1-  -0-  -0-  -0-  -0-  -0');
    expect(parseTailLabels('13-1-14-1-21-1-22-1-  -0-  -0')).toEqual(['13', '14', '21', '22']);
    const schema = createEmptySchema();
    schema.elements.push(createPlacedElement(CONTACTOR_2D, { x: 60, y: 60 }, 0, schema));
    schema.elements.push(createPlacedElement(BREAKER_2D, { x: 120, y: 60 }, 0, schema));
    const back = importCad(exportCad(schema)).schema.elements;
    expect(back.map((element) => element.terminals.length)).toEqual([12, 10]);
    const placedLabels = schema.elements[0]!.terminals.map((terminal) => terminal.label);
    expect(back[0]!.terminals.map((terminal) => terminal.label)).toEqual(placedLabels);
  });
});

describe('2D symbols: simulation', () => {
  type Inputs = ReturnType<typeof createEmptyInputs>;
  const edges = (element: ReturnType<typeof el>, setup: (inputs: Inputs) => void = () => {}) => {
    const inputs = createEmptyInputs();
    setup(inputs);
    return computeSwitching(schemaOf([], [element]), inputs).edges.map((edge) => [edge.a, edge.b]);
  };

  it('pushbutton: .1-.2 opens and .3-.4 closes while held', () => {
    const terminals = [[0, 0, '.1'], [9, 0, '.3'], [0, 27, '.2'], [9, 27, '.4']] as const;
    const button = el(PUSHBUTTON_2D, 0, 0, { id: 1, terminals });
    const links = getBehavior(PUSHBUTTON_2D).links;
    const shape = links.map((link) => [link.terminals, Boolean(link.normallyClosed)]);
    expect(shape).toEqual([[[0, 2], true], [[1, 3], false]]);
    expect(edges(button)).toHaveLength(1);
    expect(edges(button, (inputs) => { inputs.pressed[1] = true; })).toHaveLength(1);
    expect(edges(button)).not.toEqual(edges(button, (inputs) => { inputs.pressed[1] = true; }));
  });

  it('contactor: poles and 13-14 follow its own coil, 21-22 is the opposite', () => {
    const behavior = getBehavior(CONTACTOR_2D);
    expect(behavior.links[0]).toEqual({ terminals: [0, 1], kind: 'load', control: 'always' });
    expect(behavior.links.filter((link) => link.control === 'coil-name')).toHaveLength(5);
    expect(behavior.links.at(-1)?.normallyClosed).toBe(true);
  });

  it('breaker: closed by default, opens when switched off or tripped', () => {
    const breaker = el(BREAKER_2D, 0, 0, {
      id: 1, name: '-Q1',
      terminals: [[0, 0, '1'], [6, 0, '3'], [12, 0, '5'], [0, 51, '2'], [6, 51, '4'], [12, 51, '6'],
        [9, 3, '13'], [15, 3, '14'], [-3, 3, '21'], [3, 3, '22']],
    });
    const closed = (setup?: (inputs: Inputs) => void) => edges(breaker, setup).length;
    expect(closed()).toBe(4);
    expect(closed((inputs) => { inputs.toggled[1] = false; })).toBe(1);
    expect(closed((inputs) => { inputs.tripped[1] = true; })).toBe(0);
  });
});

describe('2D automático and diferencial: variants', () => {
  const sample = importCad(fixture('2d-simbolos.cad')).schema.elements;
  const byName = (name: string) => sample.find((element) => element.name === name)!;

  it('reads the variant from nums[16] of the sample', () => {
    expect(byName('-F1').typeCode).toBe(AUTOMATIC_2D.IN);
    expect(byName('-F3').typeCode).toBe(AUTOMATIC_2D.IIN);
    expect(byName('-F2').typeCode).toBe(AUTOMATIC_2D.IIIN);
    expect(byName('-F4').typeCode).toBe(DIFFERENTIAL_2D.IN);
    expect(byName('-F5').typeCode).toBe(DIFFERENTIAL_2D.IIIN);
    expect(byName('-F3').terminals.map((terminal) => `${terminal.label}@${terminal.offset.x},${terminal.offset.y}`))
      .toEqual(['1@3,0', '3@9,0', '5@15,0', '2@3,27', '4@9,27', '6@15,27']);
  });

  it('writes the file code, variant field and record slots like the sample', () => {
    const schema = createEmptySchema();
    const element = createPlacedElement(AUTOMATIC_2D.IN, { x: 60, y: 60 }, 0, schema);
    schema.elements.push(element);
    expect(changePoleVariant(element, 'IIN')).toBe(true);
    const text = exportCad(schema);
    expect(text).toMatch(/\*6017#-F1#[^#]*#N#1#3#5#2#4#6#\*1\*1\*1\*1\*1\*1\*1\*0\*/);
    expect(text).toMatch(/\*21\*30\*18\*/);
    const back = importCad(text).schema.elements[0]!;
    expect(back.typeCode).toBe(AUTOMATIC_2D.IIN);
    expect(back.terminals).toHaveLength(6);
  });

  it('pairs each top terminal with the one below it', () => {
    expect(getBehavior(AUTOMATIC_2D.IIIN).links.map((link) => link.terminals))
      .toEqual([[0, 4], [1, 5], [2, 6], [3, 7]]);
    expect(getBehavior(DIFFERENTIAL_2D.IN).links.map((link) => link.terminals)).toEqual([[0, 2], [1, 3]]);
    for (const code of [...Object.values(AUTOMATIC_2D), ...Object.values(DIFFERENTIAL_2D)]) {
      expect(invalidTerminalIndexes(code, getCadType(code).terminalCount ?? 0)).toEqual([]);
    }
  });
});
