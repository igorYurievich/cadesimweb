import { describe, expect, it } from 'vitest';
import { computeSwitching, createEmptyInputs } from '@engine/index';
import { getBehavior, invalidTerminalIndexes } from '@engine/behaviors';
import { cadTypeForCommand, getCadType } from '@model/cad-types';
import { exportCad } from '@model/cad-export';
import { importCad } from '@model/cad-import';
import { TERMINAL_2D, TERMINAL_COLOR, terminalColorName } from '@model/terminal-2d';
import { createEmptySchema } from '@model/types';
import { createPlacedElement } from '../src/ui/helpers';
import { schemaOf } from './builders';
import { fixture } from './helpers';

// Клемма 2D «Borna» 4011: образец пользователя borneras.cad (CADe_SIMU 4.2) — серая, синяя и жёлто-зелёная,
// отличаются только nums[16] (2 / 3 / 4). В образце ещё рамка листа 20000 — её отбрасываем.
const terminalsOf = (name: string) =>
  importCad(fixture(name)).schema.elements.filter((e) => e.typeCode === TERMINAL_2D);

describe('2D terminal «Borna» (4011)', () => {
  const sample = terminalsOf('2d-borneras.cad');

  it('maps the palette button and has a valid behavior', () => {
    expect(cadTypeForCommand(33319)?.code).toBe(TERMINAL_2D);
    expect(getBehavior(TERMINAL_2D).warning).toBeUndefined();
    expect(invalidTerminalIndexes(TERMINAL_2D, getCadType(TERMINAL_2D).terminalCount ?? 0)).toEqual([]);
  });

  it('reads the three colors from nums[16] and puts the leads in the middle of the 6×15 frame', () => {
    expect(sample.map((e) => terminalColorName(e))).toEqual(['phase', 'neutral', 'pe']);
    for (const e of sample) {
      expect(e.name).toBe('-X');
      expect(e.size).toEqual({ w: 6, h: 15 });
      expect(e.terminals.map((t) => `${t.offset.x},${t.offset.y}`)).toEqual(['3,0', '3,12']);
    }
  });

  it('writes the sample back like CADe_SIMU', () => {
    const text = exportCad(importCad(fixture('2d-borneras.cad')).schema);
    expect(text).toContain('*4011#-X#########*0*0*0*0*0*0*0*0*18*45*0*0*-12*-3*6*15*2*0*0*1*0*0*0#');
    expect(text).toContain('*4011#-X#########*0*0*0*0*0*0*0*0*33*45*0*0*-12*-3*6*15*3*0*0*1*0*0*0#');
    expect(text).toContain('*4011#-X#########*0*0*0*0*0*0*0*0*54*45*-21*-21*-12*-3*6*15*4*0*0*1*0*0*0#');
  });

  it('places a grey terminal from the palette and keeps the chosen color in a round trip', () => {
    const schema = createEmptySchema();
    const placed = createPlacedElement(TERMINAL_2D, { x: 60, y: 60 }, 0, schema);
    schema.elements.push(placed);
    expect(placed.name).toBe('-X');
    expect(placed.size).toEqual({ w: 6, h: 15 });
    expect(exportCad(schema)).toMatch(/\*4011#-X#[^#]*#{8}\*(0\*){8}60\*60\*0\*0\*-12\*-3\*6\*15\*2\*/);
    placed.params.terminalColor = TERMINAL_COLOR.pe;
    const back = importCad(exportCad(schema)).schema.elements;
    expect(back.map((e) => terminalColorName(e))).toEqual(['pe']);
    expect(back[0]!.terminals).toHaveLength(2);
  });

  it('always connects the top and bottom lead', () => {
    for (const element of sample) {
      const { edges } = computeSwitching(schemaOf([], [{ ...element }]), createEmptyInputs());
      expect(edges).toHaveLength(1);
    }
  });
});
