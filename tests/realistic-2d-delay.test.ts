import { describe, expect, it } from 'vitest';
import { computeSwitching, createEmptyInputs, createEngineInput, simulate } from '@engine/index';
import type { EngineMemory, EngineState } from '@engine/index';
import { getBehavior, invalidTerminalIndexes } from '@engine/behaviors';
import { cadTypeForCommand, getCadType } from '@model/cad-types';
import { exportCad } from '@model/cad-export';
import { importCad } from '@model/cad-import';
import { DELAY_BLOCK_2D } from '@model/realistic-2d-types';
import { createEmptySchema } from '@model/types';
import { createPlacedElement } from '../src/ui/helpers';
import { el, schemaOf, seg } from './builders';
import { fixture } from './helpers';

const BLOCK = 4;
const LAMP = 5;

/**
 * Катушка -KM1 (9000) от отдельных колодок L1 и N; блок -KM1 с лампой через НО контакт:
 * у OFF delay это 57-58, у ON delay — 65-66.
 * powered = false — провода катушки сняты (катушка отключена), id элементов те же.
 */
function circuit(typeCode: number, powered: boolean, seconds = 2) {
  const coil = el(9000, 30, 12, { id: 1, name: '-KM1', terminals: [[0, 0, 'A1'], [6, 0, 'A2']] });
  const coilL1 = el(3000, 30, 0, { id: 2, terminals: [[0, 0, 'L1']] });
  const coilN = el(3001, 36, 24, { id: 3, terminals: [[0, 0, 'N']] });
  const block = el(typeCode, 60, 0, {
    id: BLOCK, name: '-KM1', terminals: [[0, 0, '57'], [0, 27, '58'], [18, 0, '65'], [18, 27, '66']],
  });
  block.params = { scale: 0, time: seconds };
  const lamp = el(9008, 90, 54, { id: LAMP, name: '-H1', terminals: [[0, 0, 'X1'], [6, 0, 'X2']] });
  const no = typeCode === DELAY_BLOCK_2D.ON ? 78 : 60;
  const lampL1 = el(3000, no, -12, { id: 6, terminals: [[0, 0, 'L1']] });
  const lampN = el(3001, 102, 54, { id: 7, terminals: [[0, 0, 'N']] });
  const coilWires = powered ? [seg(30, 0, 30, 12), seg(36, 24, 36, 12, { kind: 'neutral' })] : [];
  return schemaOf([
    ...coilWires,
    seg(no, -12, no, 0), seg(no, 27, no, 54), seg(no, 54, 90, 54), seg(96, 54, 102, 54, { kind: 'neutral' }),
  ], [coil, coilL1, coilN, block, lamp, lampL1, lampN]);
}

/** Прогон по шагам: [время, катушка включена] → горит ли лампа после каждого шага. */
function lampTrace(typeCode: number, steps: ReadonlyArray<readonly [number, boolean]>): boolean[] {
  let memory: EngineMemory | undefined;
  return steps.map(([time, powered]) => {
    const state: EngineState = simulate({ ...createEngineInput(circuit(typeCode, powered), time), memory });
    memory = state.memory;
    return state.lamps[LAMP] ?? false;
  });
}

describe('2D delay blocks: catalog and .cad', () => {
  it('maps the ON and OFF delay buttons to 7020 and 7021; ON: 57-58 NC / 65-66 NO, OFF: the other way', () => {
    expect(cadTypeForCommand(33381)?.code).toBe(DELAY_BLOCK_2D.ON);
    expect(cadTypeForCommand(33382)?.code).toBe(DELAY_BLOCK_2D.OFF);
    const shape = (code: number) =>
      getBehavior(code).links.map((link) => [link.terminals, link.control, Boolean(link.normallyClosed)]);
    // ON delay: 57-58 НЗ, 65-66 НО; OFF delay: 57-58 НО, 65-66 НЗ.
    expect(shape(DELAY_BLOCK_2D.ON)).toEqual([[[0, 1], 'coil-name', true], [[2, 3], 'coil-name', false]]);
    expect(shape(DELAY_BLOCK_2D.OFF)).toEqual([[[0, 1], 'coil-name', false], [[2, 3], 'coil-name', true]]);
    for (const code of Object.values(DELAY_BLOCK_2D)) {
      expect(invalidTerminalIndexes(code, getCadType(code).terminalCount ?? 0)).toEqual([]);
    }
  });

  it('reads fixed terminals and the delay from texts[5] of the sample', () => {
    const blocks = importCad(fixture('2d-simbolos.cad')).schema.elements
      .filter((element) => element.typeCode === DELAY_BLOCK_2D.OFF);
    expect(blocks.map((element) => [element.name, element.params.time, element.params.scale]))
      .toEqual([['-KM1', 5, 0], ['-KM1', 1, 0]]);
    expect(blocks[0]!.terminals.map((terminal) => `${terminal.label}@${terminal.offset.x},${terminal.offset.y}`))
      .toEqual(['57@3,0', '58@3,27', '65@21,0', '66@21,27']);
  });

  it('writes the record like the sample: no terminal flags, 0#<time>#9#1#5', () => {
    const schema = createEmptySchema();
    const block = createPlacedElement(DELAY_BLOCK_2D.ON, { x: 60, y: 60 }, 0, schema);
    schema.elements.push(block);
    expect(block.params).toEqual({ scale: 0, time: 1 });
    const record = /\*7020#-KM1#[^#]*###0#1#9#1#5#(\*0){8}\*60\*\d+\*0\*0\*-12\*-3\*27\*30\*/;
    expect(exportCad(schema)).toMatch(record);
    block.params.time = 2.5;
    const back = importCad(exportCad(schema)).schema.elements[0]!;
    expect([back.typeCode, back.params.time, back.terminals.length]).toEqual([DELAY_BLOCK_2D.ON, 2.5, 4]);
  });

  it('keeps unknown fields of an imported record when the delay changes', () => {
    const schema = importCad(fixture('2d-simbolos.cad')).schema;
    const block = schema.elements.find((element) => element.typeCode === DELAY_BLOCK_2D.OFF)!;
    block.params.time = 3;
    expect(exportCad(schema)).toContain('*7021#-KM1####0#3#9#1#5#*');
  });
});

