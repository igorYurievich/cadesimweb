/** Небольшой сценарный помощник для проверки реальных схем `.cad` движком. */

import { createEmptyInputs, createEmptyMemory, simulate } from '../src/engine';
import type { EngineState, UserInputs } from '../src/engine';
import { importCad } from '../src/model/cad-import';
import type { ImportResult } from '../src/model/cad-import';
import type { ElementId, Schema, SchemaElement } from '../src/model/types';

function normalizedName(name: string): string {
  return name.trim().toLocaleUpperCase().replace(/^-/, '');
}

export class CadScenario {
  readonly imported: ImportResult;
  readonly schema: Schema;
  time = 0;
  inputs: UserInputs = createEmptyInputs();
  state: EngineState;
  private memory = createEmptyMemory();

  constructor(cadText: string) {
    this.imported = importCad(cadText);
    this.schema = this.imported.schema;
    this.state = this.recalculate();
  }

  findElement(name: string, typeCode?: number): SchemaElement {
    const target = normalizedName(name);
    const matches = this.schema.elements.filter((element) => normalizedName(element.name) === target
      && (typeCode === undefined || element.typeCode === typeCode));
    if (matches.length !== 1) {
      throw new Error(matches.length === 0
        ? `Элемент «${name}» не найден${typeCode === undefined ? '' : ` (тип ${typeCode})`}`
        : `Имя «${name}» неоднозначно: ${matches.map((element) => `${element.id}:${element.typeCode}`).join(', ')}`);
    }
    return matches[0] as SchemaElement;
  }

  setButton(name: string, pressed: boolean): EngineState {
    const element = this.findElement(name);
    if (![8000, 8001, 8005, 8013, 8014].includes(element.typeCode)) {
      throw new Error(`Элемент «${name}» не является поддерживаемой кнопкой`);
    }
    this.inputs.pressed[element.id] = pressed;
    return this.recalculate();
  }

  press(name: string): EngineState {
    return this.setButton(name, true);
  }

  release(name: string): EngineState {
    return this.setButton(name, false);
  }

  trip(name: string, tripped = true): EngineState {
    const element = this.findElement(name, 6007);
    this.inputs.tripped[element.id] = tripped;
    return this.recalculate();
  }

  advance(seconds: number): EngineState {
    if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError('Время сценария должно быть конечным и неотрицательным');
    this.time += seconds;
    return this.recalculate();
  }

  recalculate(): EngineState {
    this.state = simulate({ schema: this.schema, inputs: this.inputs, time: this.time, memory: this.memory });
    this.memory = this.state.memory;
    return this.state;
  }

  elementId(name: string, typeCode?: number): ElementId {
    return this.findElement(name, typeCode).id;
  }
}
