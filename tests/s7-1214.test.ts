import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
// Сначала движок целиком (как в приложении), иначе цикл импортов s7-1200 ↔ behaviors.
import { CadScenario } from './scenario';
import { s7PowerKey } from '@engine/s7-1200';
import { terminalKey } from '@engine/types';
import { exportCad } from '@model/cad-export';
import { importCad } from '@model/cad-import';
import { terminalPosition } from '@model/geometry';
import { S7_1214, S7_1214_INDEX, S7_1214_LABELS } from '@model/s7-1214';
import type { SchemaElement } from '@model/types';

// ПЛК S7-1200 CPU 1214C AC/DC/RLY (10203) из настоящих файлов CADe_SIMU (курс «Desafío Ladder», tests/fixtures/s7-1214).

const DIR = 'tests/fixtures/s7-1214';
const FILES = readdirSync(DIR).filter((name) => name.endsWith('.cad'));
const read = (name: string): string => readFileSync(join(DIR, name), 'latin1');

function cpuOf(elements: readonly SchemaElement[]): SchemaElement {
  const cpu = elements.find((element) => element.typeCode === S7_1214);
  if (!cpu) throw new Error('нет ПЛК 10203');
  return cpu;
}

describe('PLC S7-1200 CPU 1214C AC/DC/RLY (10203)', () => {
  it.each(FILES)('%s: ПЛК известен, все провода у корпуса приходят на клеммы', (name) => {
    const { schema, unknownTypes } = importCad(read(name));
    expect(unknownTypes).toEqual([]);
    const cpu = cpuOf(schema.elements);
    expect(cpu.terminals.map((t) => t.label)).toEqual([...S7_1214_LABELS]);
    const points = new Set(cpu.terminals.map((_, k) => JSON.stringify(terminalPosition(cpu, k))));
    const { x, y } = cpu.position;
    const ends = schema.wires.flatMap((wire) => [wire.from, wire.to])
      .filter((p) => p.x >= x - 3 && p.x <= x + 162 && p.y >= y - 3 && p.y <= y + 138);
    expect(ends.length).toBeGreaterThan(0);
    expect(ends.filter((p) => !points.has(JSON.stringify({ x: p.x, y: p.y })))).toEqual([]);
  });

  it('keeps the IP address after the record when saving', () => {
    const again = exportCad(importCad(read('Ejercicio_4.cad')).schema);
    expect(again).toContain('*10203#PLC#');
    expect(again).toContain('#192.128.000.001*');
  });

  it('runs from L1 / N, feeds 24 V on L+ / M and switches Q0.0 through relay 1L (Ejercicio_4)', () => {
    const scenario = new CadScenario(read('Ejercicio_4.cad'));
    const cpu = cpuOf(scenario.schema.elements);
    const button = (name: string) => scenario.findElement(name, 8100).id;
    const potentials = (index: number): string[] => {
      const state = scenario.state;
      const net = state.terminalNet[terminalKey(cpu.id, index)];
      return state.nets.find((candidate) => candidate.id === net)?.potentials ?? [];
    };
    const press = (name: string, pressed: boolean) => {
      scenario.inputs.pressed[button(name)] = pressed;
      scenario.recalculate();
      return scenario.advance(0.2);
    };
    expect(scenario.recalculate().coils[s7PowerKey(cpu)]).toBe(true);
    expect([potentials(S7_1214_INDEX.SENSOR_PLUS), potentials(S7_1214_INDEX.SENSOR_MINUS)]).toEqual([['+'], ['-']]);
    // Программа: фронт спада кнопки -S2 включает Q0.0 с самоподхватом, I0.1 (кнопка -S1) отключает.
    expect(press('-S2', true).coils['I0.0']).toBe(true);
    expect(press('-S2', false).coils['Q0.0']).toBe(true);
    expect(potentials(S7_1214_INDEX.OUTPUT_COMMON_1 + 1)).toEqual(['+']);
    // Лампа -H на Q0.0 (пилот 2D 8101, клеммы X1 (0, 0) и X2 (0, 18), как в CADe_SIMU) загорается.
    expect(scenario.state.lamps[scenario.findElement('-H', 8101).id]).toBe(true);
    expect(press('-S1', true).coils['Q0.0']).toBe(false);
    expect(potentials(S7_1214_INDEX.OUTPUT_COMMON_1 + 1)).toEqual([]);
  });

  it('toggles Q0.0 on each press of -S2: rising edge and the M0.0 / M0.1 flip-flop (Ejercicio_7)', () => {
    const scenario = new CadScenario(read('Ejercicio_7.cad'));
    const button = scenario.findElement('-S2', 8100).id;
    const lamp = scenario.findElement('-H', 8101).id;
    const click = () => {
      scenario.inputs.pressed[button] = true;
      expect(scenario.advance(0.1).coils['M0.0']).toBe(true);
      expect(scenario.advance(0.1).coils['M0.0']).toBe(false);
      scenario.inputs.pressed[button] = false;
      for (let k = 0; k < 3; k += 1) scenario.advance(0.1);
      return [scenario.state.coils['Q0.0'], scenario.state.lamps[lamp]];
    };
    expect(click()).toEqual([true, true]);
    expect(click()).toEqual([false, false]);
    expect(click()).toEqual([true, true]);
  });

  it('runs the whole pick-and-place cycle of IGL21_Final without an unstable relay loop', () => {
    const scenario = new CadScenario(read('IGL21_Final.cad'));
    const coils = () => scenario.state.coils;
    const on = () => Object.keys(coils()).filter((k) => coils()[k] && /^[MQ]\d/.test(k)).sort();
    const hold = (name: string) => {
      const button = scenario.findElement(name, 8100).id;
      scenario.inputs.pressed[button] = true;
      scenario.advance(0.2);
      scenario.inputs.pressed[button] = false;
      scenario.advance(0.2);
    };
    expect(on()).toEqual(['Q0.0', 'Q0.1']);
    hold('-S1');
    hold('-S3');
    for (let k = 0; k < 50; k += 1) scenario.advance(0.1);
    hold('-S2');
    for (let k = 0; k < 40; k += 1) {
      scenario.advance(0.1);
      expect(scenario.state.faults.filter((fault) => fault.kind === 'unstable')).toEqual([]);
    }
    // M0.5 сбросил все шаги и сам себя: снова едут обе ленты, ждём следующую деталь.
    expect(on()).toEqual(['Q0.0', 'Q0.1']);
    expect(Object.keys(scenario.state.coils).some((key) => key.startsWith('@lock:'))).toBe(false);
  });
});