describe('2D delay blocks: simulation', () => {
  it('ON delay closes NO after the delay and opens it at once when the coil drops', () => {
    expect(lampTrace(DELAY_BLOCK_2D.ON, [[0, true], [1.5, true], [2, true], [5, true], [5.1, false]]))
      .toEqual([false, false, true, true, false]);
  });

  it('OFF delay closes NO with the coil and opens it the delay after the coil drops', () => {
    expect(lampTrace(DELAY_BLOCK_2D.OFF, [[0, false], [1, true], [3, false], [4.5, false], [5, false]]))
      .toEqual([false, true, true, true, false]);
  });

  it('a coil that drops before the delay ends restarts the ON delay from zero', () => {
    expect(lampTrace(DELAY_BLOCK_2D.ON, [[0, true], [1.5, true], [1.6, false], [2, true], [3.5, true], [4, true]]))
      .toEqual([false, false, false, false, false, true]);
  });

  it('OFF delay does not count while the coil stays powered, however long', () => {
    const steps = [[0, true], [5, true], [30, true], [30.5, false], [31.9, false], [32.6, false]] as const;
    expect(lampTrace(DELAY_BLOCK_2D.OFF, steps))
      .toEqual([true, true, true, true, true, false]);
  });

  it('OFF delay starts counting after a short pulse on the coil', () => {
    expect(lampTrace(DELAY_BLOCK_2D.OFF, [[0, true], [0.2, false], [1, false], [2.1, false], [2.3, false]]))
      .toEqual([true, true, true, true, false]);
  });

  it('OFF delay: powering the coil again during the countdown stops it, the next drop restarts it from zero', () => {
    expect(lampTrace(DELAY_BLOCK_2D.OFF, [[0, true], [1, false], [2.5, false], [2.6, true], [10, true], [10.1, false],
      [11.5, false], [12.2, false]]))
      .toEqual([true, true, true, true, true, true, true, false]);
  });

  it('ON delay: NC 57-58 is closed at rest and opens after the delay, NO 65-66 closes', () => {
    const schema = circuit(DELAY_BLOCK_2D.ON, true);
    const done = { [BLOCK]: { phase: 'done' as const, elapsed: 2, lastTime: 2 } };
    const closed = (timers: typeof done | Record<number, never>) =>
      computeSwitching(schema, createEmptyInputs(), {}, undefined, timers).edges
        .filter((edge) => edge.element === BLOCK).map((edge) => [edge.a.index, edge.b.index]);
    expect(closed({})).toEqual([[0, 1]]);
    expect(closed(done)).toEqual([[2, 3]]);
  });

  it('OFF delay: NC 65-66 is closed at rest and opens while the block is operated', () => {
    const schema = circuit(DELAY_BLOCK_2D.OFF, true);
    const timers = simulate(createEngineInput(schema, 0)).memory.timers;
    const closed = (memory: typeof timers) => computeSwitching(schema, createEmptyInputs(), {}, undefined, memory).edges
      .filter((edge) => edge.element === BLOCK).map((edge) => [edge.a.index, edge.b.index]);
    expect(closed({})).toEqual([[2, 3]]);
    expect(closed(timers)).toEqual([[0, 1]]);
  });
});
