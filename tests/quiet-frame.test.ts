import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createEmptyInputs, createEmptyMemory, simulate } from '@engine/index';
import { advanceQuietMemory, isQuietFrame } from '@engine/quiet-frame';
import { jsonEqual } from '@engine/json-equal';
import { getBehavior } from '@engine/behaviors';
import type { EngineMemory, EngineState, TimerState, UserInputs } from '@engine/types';
import { importCad } from '@model/cad-import';
import type { Schema } from '@model/types';

const EXAMPLES = [
  'Ejemplos/Ejemplo 10.cad',
  'Ejemplos/Ejemplo 9.cad',
  'Ejemplos 2/Ejemplo 2.7.cad',
  'Ejemplos 2/Ejemplo 2.9.cad',
  'Ejemplos 2/Ejemplo 2.10.cad',
  'Ejemplos del autor/Ascensor_5_plantas_con_variador.cad',
  'Ejemplos del autor/GRAFCET_secuencia_de_pilotos.cad',
  'Ejemplos del autor/Dos_modos_de_giro_programados_mediante_PLC.cad',
  'Ejemplos del autor/Iluminacion_escalera_4_hilos_(moderno).cad',
];

const load = (file: string): Schema =>
  importCad(readFileSync(resolve(process.cwd(), 'src/data/examples', file), 'latin1')).schema;

const FRAMES = 900;
const DT = 0.05;

/** Сценарий: каждую кнопку по очереди жмём на 0,25 с, выключатели щёлкаем; между ними — покой. */
function applyScript(schema: Schema, inputs: UserInputs, frame: number): void {
  const controlled = (control: string) => schema.elements.filter((element) =>
    getBehavior(element.typeCode).links.some((link) => link.control === control));
  const buttons = controlled('pressed');
  const toggles = controlled('toggled').filter((element) => !buttons.includes(element));
  const devices = [...buttons, ...toggles];
  if (devices.length === 0) return;
  const slot = Math.floor(frame / 50);
  const device = devices[slot % devices.length]!;
  const inSlot = frame % 50;
  if (buttons.includes(device)) inputs.pressed[device.id] = inSlot >= 10 && inSlot < 15;
  else if (inSlot === 10) inputs.toggled[device.id] = !inputs.toggled[device.id];
}

interface Run { memories: EngineMemory[]; results: EngineState[]; skipped: number }

/** Прогон кадр за кадром; `skip` — пропускать тихие кадры так же, как интерфейс (quiet-skip.ts). */
function run(schema: Schema, skip: boolean): Run {
  const inputs = createEmptyInputs();
  let memory = createEmptyMemory();
  let result = simulate({ schema, inputs, time: 0, memory });
  memory = result.memory;
  let evaluatedAt = 0;
  let quietInputs: UserInputs | undefined;
  const memories: EngineMemory[] = [];
  const results: EngineState[] = [];
  let skipped = 0;
  for (let frame = 1; frame <= FRAMES; frame += 1) {
    const time = frame * DT;
    applyScript(schema, inputs, frame);
    if (skip && quietInputs && jsonEqual(quietInputs, inputs)) {
      memory = advanceQuietMemory(memory, time);
      skipped += 1;
    } else {
      const before = memory;
      result = simulate({ schema, inputs, time, memory });
      memory = result.memory;
      const quiet = isQuietFrame(before, memory, evaluatedAt, time);
      quietInputs = quiet ? structuredClone(inputs) : undefined;
    }
    evaluatedAt = time;
    memories.push(memory);
    results.push(result);
  }
  return { memories, results, skipped };
}

/** Результат кадра без памяти и времени: то, что видно на схеме. */
const visible = (state: EngineState): unknown => ({ ...state, time: 0, memory: undefined });

describe('пропуск тихих кадров', () => {
  it.each(EXAMPLES)('не меняет поведение: %s', (file) => {
    const schema = load(file);
    const full = run(schema, false);
    const quiet = run(schema, true);
    for (let frame = 0; frame < FRAMES; frame += 1) {
      expect(quiet.memories[frame], `память, кадр ${frame + 1}`).toEqual(full.memories[frame]);
      expect(visible(quiet.results[frame]!), `схема, кадр ${frame + 1}`).toEqual(visible(full.results[frame]!));
    }
  });

  it('в покое действительно не считает кадры', () => {
    // Ejemplo 9: самоподхват и тепловое реле — между нажатиями схема стоит.
    const quiet = run(load('Ejemplos/Ejemplo 9.cad'), true);
    expect(quiet.skipped).toBeGreaterThan(FRAMES / 2);
  });

  it('идущий таймер не даёт пропускать кадры', () => {
    const memory = (timer: TimerState): EngineMemory => ({ latches: {}, prevCoils: {}, timers: { 1: timer } });
    const counting = memory({ phase: 'counting', elapsed: 0.5, lastTime: 1 });
    expect(isQuietFrame(counting, memory({ phase: 'counting', elapsed: 0.6, lastTime: 1.1 }), 1, 1.1)).toBe(false);
    const done = memory({ phase: 'done', elapsed: 2, lastTime: 1.1 });
    expect(isQuietFrame(memory({ phase: 'done', elapsed: 2, lastTime: 1 }), done, 1, 1.1)).toBe(true);
    // Кадр без шага времени (первый после запуска или паузы) ничего не доказывает.
    expect(isQuietFrame(done, done, 1.1, 1.1)).toBe(false);
  });
});
