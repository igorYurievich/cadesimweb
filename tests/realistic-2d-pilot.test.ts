import { describe, expect, it } from 'vitest';
import { cadTypeForCommand } from '@model/cad-types';
import { exportCad } from '@model/cad-export';
import { importCad } from '@model/cad-import';
import { createEngineInput, simulate } from '@engine/index';
import { createEmptySchema } from '@model/types';
import { createPlacedElement } from '../src/ui/helpers';
import { migratePilot2dTerminals } from '@model/pilot-2d-migration';
import { el, schemaOf, seg } from './builders';

// Пилот 2D 8101 (кнопка «Piloto» 33318): лампа X1 (0, 0) сверху, X2 (0, 18) снизу, рамка 6×21.
describe('2D pilot lamp (8101)', () => {
  it('maps the palette button and reads the sample record', () => {
    expect(cadTypeForCommand(33318)?.code).toBe(8101);
    // Запись из «хвоста» 2d-simbolos.cad, вставленная в пустой файл.
    const record = '*179*8101#-H##X1#X2######*1*1*0*0*0*0*0*0*321*198*0*0*-18*-3*6*21*0*0*0*1*0*0*0#';
    const text = exportCad(createEmptySchema()).replace('CADe_SIMU', `CADe_SIMU${record}`);
    const pilot = importCad(text).schema.elements.find((e) => e.typeCode === 8101);
    expect(pilot?.terminals.map((t) => [t.label, t.offset.x, t.offset.y])).toEqual([['X1', 0, 0], ['X2', 0, 18]]);
  });

  it('lights when X1 gets a phase and X2 the neutral', () => {
    const terminals = [[0, 0, 'X1'], [0, 18, 'X2']] as const;
    const source = el(3000, 0, -12, { id: 1, terminals: [[0, 0, 'L']] });
    const neutral = el(3001, 0, 45, { id: 3, terminals: [[0, 0, 'N']] });
    const pilot = el(8101, 0, 0, { id: 2, name: '-H1', terminals });
    const live = [seg(0, -12, 0, 0)];
    const nWire = [seg(0, 18, 0, 45, { kind: 'neutral' })];
    expect(simulate(createEngineInput(schemaOf([...live, ...nWire], [source, neutral, pilot]))).lamps[2]).toBe(true);
    expect(simulate(createEngineInput(schemaOf(live, [source, neutral, pilot]))).lamps[2]).toBe(false);
  });

  it('round-trips through .cad with its size and terminals', () => {
    const schema = createEmptySchema();
    schema.elements.push(createPlacedElement(8101, { x: 60, y: 60 }, 0, schema));
    const again = importCad(exportCad(schema)).schema.elements.find((e) => e.typeCode === 8101);
    expect([again?.size.w, again?.size.h, again?.terminals.map((t) => t.label)]).toEqual([6, 21, ['X1', 'X2']]);
  });

  it('moves a pilot saved with the old terminals (3, 0) / (3, 21) and keeps its wires connected', () => {
    const schema = schemaOf(
      [seg(33, 0, 33, 30), seg(33, 51, 33, 70)],
      [el(8101, 30, 30, { id: 5, name: '-H1', terminals: [[3, 0, 'X1'], [3, 21, 'X2']] })],
    );
    migratePilot2dTerminals(schema);
    const pilot = schema.elements[0];
    expect(pilot?.position).toEqual({ x: 33, y: 30 });
    expect(pilot?.terminals.map((t) => [t.offset.x, t.offset.y])).toEqual([[0, 0], [0, 18]]);
    expect(schema.wires[1]?.from).toEqual({ x: 33, y: 48 });
    migratePilot2dTerminals(schema);
    expect(pilot?.position).toEqual({ x: 33, y: 30 });
  });
});
