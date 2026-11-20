import { describe, expect, it } from 'vitest';
import { computeSwitching, createEmptyInputs } from '@engine/index';
import { getBehavior, invalidTerminalIndexes } from '@engine/behaviors';
import { cadTypeForCommand, getCadType } from '@model/cad-types';
import { exportCad } from '@model/cad-export';
import { importCad } from '@model/cad-import';
import { BREAKER_2D, CONTACTOR_2D, THERMAL_RELAY_2D } from '@model/realistic-2d-types';
import { createEmptySchema } from '@model/types';
import { createPlacedElement } from '../src/ui/helpers';
import { el, schemaOf } from './builders';
import { fixture } from './helpers';

// Клемма 1 на две клетки правее позиции записи (REALISTIC_2D_ORIGIN_DX).
const TERMINALS = [[6, 0, '1'], [12, 0, '3'], [18, 0, '5'], [6, 36, '2'], [12, 36, '4'], [18, 36, '6'],
  [3, 33, '97'], [9, 33, '98'], [15, 33, '95'], [21, 33, '96']] as const;

type Inputs = ReturnType<typeof createEmptyInputs>;

/** Замкнутые пары клемм элемента 1 при заданных входах. */
function closedPairs(extra: Parameters<typeof schemaOf>[1] = [], setup: (inputs: Inputs) => void = () => {}) {
  const relay = el(THERMAL_RELAY_2D, 0, 0, { id: 1, name: '-F1', terminals: TERMINALS });
  const inputs = createEmptyInputs();
  setup(inputs);
  return computeSwitching(schemaOf([], [relay, ...extra]), inputs).edges
    .map((edge) => `${edge.element}:${edge.a.index}-${edge.b.index}`);
}

describe('2D thermal relay 6016: catalog and .cad', () => {
  it('maps the «Relé térmico» button of the 2D panel to 6016', () => {
    expect(cadTypeForCommand(33340)?.code).toBe(THERMAL_RELAY_2D);
    expect(getBehavior(THERMAL_RELAY_2D).warning).toBeUndefined();
    expect(invalidTerminalIndexes(THERMAL_RELAY_2D, getCadType(THERMAL_RELAY_2D).terminalCount ?? 0)).toEqual([]);
  });

  it('reads 97 98 from the slots and 95 96 from the record tail of the sample', () => {
    const relay = importCad(fixture('2d-termico.cad')).schema.elements[0]!;
    expect([relay.typeCode, relay.name, relay.size.w, relay.size.h]).toEqual([THERMAL_RELAY_2D, '-F', 27, 39]);
    expect(relay.terminals.map((terminal) => `${terminal.label}@${terminal.offset.x},${terminal.offset.y}`))
      .toEqual(TERMINALS.map(([x, y, label]) => `${label}@${x},${y}`));
  });

  it('writes a new relay like the sample: 8 slots and the tail 97 98 95 96', () => {
    const schema = createEmptySchema();
    schema.elements.push(createPlacedElement(THERMAL_RELAY_2D, { x: 60, y: 60 }, 0, schema));
    const text = exportCad(schema);
    expect(text).toMatch(/\*6016#-F1#[^#]*#1#3#5#2#4#6#97#98(\*1){8}\*60\*\d+\*0\*0\*-12\*-3\*27\*39\*/);
    expect(text).toContain('#97-1-98-1-95-1-96-1-  -0-  -0-  -0-  -0-  -0');
    expect(importCad(text).schema.elements[0]!.terminals).toHaveLength(10);
  });
});

describe('2D symbols with terminals in the tail', () => {
  it('new contactor and breaker records keep 8 slots and 23 numbers, as in the sample', () => {
    const schema = createEmptySchema();
    schema.elements.push(createPlacedElement(CONTACTOR_2D, { x: 60, y: 60 }, 0, schema));
    schema.elements.push(createPlacedElement(BREAKER_2D, { x: 120, y: 60 }, 0, schema));
    const text = exportCad(schema);
    expect(text).toMatch(/\*7018#-KM1#[^#]*#A1#A2#1#2#3#4#5#6(\*1){8}\*60\*/);
    expect(text).toMatch(/\*6015#-Q1#[^#]*#1#3#5#2#4#6#13#14(\*1){8}\*120\*/);
  });
});

describe('2D thermal relay 6016: simulation', () => {
  it('at rest: poles conduct and 95-96 is closed', () => {
    expect(closedPairs()).toEqual(['1:0-3', '1:1-4', '1:2-5', '1:8-9']);
  });

  it('tripped (click or «Disparo»): 97-98 closes, 95-96 opens, poles keep conducting', () => {
    const tripped = ['1:0-3', '1:1-4', '1:2-5', '1:6-7'];
    expect(closedPairs([], (inputs) => { inputs.tripped[1] = true; })).toEqual(tripped);
    expect(closedPairs([], (inputs) => { inputs.toggled[1] = false; })).toEqual(tripped);
  });

  it('separate thermal contacts with the same name follow the relay', () => {
    const nc = el(8017, 30, 0, { id: 2, name: '-F1', terminals: [[0, 0, '95'], [0, 12, '96']] });
    expect(closedPairs([nc])).toContain('2:0-1');
    expect(closedPairs([nc], (inputs) => { inputs.toggled[1] = false; })).not.toContain('2:0-1');
  });
});
