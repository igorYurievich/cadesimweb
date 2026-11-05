import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CadScenario } from './scenario';
import { importCad } from '../src/model/cad-import';
import { invalidTerminalIndexes } from '../src/engine/behaviors';
import { isKnownCadType } from '../src/model/cad-types';

const text = (): string => readFileSync(resolve(process.cwd(), 'src/data/examples/Actividad_1_8.cad'), 'utf8');

/** Автоматы включает пользователь (так делает интерфейс); тепловая защита 6007 взведена по умолчанию. */
function activity(): CadScenario {
  const scenario = new CadScenario(text());
  for (const element of scenario.schema.elements) {
    if ([6001, 6004, 6012].includes(element.typeCode)) scenario.inputs.toggled[element.id] = true;
  }
  scenario.recalculate();
  return scenario;
}

describe('Actividad 1.8: звезда–треугольник (типы 1001 и 7006)', () => {
  it('knows every type used in the file', () => {
    const { schema, unknownTypes } = importCad(text());
    expect(unknownTypes).toEqual([]);
    expect(isKnownCadType(1001)).toBe(true);
    expect(isKnownCadType(7006)).toBe(true);
    for (const element of schema.elements) expect(invalidTerminalIndexes(element.typeCode, element.terminals.length)).toEqual([]);
  });

  it('starts with the thermal protection armed (not tripped) and nothing running', () => {
    const scenario = activity();
    const thermal = scenario.findElement('F', 6007);
    expect(scenario.state.tripped[thermal.id]).toBe(false);
    expect(scenario.state.coils['-KM1']).toBe(false);
  });

  it('starts in star (KM1 + KM3) and switches to delta (KM1 + KM2) after the timer', () => {
    const scenario = activity();
    const motor = scenario.findElement('M1');
    scenario.press('S2');
    scenario.release('S2');
    scenario.advance(1);
    expect(scenario.state.coils).toMatchObject({ '-KM1': true, '-KM3': true, '-KM2': false });
    expect(scenario.state.motors[motor.id]).toEqual({ running: true, faulted: false });
    scenario.advance(5);
    expect(scenario.state.coils).toMatchObject({ '-KM1': true, '-KM3': false, '-KM2': true });
    expect(scenario.state.motors[motor.id]).toEqual({ running: true, faulted: false });
    expect(scenario.state.faults).toEqual([]);
  });

  it('stops on S1 and on thermal trip', () => {
    const scenario = activity();
    const motor = scenario.findElement('M1');
    scenario.press('S2');
    scenario.release('S2');
    scenario.advance(6);
    scenario.press('S1');
    scenario.release('S1');
    expect(scenario.state.motors[motor.id]?.running).toBe(false);
    scenario.press('S2');
    scenario.release('S2');
    scenario.advance(6);
    scenario.trip('F');
    expect(scenario.state.motors[motor.id]?.running).toBe(false);
    expect(scenario.state.coils['-KM1']).toBe(false);
  });
});
