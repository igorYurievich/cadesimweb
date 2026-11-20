import { describe, expect, it } from 'vitest';
import { createEmptyInputs, createEngineInput, simulate, terminalKey } from '@engine/index';
import type { EngineState, UserInputs } from '@engine/index';
import { getBehavior, invalidTerminalIndexes, missingBehaviors } from '@engine/behaviors';
import { cadTypeForCommand, getCadType, isKnownCadType } from '@model/cad-types';
import { PHOTO_BARRIER_TYPE } from '@model/cad-types-sensors';
import { catalog } from '@model/catalog';
import { exportCad } from '@model/cad-export';
import { importCad } from '@model/cad-import';
import { createEmptySchema } from '@model/types';
import { createPlacedElement } from '../src/ui/helpers';
import { PLACE_DEFAULTS } from '../src/ui/constants';
import { el, schemaOf, seg } from './builders';

const GRID = 3;
const BARRIER = 7;

/** Колодка L/N, барьер (выводы 1..5 в (30, 30)), общий 3 на фазе; nWire = false — питание без нейтрали. */
function barrierCircuit(nWire = true, extra: ReturnType<typeof el>[] = []) {
  const source = el(3003, 0, 0, { id: 1, name: '-X', terminals: [[0, 0, 'L'], [6, 0, 'N']] });
  const barrier = el(PHOTO_BARRIER_TYPE, 30, 30, {
    id: BARRIER,
    name: '-B',
    terminals: [[0, 0, '1'], [12, 0, '2'], [0, 24, '3'], [6, 24, '4'], [12, 24, '5']],
  });
  const phase = [seg(0, 0, 0, 54), seg(0, 10, 30, 10), seg(30, 10, 30, 30), seg(0, 54, 30, 54)];
  const n = { kind: 'neutral' } as const;
  const neutral = nWire ? [seg(6, 0, 6, 5, n), seg(6, 5, 42, 5, n), seg(42, 5, 42, 30, n)] : [];
  return schemaOf([...phase, ...neutral], [source, barrier, ...extra]);
}

function run(nWire: boolean, blocked: boolean, extra: ReturnType<typeof el>[] = []): EngineState {
  const input = createEngineInput(barrierCircuit(nWire, extra));
  const inputs: UserInputs = createEmptyInputs();
  if (blocked) inputs.pressed[BARRIER] = true;
  return simulate({ ...input, inputs });
}

function live(state: EngineState, element: number, index: number): boolean {
  const net = state.nets.find((candidate) => candidate.id === state.terminalNet[terminalKey(element, index)]);
  return (net?.potentials ?? []).includes('L1');
}

describe('photoelectric barrier: catalog and .cad type', () => {
  it('is placed from the «Detectores» panel under its new name', () => {
    const def = catalog.getById(33025);
    expect(def?.groups[0]).toBe('sensors');
    expect(def?.names.es).toBe('Detector de barrera fotoeléctrico');
    expect(catalog.label(def!, 'ru')).toBe('Фотоэлектрический датчик-барьер');
    expect(catalog.label(def!, 'fr')).toBe('Détecteur à barrière photoélectrique');
    expect(cadTypeForCommand(33025)?.code).toBe(PHOTO_BARRIER_TYPE);
    expect(isKnownCadType(PHOTO_BARRIER_TYPE)).toBe(true);
    expect(getCadType(PHOTO_BARRIER_TYPE).family).toBe('sensor');
  });

  it('has a behaviour row with valid terminal indexes', () => {
    expect(missingBehaviors()).toEqual([8]);
    expect(getBehavior(PHOTO_BARRIER_TYPE).warning).toBeUndefined();
    expect(invalidTerminalIndexes(PHOTO_BARRIER_TYPE, 5)).toEqual([]);
  });
});

