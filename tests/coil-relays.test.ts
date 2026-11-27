import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { importCad } from '@model/cad-import';
import { exportCad } from '@model/cad-export';
import { createEngineInput, simulate } from '@engine/index';
import type { EngineMemory, EngineState } from '@engine/types';
import { timeSwitchOn } from '@engine/coil-relays';
import { coilRelayPlacedParams } from '@model/coil-relays';
import type { SchemaElement } from '@model/types';
import { el, schemaOf, seg } from './builders';
import type { ElementDraft, WireDraft } from './builders';

const SOURCE = el(3007, 0, 0, {
  id: 1, name: '-X', terminals: [[0, 0, 'L1'], [6, 0, 'L2'], [12, 0, 'L3'], [18, 0, 'N'], [24, 0, 'PE']],
});

/** Фаза L1 на клемму (x, y) своим проводом: k — номер «рельса», чтобы провода разных входов не сходились. */
const phaseTo = (x: number, y: number, k: number): WireDraft[] =>
  [seg(0, 0, 0, -6 * k), seg(0, -6 * k, x, -6 * k), seg(x, -6 * k, x, y)];
const neutralTo = (x: number, y: number): WireDraft[] => [
  seg(18, 0, 18, 40, { kind: 'neutral' }), seg(18, 40, x, 40, { kind: 'neutral' }), seg(x, 40, x, y, { kind: 'neutral' }),
];

/** Катушка A1 (30,12) — A2 (30,24) с именем -K1. */
function coil(typeCode: number, params: SchemaElement['params'] = {}): ElementDraft {
  const element = el(typeCode, 30, 12, { id: 2, name: '-K1', terminals: [[0, 0, 'A1'], [0, 12, 'A2']] });
  element.params = { ...coilRelayPlacedParams(typeCode), ...params };
  return element;
}

const circuit = (element: ElementDraft, powered: boolean) =>
  schemaOf(powered ? [...phaseTo(30, 12, 1), ...neutralTo(30, 24)] : neutralTo(30, 24), [SOURCE, element]);

/** Прогон кадров: [запитан?, время]; возвращает выход -K1 по кадрам. */
function outputs(element: ElementDraft, frames: ReadonlyArray<readonly [boolean, number]>): boolean[] {
  let memory: EngineMemory | undefined;
  return frames.map(([powered, time]) => {
    const input = createEngineInput(circuit(element, powered), time);
    const state: EngineState = simulate(memory ? { ...input, memory } : input);
    memory = state.memory;
    return state.coils['-K1'] ?? false;
  });
}

describe('катушки панели «Bobinas…» (coil-relays.ts)', () => {
  it('импульсное реле 9002 переключается каждым новым импульсом', () => {
    const frames = [[true, 0], [false, 1], [true, 2], [false, 3], [true, 4]] as const;
    expect(outputs(coil(9002), frames)).toEqual([true, true, false, false, true]);
  });

  it('катушка электроклапана 9003 работает как обычная катушка', () => {
    expect(outputs(coil(9003), [[true, 0], [false, 1]])).toEqual([true, false]);
  });

  it('реле-прерыватель 9007 включено полупериод и выключено полупериод, пока есть питание', () => {
    const frames = [[true, 0], [true, 0.5], [true, 1.2], [true, 2.1], [false, 2.5]] as const;
    expect(outputs(coil(9007, { time: 1 }), frames)).toEqual([true, true, false, true, false]);
  });

  it('генератор импульсов 9015: отдельные время включения и паузы', () => {
    const frames = [[true, 0], [true, 0.5], [true, 1.5], [true, 3.2]] as const;
    expect(outputs(coil(9015, { time: 1, timeOff: 2 }), frames)).toEqual([true, true, false, true]);
  });

  it('бистабильная 9001: A1–A2 включает, B1–A2 выключает, без питания состояние держится', () => {
    const bistable = el(9001, 30, 12, { id: 2, name: '-K1', terminals: [[0, 0, 'A1'], [6, 0, 'B1'], [3, 12, 'A2']] });
    const at = (input: 'A' | 'B' | 'none') => schemaOf([
      ...(input === 'A' ? phaseTo(30, 12, 1) : input === 'B' ? phaseTo(36, 12, 2) : []), ...neutralTo(33, 24),
    ], [SOURCE, bistable]);
    let memory: EngineMemory | undefined;
    const seen = (['A', 'none', 'B', 'none'] as const).map((input, time) => {
      const base = createEngineInput(at(input), time);
      const state = simulate(memory ? { ...base, memory } : base);
      memory = state.memory;
      return state.coils['-K1'];
    });
    expect(seen).toEqual([true, true, false, false]);
  });

  it('счётчик 9016: на пределе включения срабатывает, на пределе отключения отпускает, R сбрасывает', () => {
    const counter = el(9016, 30, 12, {
      id: 2, name: '-C1', terminals: [[0, 0, 'A1'], [6, 0, 'C'], [9, 0, 'D'], [12, 0, 'R'], [6, 12, 'A2']],
    });
    counter.params = { onLimit: 2, offLimit: 3 };
    const at = (input: 'C' | 'R' | 'none') => schemaOf([
      ...phaseTo(30, 12, 1), ...neutralTo(36, 24),
      ...(input === 'C' ? phaseTo(36, 12, 2) : input === 'R' ? phaseTo(42, 12, 3) : []),
    ], [SOURCE, counter]);
    let memory: EngineMemory | undefined;
    const seen = (['C', 'none', 'C', 'none', 'C', 'none', 'C', 'R'] as const).map((input, time) => {
      const base = createEngineInput(at(input), time);
      const state = simulate(memory ? { ...base, memory } : base);
      memory = state.memory;
      return [state.memory.timers[2]?.count, state.coils['-C1']];
    });
    expect(seen).toEqual([
      [1, false], [1, false], [2, true], [2, true], [3, false], [3, false], [4, false], [0, false],
    ]);
  });

  it('реле времени 9014: последнее событие программы по часам недели, «Inactivo» отменяет событие', () => {
    const element = coil(9014, { days: '101000', onH: 8, onM: 15, offH: 17, offM: 45 }) as SchemaElement;
    const at = (day: number, h: number, m: number) => day * 86400 + h * 3600 + m * 60;
    expect(timeSwitchOn(element, at(0, 8, 0))).toBe(false);
    expect(timeSwitchOn(element, at(0, 8, 15))).toBe(true);
    expect(timeSwitchOn(element, at(0, 17, 45))).toBe(false);
    // Вторник не отмечен: держится состояние после понедельника (отключено).
    expect(timeSwitchOn(element, at(1, 12, 0))).toBe(false);
    expect(timeSwitchOn(element, at(2, 9, 0))).toBe(true);
    const noOff = { ...element, params: { ...element.params, offInactive: 1 } };
    expect(timeSwitchOn(noOff, at(1, 12, 0))).toBe(true);
  });

  it('реле времени 9014 включает выход только при питании A1–A2', () => {
    let memory: EngineMemory | undefined;
    const element = coil(9014, { days: '111111', onH: 0, onM: 0, offInactive: 1 });
    const seen = [true, false].map((powered) => {
      const base = { ...createEngineInput(circuit(element, powered), 0) };
      base.inputs.clock = 3600;
      const state = simulate(memory ? { ...base, memory } : base);
      memory = state.memory;
      return state.coils['-K1'];
    });
    expect(seen).toEqual([true, false]);
  });
});

