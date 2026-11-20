import { describe, expect, it } from 'vitest';
import { cadTypeForCommand } from '@model/cad-types';
import { exportCad } from '@model/cad-export';
import { importCad } from '@model/cad-import';
import { createEmptySchema } from '@model/types';
import { createPlacedElement } from '../src/ui/helpers';
import { fixture } from './helpers';

describe('2D three-phase motors (1000 / 1001 with nums[16] = 1)', () => {
  it('reads both 2D motors of the sample as ordinary motors with the 2D drawing', () => {
    const motors = importCad(fixture('2d-motores.cad')).schema.elements.filter((e) => e.typeCode < 2000);
    expect(motors.map((e) => [e.typeCode, e.params.motor2d, e.terminals.length]))
      .toEqual([[1000, true, 4], [1001, true, 7]]);
  });

  it('keeps classic motors classic (nums[16] = 0 or another value)', () => {
    for (const name of ['motores-elementos.cad', 'actividad_1_7_2d.cad']) {
      const motors = importCad(fixture(name)).schema.elements.filter((e) => e.typeCode === 1000 || e.typeCode === 1001);
      expect(motors.every((e) => e.params.motor2d === undefined)).toBe(true);
    }
  });

  it('places the 2D palette buttons as 1000 / 1001 and writes nums[16] = 1 like the sample', () => {
    expect(cadTypeForCommand(33311)?.code).toBe(10000);
    expect(cadTypeForCommand(33393)?.code).toBe(10010);
    const schema = createEmptySchema();
    const motor = createPlacedElement(10000, { x: 30, y: 60 }, 0, schema);
    schema.elements.push(motor);
    schema.elements.push(createPlacedElement(10010, { x: 90, y: 60 }, 0, schema));
    expect([motor.typeCode, motor.size.w, motor.size.h, motor.params.motor2d]).toEqual([1000, 24, 24, true]);
    const text = exportCad(schema);
    expect(text).toMatch(/\*1000#-M1#[^#]*#U1#V1#W1#PE####(\*1){4}(\*0){4}\*30\*\d+\*0\*0\*-12\*-6\*24\*24\*1\*/);
    expect(text).toMatch(/\*1001#-M2#[^#]*#U1#V1#W1#PE#W2#U2#V2#(\*1){7}\*0\*90\*\d+\*0\*0\*-12\*-6\*24\*27\*1\*/);
    expect(importCad(text).schema.elements.map((e) => e.params.motor2d)).toEqual([true, true]);
  });
});
