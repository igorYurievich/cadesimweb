import { describe, expect, it } from 'vitest';
import { computeSwitching, createEmptyInputs, createEngineInput, simulate } from '@engine/index';
import { getBehavior, invalidTerminalIndexes } from '@engine/behaviors';
import { cadTypeForCommand, getCadType, isKnownCadType } from '@model/cad-types';
import { catalog } from '@model/catalog';
import { hasVerifiedBadge } from '@model/catalog-verification';
import { importCad } from '@model/cad-import';
import { DETECTOR_CODES, EMITTER_TYPE, detectorSpec, detectorVariant } from '@model/detector-types';
import { createEmptySchema } from '@model/types';
import { changeDetectorWiring } from '../src/ui/detector-properties';
import { createPlacedElement } from '../src/ui/helpers';
import { el, schemaOf, seg } from './builders';
import { fixture } from './helpers';

/** Кнопки панели «Detectores»: команда, код варианта «2 провода» (по палитре), имя без «2 hilos». */
const PANEL: ReadonlyArray<readonly [number, number, string]> = [
  [33032, 7500, 'Det. inductivo NA'],
  [33020, 7520, 'Det. inductivo NC'],
  [33021, 7506, 'Det. capacitivo NA'],
  [33022, 7526, 'Det. capacitivo NC'],
  [33023, 7512, 'Det. magnético NA'],
  [33024, 7532, 'Det. magnético NC'],
  [33027, EMITTER_TYPE, 'Barrera foto. emisor'],
  [33034, 7553, 'Barrera foto. receptor NA'],
  [33033, 7559, 'Barrera foto. receptor NC'],
];

describe('detectors: catalog and .cad types', () => {
  it('maps every «Detectores» button to its 2-wire type and a plain name', () => {
    for (const [commandId, code, name] of PANEL) {
      const def = catalog.getById(commandId);
      expect(def?.groups[0]).toBe('sensors');
      expect(def?.names.es).toBe(name);
      expect(cadTypeForCommand(commandId)?.code).toBe(code);
      expect(getCadType(code).family).toBe('detector');
    }
  });

  it('has a behaviour row for every wiring variant', () => {
    expect(DETECTOR_CODES).toHaveLength(32);
    for (const code of [...DETECTOR_CODES, EMITTER_TYPE]) {
      expect(isKnownCadType(code)).toBe(true);
      expect(getBehavior(code).warning).toBeUndefined();
      expect(invalidTerminalIndexes(code, getCadType(code).terminalCount ?? 0)).toEqual([]);
    }
  });

  it('shows the green badge on every detector except the barrier emitter', () => {
    for (const [commandId] of PANEL) expect(hasVerifiedBadge('sensors', commandId)).toBe(commandId !== 33027);
    expect(hasVerifiedBadge('sensors', 33025)).toBe(true);
  });
});

describe('detectors: sample detectores.cad from CADe_SIMU', () => {
  const imported = importCad(fixture('detectores.cad'));
  const detectors = imported.schema.elements.filter((element) => detectorSpec(element.typeCode));

  it('reads all 24 detectors as known types', () => {
    expect(imported.unknownTypes).toEqual([]);
    expect(detectors).toHaveLength(24);
  });

  it('places 3-wire, 3-wire side and 2-wire side terminals as in the sample', () => {
    const offsets = (code: number) => detectors.find((element) => element.typeCode === code)!
      .terminals.map((terminal) => `${terminal.label}@${terminal.offset.x},${terminal.offset.y}`);
    expect(offsets(7501)).toEqual(['+@0,0', '-@0,12', 'S@9,6']);
    expect(offsets(7504)).toEqual(['+@3,0', '-@3,6', 'S@3,3']);
    expect(offsets(7503)).toEqual(['1@3,0', '2@3,6']);
    expect(detectorSpec(7563)).toMatchObject({ kind: 'receiver', nc: true, wiring: '3-side' });
  });
});

describe('detectors: wiring variant in properties', () => {
  it('switches the type, frame and terminals but keeps the name', () => {
    const schema = createEmptySchema();
    const element = createPlacedElement(7500, { x: 30, y: 30 }, 0, schema);
    expect(element.terminals.map((terminal) => terminal.label)).toEqual(['1', '2']);
    expect(changeDetectorWiring(element, '3-side')).toBe(true);
    expect(element.typeCode).toBe(7504);
    expect(element.name).toBe('-B1');
    expect(element.size).toEqual({ w: 9, h: 9 });
    expect(element.terminals.map((terminal) => terminal.label)).toEqual(['+', '-', 'S']);
    expect(changeDetectorWiring(element, '3-side')).toBe(false);
    expect(detectorVariant(7563, '2')).toBe(7559);
  });
});

describe('detectors: simulation', () => {
  it('NA closes and NC opens only while the detector is held, in every wiring', () => {
    for (const code of DETECTOR_CODES) {
      const terminals = getCadType(code).terminalCount === 3
        ? [[0, 0, '+'], [0, 12, '-'], [9, 6, 'S']] as const
        : [[0, 0, '1'], [0, 12, '2']] as const;
      const schema = schemaOf([], [el(code, 0, 0, { id: 1, terminals })]);
      const nc = detectorSpec(code)!.nc;
      expect(computeSwitching(schema, createEmptyInputs()).contacts[1]).toBe(nc);
      const held = createEmptyInputs();
      held.pressed[1] = true;
      expect(computeSwitching(schema, held).contacts[1]).toBe(!nc);
    }
  });

  it('a 3-wire detector passes + to S only while held', () => {
    const behavior = getBehavior(7501);
    expect(behavior.links.find((link) => link.kind === 'switch')?.terminals).toEqual([0, 2]);
  });

  it('passes the signal to a lamp only while a 2-wire NA detector is held', () => {
    const source = el(3003, 0, 0, { id: 1, terminals: [[0, 0, 'L'], [6, 0, 'N']] });
    const detector = el(7500, 30, 10, { id: 2, name: '-B1', terminals: [[0, 0, '1'], [0, 12, '2']] });
    const lamp = el(9008, 30, 40, { id: 3, name: 'H1', terminals: [[0, 0, 'X1'], [0, 12, 'X2']] });
    const n = { kind: 'neutral' } as const;
    const wires = [seg(0, 0, 0, 10), seg(0, 10, 30, 10), seg(30, 22, 30, 40),
      seg(6, 0, 6, 60, n), seg(6, 60, 30, 60, n), seg(30, 60, 30, 52, n)];
    const input = createEngineInput(schemaOf(wires, [source, detector, lamp]));
    expect(simulate(input).lamps[3]).toBe(false);
    const inputs = createEmptyInputs();
    inputs.pressed[2] = true;
    expect(simulate({ ...input, inputs }).lamps[3]).toBe(true);
  });

  it('treats the emitter as a load between 1 and 2 without a contact', () => {
    expect(getBehavior(EMITTER_TYPE).links).toEqual([{ terminals: [0, 1], kind: 'load', control: 'always' }]);
  });
});
