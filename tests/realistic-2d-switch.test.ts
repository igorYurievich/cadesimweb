import { describe, expect, it } from 'vitest';
import { computeSwitching, createEmptyInputs } from '@engine/index';
import { getBehavior, invalidTerminalIndexes } from '@engine/behaviors';
import { cadTypeForCommand, getCadType } from '@model/cad-types';
import { exportCad } from '@model/cad-export';
import { importCad } from '@model/cad-import';
import { SWITCH_2D, SWITCH_2D_CODES, SWITCH_2D_LARGE } from '@model/switch-2d';
import { createEmptySchema } from '@model/types';
import { createPlacedElement } from '../src/ui/helpers';
import { latchedTypes, startsOpen } from '../src/ui/constants';
import { schemaOf } from './builders';
import { fixture } from './helpers';

// Interruptor 6019 и Seccionador 6020 2D: образцы пользователя 2d-interruptor-27.cad (inystec2.cad, 27×27)
// и 2d-interruptor.cad (inystec.cad, 51×51). В образцах ещё рамка листа 20000 — её отбрасываем.
const switchesOf = (name: string) =>
  importCad(fixture(name)).schema.elements.filter((e) => SWITCH_2D_CODES.includes(e.typeCode));
const terminalsOf = (element: ReturnType<typeof switchesOf>[number]) =>
  element.terminals.map((t) => `${t.label}@${t.offset.x},${t.offset.y}`);

describe('2D interruptor and seccionador (6019 / 6020)', () => {
  const small = switchesOf('2d-interruptor-27.cad');
  const large = switchesOf('2d-interruptor.cad');

  it('maps the palette buttons to the 27×27 variant', () => {
    expect(cadTypeForCommand(33386)?.code).toBe(SWITCH_2D.INTERRUPTOR);
    expect(cadTypeForCommand(33390)?.code).toBe(SWITCH_2D.SECCIONADOR);
    for (const code of SWITCH_2D_CODES) {
      expect(getBehavior(code).warning).toBeUndefined();
      expect(invalidTerminalIndexes(code, getCadType(code).terminalCount ?? 0)).toEqual([]);
    }
  });

  it('reads the variant from nums[16]: 10 → 27×27, 4 → 51×51', () => {
    expect(small.map((e) => e.typeCode)).toEqual([SWITCH_2D.SECCIONADOR, SWITCH_2D.INTERRUPTOR]);
    expect(large.map((e) => e.typeCode)).toEqual([SWITCH_2D_LARGE.INTERRUPTOR, SWITCH_2D_LARGE.SECCIONADOR]);
    for (const e of small) {
      expect(e.size).toEqual({ w: 27, h: 27 });
      expect(terminalsOf(e)).toEqual(['N@3,0', '1@9,0', '3@15,0', '5@21,0', 'N@3,24', '2@9,24', '4@15,24', '6@21,24']);
    }
    for (const e of large) {
      expect(e.size).toEqual({ w: 51, h: 51 });
      expect(terminalsOf(e)).toEqual(['N@18,0', '1@30,0', 'N@18,48', '2@30,48']);
    }
  });

  it('writes both samples back like CADe_SIMU', () => {
    const smallText = exportCad(importCad(fixture('2d-interruptor-27.cad')).schema);
    expect(smallText).toContain('*6020#-S##N#1#3#5#2#4#6#*1*1*1*1*1*1*1*0*54*69*0*0*-12*-3*27*27*10*');
    expect(smallText).toContain('*6019#-S##N#1#3#5#2#4#6#*1*1*1*1*1*1*1*0*102*69*0*0*-12*-3*27*27*10*');
    const largeText = exportCad(importCad(fixture('2d-interruptor.cad')).schema);
    expect(largeText).toContain('*6019#-S##N#1#3#5#2#4#6#*1*1*1*1*1*1*1*0*51*69*0*0*-12*-3*51*51*4*');
  });

  it('places the 27×27 variant from the palette and survives a round trip', () => {
    const schema = createEmptySchema();
    for (const code of Object.values(SWITCH_2D)) {
      schema.elements.push(createPlacedElement(code, { x: 60, y: 60 }, 0, schema));
    }
    expect(schema.elements.map((e) => e.size)).toEqual([{ w: 27, h: 27 }, { w: 27, h: 27 }]);
    const text = exportCad(schema);
    expect(text).toMatch(/\*6019#-S1?#[^#]*#N#1#3#5#2#4#6#\*(1\*){7}0\*60\*60\*0\*0\*-12\*-3\*27\*27\*9\*/);
    const back = importCad(text).schema.elements;
    expect(back.map((e) => e.typeCode)).toEqual(Object.values(SWITCH_2D));
    expect(back.map((e) => e.terminals.length)).toEqual([8, 8]);
  });

  it('closes every pole only while switched on, starts open', () => {
    for (const element of [...small, ...large]) {
      expect(latchedTypes.has(element.typeCode)).toBe(true);
      expect(startsOpen(element.typeCode)).toBe(true);
      const edges = (on: boolean) => {
        const inputs = createEmptyInputs();
        inputs.toggled[element.id] = on;
        return computeSwitching(schemaOf([], [{ ...element }]), inputs).edges.length;
      };
      expect(edges(false)).toBe(0);
      expect(edges(true)).toBe(element.terminals.length / 2);
    }
  });
});