describe('.cad катушек панели «Bobinas…»', () => {
  const read = (file: string) => importCad(readFileSync(file, 'latin1')).schema;
  const recordOf = (text: string, type: number): string => text.split('*').find((part) => part.startsWith(`${type}#`))!;

  it('реле времени 9014: дни из nums, время и «Inactivo» из текстов (interruptor_horario.cad)', () => {
    const schema = read('tests/fixtures/interruptor_horario.cad');
    const element = schema.elements.find((candidate) => candidate.typeCode === 9014)!;
    expect(element.terminals.map((terminal) => terminal.label)).toEqual(['A1', 'A2']);
    expect(element.params).toMatchObject({
      days: '101000', onH: 8, onM: 15, onInactive: 0, offH: 17, offM: 45, offInactive: 1,
    });
    const text = exportCad(schema);
    expect(recordOf(text, 9014)).toBe('9014#-KM5##A1#A2#08#15#0#17#45#1');
    expect(text.split('9014#')[1]!.split('*').slice(1, 9)).toEqual(['1', '1', '49', '48', '49', '48', '48', '48']);
  });

  it('параметры прерывателя, генератора и счётчика читаются из образца и пишутся обратно', () => {
    const schema = read('tests/fixtures/elementos_bobinas.cad');
    const byType = (type: number) => schema.elements.find((element) => element.typeCode === type)!;
    expect(byType(9007).params).toMatchObject({ scale: 0, time: 1 });
    expect(byType(9015).params).toMatchObject({ scale: 0, time: 1, scaleOff: 0, timeOff: 1 });
    expect(byType(9016).params).toMatchObject({ onLimit: 0, offLimit: 0 });
    byType(9016).params.onLimit = 5;
    byType(9015).params.timeOff = 3;
    const text = exportCad(schema);
    expect(recordOf(text, 9016)).toBe('9016#-C##A1#C#D#R#5#0#A2#');
    expect(recordOf(text, 9015)).toBe('9015#-K##A1#A2#0#1#0#3##');
  });

  it('новый счётчик пишет метки в слоты 0..3 и 6, как CADe_SIMU', () => {
    const schema = read('tests/fixtures/elementos_bobinas.cad');
    const counter = schema.elements.find((element) => element.typeCode === 9016)!;
    delete counter.raw;
    counter.params = { onLimit: 4, offLimit: 0 };
    const text = exportCad(schema);
    expect(recordOf(text, 9016)).toBe('9016#-C##A1#C#D#R#4#0#A2#');
    const reopened = importCad(text).schema.elements.find((element) => element.typeCode === 9016)!;
    expect(reopened.terminals.map((terminal) => terminal.label)).toEqual(['A1', 'C', 'D', 'R', 'A2']);
  });
});
