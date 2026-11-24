/**
 * Фотобарьер из двух частей: излучатель (EMITTER_TYPE) и приёмник (детектор kind 'receiver').
 *
 * Приёмник привязывается к излучателю в свойствах (params.emitter — имя излучателя, например «-B1»).
 * Луч доходит до приёмника, только пока излучатель запитан (напряжение на 1-2). Приёмник срабатывает
 * (NA замыкается, NC размыкается), когда луч перекрыт: пользователь зажал приёмник в симуляции ИЛИ
 * привязанный излучатель не светит. Приёмник без привязки работает как раньше — только от клика.
 *
 * Состояние излучателя — псевдокатушка «@EMIT<id>» релейного цикла (как сигналы преобразователя, vfd.ts),
 * поэтому цепь, где излучатель питается через контакт самого приёмника, устанавливается тем же циклом.
 */

import { EMITTER_TYPE, detectorSpec } from '../model/detector-types';
import type { Schema, SchemaElement } from '../model/types';
import { isEnergized } from './loads';
import type { NetState, UserInputs } from './types';
import { terminalKey } from './types';

export const emitterKey = (emitter: Pick<SchemaElement, 'id'>): string => `@EMIT${emitter.id}`;

export const isPhotoReceiver = (typeCode: number): boolean => detectorSpec(typeCode)?.kind === 'receiver';

/** Псевдокатушки всех излучателей схемы (relay-loop.ts). */
export function photoEmitterKeys(schema: Schema): string[] {
  return schema.elements.filter((element) => element.typeCode === EMITTER_TYPE).map(emitterKey);
}

/** Имя излучателя, к которому привязан приёмник ('' — не привязан). */
export function receiverEmitterName(receiver: SchemaElement): string {
  return typeof receiver.params.emitter === 'string' ? receiver.params.emitter.trim() : '';
}

/** Излучатель, привязанный к приёмнику (по имени, без учёта регистра). */
export function linkedEmitter(schema: Schema, receiver: SchemaElement): SchemaElement | undefined {
  const name = receiverEmitterName(receiver).toLocaleUpperCase();
  if (!name) return undefined;
  return schema.elements.find((element) => element.typeCode === EMITTER_TYPE && element.name.trim().toLocaleUpperCase() === name);
}

/**
 * Луч перекрыт: приёмник зажат пользователем или привязанный излучатель не светит
 * (не запитан, удалён или переименован — луча нет).
 */
export function receiverBeamBlocked(
  schema: Schema, receiver: SchemaElement, inputs: UserInputs, coils: Readonly<Record<string, boolean>>,
): boolean {
  if (inputs.pressed[receiver.id]) return true;
  if (!receiverEmitterName(receiver)) return false;
  const emitter = linkedEmitter(schema, receiver);
  return !emitter || !(coils[emitterKey(emitter)] ?? false);
}

/** Излучатель светит, пока на его выводах 1-2 есть напряжение (relay-pass.ts). */
export function applyEmitterSupply(
  schema: Schema,
  terminalNet: Readonly<Record<string, number>>,
  nets: ReadonlyMap<number, NetState>,
  nextCoils: Record<string, boolean>,
): void {
  for (const emitter of schema.elements) {
    if (emitter.typeCode !== EMITTER_TYPE) continue;
    const aId = terminalNet[terminalKey(emitter.id, 0)];
    const bId = terminalNet[terminalKey(emitter.id, 1)];
    const a = aId === undefined ? undefined : nets.get(aId);
    const b = bId === undefined ? undefined : nets.get(bId);
    nextCoils[emitterKey(emitter)] = Boolean(a && b && isEnergized(a, b).energized);
  }
}
