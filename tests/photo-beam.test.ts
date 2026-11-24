import { describe, expect, it } from 'vitest';
import { createEmptyInputs, createEngineInput, simulate } from '@engine/index';
import { exportCad } from '@model/cad-export';
import { importCad } from '@model/cad-import';
import { EMITTER_TYPE } from '@model/detector-types';
import { createEmptySchema } from '@model/types';
import { createPlacedElement } from '../src/ui/helpers';
import { el, schemaOf, seg } from './builders';

const RECEIVER = 2;
const LAMP = 3;
const n = { kind: 'neutral' } as const;

/**
 * L/N, приёмник (1-2) → лампа H1; излучатель -B1 питается от той же фазы, нейтраль к нему —
 * только если emitterPowered.
 */
function circuit(receiverType: number, emitterName: string | undefined, emitterPowered: boolean) {
  const source = el(3003, 0, 0, { id: 1, terminals: [[0, 0, 'L'], [6, 0, 'N']] });
  const receiver = el(receiverType, 30, 10, { id: RECEIVER, name: '-B2', terminals: [[0, 0, '1'], [0, 12, '2']] });
  if (emitterName !== undefined) receiver.params = { emitter: emitterName };
  const lamp = el(9008, 30, 40, { id: LAMP, name: 'H1', terminals: [[0, 0, 'X1'], [0, 12, 'X2']] });
  const emitter = el(EMITTER_TYPE, 50, 10, { id: 4, name: '-B1', terminals: [[0, 0, '1'], [0, 12, '2']] });
  const wires = [
    seg(0, 0, 0, 10), seg(0, 10, 30, 10), seg(30, 22, 30, 40),
    seg(6, 0, 6, 60, n), seg(6, 60, 30, 60, n), seg(30, 60, 30, 52, n),
    seg(30, 10, 50, 10), seg(30, 60, 50, 60, n),
    ...(emitterPowered ? [seg(50, 60, 50, 22, n)] : []),
  ];
  return schemaOf(wires, [source, receiver, lamp, emitter]);
}

function lampOn(schema: ReturnType<typeof circuit>, pressed = false): boolean {
  const input = createEngineInput(schema);
  const inputs = createEmptyInputs();
  if (pressed) inputs.pressed[RECEIVER] = true;
  return simulate({ ...input, inputs }).lamps[LAMP] ?? false;
}

describe('photo barrier: receiver linked to an emitter', () => {
  it('without a link works only by click, as before', () => {
    expect(lampOn(circuit(7553, undefined, false))).toBe(false);
    expect(lampOn(circuit(7553, undefined, false), true)).toBe(true);
  });

  it('NA: beam received while the emitter is powered — closes only when the beam is blocked by click', () => {
    expect(lampOn(circuit(7553, '-B1', true))).toBe(false);
    expect(lampOn(circuit(7553, '-B1', true), true)).toBe(true);
  });

  it('NA: emitter without power — no beam, the contact closes by itself', () => {
    expect(lampOn(circuit(7553, '-B1', false))).toBe(true);
  });

  it('NC: closed while the beam is received, opens on click or when the emitter loses power', () => {
    expect(lampOn(circuit(7559, '-B1', true))).toBe(true);
    expect(lampOn(circuit(7559, '-B1', true), true)).toBe(false);
    expect(lampOn(circuit(7559, '-B1', false))).toBe(false);
  });

  it('link to a missing emitter counts as no beam; the name match ignores case', () => {
    expect(lampOn(circuit(7553, '-B9', true))).toBe(true);
    expect(lampOn(circuit(7553, '-b1', true))).toBe(false);
  });

  it('keeps the link in .cad', () => {
    const schema = createEmptySchema();
    const emitter = createPlacedElement(EMITTER_TYPE, { x: 30, y: 30 }, 0, schema);
    schema.elements.push(emitter);
    const receiver = createPlacedElement(7553, { x: 90, y: 30 }, 0, schema);
    receiver.params.emitter = emitter.name;
    schema.elements.push(receiver);
    const back = importCad(exportCad(schema)).schema;
    expect(back.elements.find((element) => element.typeCode === 7553)?.params.emitter).toBe(emitter.name);
    delete receiver.params.emitter;
    const unlinked = importCad(exportCad(schema)).schema;
    expect(unlinked.elements.find((element) => element.typeCode === 7553)?.params.emitter).toBeUndefined();
  });
});
