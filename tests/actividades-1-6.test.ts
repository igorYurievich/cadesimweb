import { describe, expect, it } from 'vitest';
import { CadScenario } from './scenario';
import { fixture } from './helpers';
import { importCad } from '../src/model/cad-import';
import { allBehaviors, invalidTerminalIndexes } from '../src/engine/behaviors';
import { isKnownCadType } from '../src/model/cad-types';
import { terminalKey } from '../src/engine/types';

function activity(): CadScenario {
  return new CadScenario(fixture('a1_6.cad'));
}

describe('Actividad 1.6: types 3003, 3005, 6002, 6003, 6009, 8001', () => {
  it('knows every type used in the file', () => {
    const { unknownTypes } = importCad(fixture('a1_6.cad'));
    expect(unknownTypes).toEqual([]);
    for (const code of [3003, 3005, 6002, 6003, 6009, 8001]) expect(isKnownCadType(code)).toBe(true);
  });

  it('keeps the terminal indexes of the new behaviours in range', () => {
    const { schema } = importCad(fixture('a1_6.cad'));
    for (const element of schema.elements) {
      expect(invalidTerminalIndexes(element.typeCode, element.terminals.length)).toEqual([]);
    }
    expect(allBehaviors().some((behavior) => behavior.typeCode === 8001)).toBe(true);
  });

  it('gives every record a unique id even when the file repeats ids', () => {
    const { schema } = importCad(fixture('a1_6.cad'));
    const ids = [...schema.elements.map((element) => element.id), ...schema.wires.map((wire) => wire.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('places the terminals of a horizontal contact on the wires (rotated frame is swapped)', () => {
    const { schema } = importCad(fixture('a1_6.cad'));
    const contact = schema.elements.find((element) => element.typeCode === 7001 && element.rotation === 3);
    expect(contact?.terminals.map((terminal) => terminal.offset)).toEqual([{ x: 0, y: 0 }, { x: 12, y: 0 }]);
  });

  it('feeds the red stop lamp at rest and switches it off while KM1 runs', () => {
    const scenario = activity();
    const [stopLamp] = scenario.schema.elements.filter((element) => element.typeCode === 9008 && element.params.color === 1);
    expect(stopLamp).toBeDefined();
    expect(scenario.state.lamps[stopLamp?.id as number]).toBe(true);

    scenario.press('S2');
    scenario.release('S2');
    expect(scenario.state.coils['-KM1']).toBe(true);
    expect(scenario.state.lamps[stopLamp?.id as number]).toBe(false);
  });

  it('starts the motor with S2 and stops it with the NC button S1 (8001)', () => {
    const scenario = activity();
    const motor = scenario.elementId('M', 1000);
    expect(scenario.state.motors[motor]?.running).toBe(false);
    scenario.press('S2');
    scenario.release('S2');
    expect(scenario.state.motors[motor]?.running).toBe(true);
    expect(scenario.state.faults).toEqual([]);

    scenario.press('S1');
    scenario.release('S1');
    expect(scenario.state.coils['-KM1']).toBe(false);
    expect(scenario.state.motors[motor]?.running).toBe(false);
    expect(scenario.state.stable).toBe(true);
  });
  it('reverses the motor when the 10 s delay of KT1 ends (KM2 swaps L1 and L3)', () => {
    const scenario = activity();
    const motor = scenario.elementId('M', 1000);
    const timer = scenario.schema.elements.find((element) => element.typeCode === 9004)?.id as number;
    const motorPhases = (): string[] => [0, 1, 2].map((index) => {
      const net = scenario.state.nets.find((candidate) => candidate.id === scenario.state.terminalNet[terminalKey(motor, index)]);
      return (net?.potentials ?? []).filter((potential) => potential.startsWith('L')).join('');
    });
    const pressStop = (value: boolean): void => {
      for (const element of scenario.schema.elements.filter((candidate) => candidate.name === '-S3')) scenario.inputs.pressed[element.id] = value;
      scenario.recalculate();
    };

    scenario.press('S2');
    scenario.release('S2');
    expect(motorPhases()).toEqual(['L1', 'L2', 'L3']);

    pressStop(true);
    pressStop(false);
    expect(scenario.state.motors[motor]?.running).toBe(false);
    expect(scenario.state.memory.timers[timer]?.phase).toBe('counting');

    scenario.advance(9);
    expect(scenario.state.memory.timers[timer]?.elapsed).toBe(9);
    expect(scenario.state.coils['-KM2']).toBe(false);

    scenario.advance(1);
    expect(scenario.state.memory.timers[timer]?.phase).toBe('done');
    expect(scenario.state.coils['-KM2']).toBe(true);
    expect(scenario.state.motors[motor]?.running).toBe(true);
    expect(motorPhases()).toEqual(['L3', 'L2', 'L1']);
  });
});