describe('photoelectric barrier: geometry on the sheet grid', () => {
  const placed = createPlacedElement(PHOTO_BARRIER_TYPE, { x: 31, y: 44 }, 0, createEmptySchema());
  const at = (label: string) => placed.terminals.find((terminal) => terminal.label === label)!.offset;

  it('snaps every terminal to grid nodes', () => {
    expect(placed.terminals.map((terminal) => terminal.label)).toEqual(['1', '2', '3', '4', '5']);
    for (const { offset } of placed.terminals) {
      expect(offset.x % GRID).toBe(0);
      expect(offset.y % GRID).toBe(0);
    }
    expect(placed.position.x % GRID).toBe(0);
    expect(placed.position.y % GRID).toBe(0);
  });

  it('aligns 1 with 3, 2 with 5 and puts 4 exactly between 3 and 5', () => {
    expect(at('1').x).toBe(at('3').x);
    expect(at('2').x).toBe(at('5').x);
    expect(at('4').x - at('3').x).toBe(at('5').x - at('4').x);
    expect(at('1').y).toBe(at('2').y);
    expect(new Set([at('3').y, at('4').y, at('5').y]).size).toBe(1);
  });

  it('uses a whole-cell frame: a 6×6 body plus one cell of terminal above and below', () => {
    const size = PLACE_DEFAULTS[PHOTO_BARRIER_TYPE]!.size;
    expect(size.w % GRID).toBe(0);
    expect(size.h % GRID).toBe(0);
    expect(at('3').y - at('1').y).toBe(6 * GRID + 2 * GRID);
  });

  it('names the first barrier -B and the next ones -B1, -B2', () => {
    const schema = createEmptySchema();
    for (let i = 0; i < 3; i += 1) {
      schema.elements.push(createPlacedElement(PHOTO_BARRIER_TYPE, { x: i * 30, y: 30 }, 0, schema));
    }
    expect(schema.elements.map((element) => element.name)).toEqual(['-B', '-B1', '-B2']);
  });
});

describe('photoelectric barrier: simulation', () => {
  it('rests on 3-4 while powered and the beam is free', () => {
    const state = run(true, false);
    expect(state.coils['-B']).toBe(false);
    expect(live(state, BARRIER, 3)).toBe(true);
    expect(live(state, BARRIER, 4)).toBe(false);
  });

  it('switches 3 from 4 to 5 when the beam is blocked and back when it is free again', () => {
    const blocked = run(true, true);
    expect(blocked.coils['-B']).toBe(true);
    expect(live(blocked, BARRIER, 3)).toBe(false);
    expect(live(blocked, BARRIER, 4)).toBe(true);
    const freed = run(true, false);
    expect(live(freed, BARRIER, 4)).toBe(false);
  });

  it('does not switch without supply on 1-2', () => {
    const state = run(false, true);
    expect(state.coils['-B']).toBe(false);
    expect(live(state, BARRIER, 3)).toBe(true);
    expect(live(state, BARRIER, 4)).toBe(false);
  });

  it('drives auxiliary contacts with the same name', () => {
    const aux = el(7000, 60, 54, { id: 20, name: '-B', terminals: [[0, 0, '13'], [0, 12, '14']] });
    expect(run(true, false, [aux]).contacts[20]).toBe(false);
    expect(run(true, true, [aux]).contacts[20]).toBe(true);
  });
});

describe('photoelectric barrier: .cad round trip', () => {
  it('keeps type, name and five terminals after export and import', () => {
    const schema = createEmptySchema();
    schema.elements.push(createPlacedElement(PHOTO_BARRIER_TYPE, { x: 60, y: 60 }, 0, schema));
    const back = importCad(exportCad(schema)).schema.elements[0]!;
    expect(back.typeCode).toBe(PHOTO_BARRIER_TYPE);
    expect(back.name).toBe('-B');
    expect(back.terminals.map((terminal) => terminal.label)).toEqual(['1', '2', '3', '4', '5']);
    const placedOffsets = schema.elements[0]!.terminals.map((terminal) => terminal.offset);
    expect(back.terminals.map((terminal) => terminal.offset)).toEqual(placedOffsets);
  });
});
