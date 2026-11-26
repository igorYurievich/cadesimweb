import { describe, expect, it } from 'vitest';
import { createEmptyInputs, createEngineInput, simulate } from '@engine/index';
import { getBehavior, invalidTerminalIndexes } from '@engine/behaviors';
import { exportCad } from '@model/cad-export';
import { importCad } from '@model/cad-import';
import { cadTypeForCommand, getCadType, isKnownCadType } from '@model/cad-types';
import { catalog } from '@model/catalog';
import { hasVerifiedBadge } from '@model/catalog-verification';
import { translateCatalogName } from '@model/catalog-localization';
import { REFLEX_COMMAND, REFLEX_TYPE } from '@model/reflex-sensor';
import { createEmptySchema } from '@model/types';
import { createPlacedElement } from '../src/ui/helpers';
import { el, schemaOf, seg } from './builders';

describe('reflex photoelectric sensor: catalog', () => {
  it('sits in «Detectores» with names in every language and a green badge', () => {
    const def = catalog.getById(REFLEX_COMMAND);
    expect(def?.groups[0]).toBe('sensors');
    expect(def?.names.es).toBe('Sensor fotoeléctrico réflex (24 V)');
    expect(def?.names.en).toBe('Reflex photoelectric sensor (24 V)');
    expect(def?.names.it).toBeTruthy();
    expect(def?.names.ru).toBeTruthy();
    expect(translateCatalogName(def!.names.es!, 'fr')).toBe('Capteur photoélectrique reflex (24 V)');
    expect(hasVerifiedBadge('sensors', REFLEX_COMMAND)).toBe(true);
  });

  it('places a 3-wire detector: + on top, − below, S on the right', () => {
    expect(cadTypeForCommand(REFLEX_COMMAND)?.code).toBe(REFLEX_TYPE);
    expect(isKnownCadType(REFLEX_TYPE)).toBe(true);
    expect(getCadType(REFLEX_TYPE).family).toBe('detector');
    const element = createPlacedElement(REFLEX_TYPE, { x: 30, y: 30 }, 0, createEmptySchema());
    expect(element.name).toBe('-B1');
    expect(element.terminals.map((terminal) => `${terminal.label}@${terminal.offset.x},${terminal.offset.y}`))
      .toEqual(['+@0,0', '-@0,18', 'S@9,6']);
  });
});

describe('reflex photoelectric sensor: engine', () => {
  it('behaves like a 3-wire NO inductive detector', () => {
    expect(getBehavior(REFLEX_TYPE).warning).toBeUndefined();
    expect(invalidTerminalIndexes(REFLEX_TYPE, 3)).toEqual([]);
    expect(getBehavior(REFLEX_TYPE).links).toEqual(getBehavior(7501).links);
  });

  it('lights a lamp from S only while the beam is interrupted (sensor held)', () => {
    const source = el(3003, 0, 0, { id: 1, terminals: [[0, 0, 'L'], [6, 0, 'N']] });
    const sensor = el(REFLEX_TYPE, 30, 10, { id: 2, name: '-B1', terminals: [[0, 0, '+'], [0, 18, '-'], [9, 6, 'S']] });
    const lamp = el(9008, 60, 30, { id: 3, name: 'H1', terminals: [[0, 0, 'X1'], [0, 12, 'X2']] });
    const n = { kind: 'neutral' } as const;
    const wires = [
      seg(0, 0, 0, 10), seg(0, 10, 30, 10), seg(39, 16, 60, 16), seg(60, 16, 60, 30),
      seg(6, 0, 6, 70, n), seg(6, 70, 30, 70, n), seg(30, 28, 30, 70, n), seg(30, 70, 60, 70, n), seg(60, 42, 60, 70, n),
    ];
    const input = createEngineInput(schemaOf(wires, [source, sensor, lamp]));
    expect(simulate(input).lamps[3]).toBe(false);
    const inputs = createEmptyInputs();
    inputs.pressed[2] = true;
    expect(simulate({ ...input, inputs }).lamps[3]).toBe(true);
  });
});

describe('reflex photoelectric sensor: .cad', () => {
  it('survives save and reopen with its type and terminals', () => {
    const schema = createEmptySchema();
    schema.elements.push(createPlacedElement(REFLEX_TYPE, { x: 30, y: 30 }, 0, schema));
    const reopened = importCad(exportCad(schema));
    expect(reopened.unknownTypes).toEqual([]);
    const element = reopened.schema.elements.find((candidate) => candidate.typeCode === REFLEX_TYPE);
    expect(element?.name).toBe('-B1');
    expect(element?.terminals.map((terminal) => terminal.label)).toEqual(['+', '-', 'S']);
  });
});
