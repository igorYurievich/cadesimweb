/**
 * Индекс элементов по обозначению. Связи «по имени» (кнопка ↔ контакт, катушка ↔ контакт)
 * раньше искались перебором всей схемы для каждого контакта, то есть квадратично от размера.
 */

import type { Schema, SchemaElement } from '../model/types';

/** Обозначение без пробелов по краям и без учёта регистра: так сравнивают ручные устройства. */
export const normalizedName = (name: string): string => name.trim().toLocaleUpperCase();

export interface NameIndex {
  /** Элементы с непустым нормализованным именем, в порядке схемы. */
  readonly byName: ReadonlyMap<string, readonly SchemaElement[]>;
}

const NONE: readonly SchemaElement[] = [];

export function buildNameIndex(schema: Schema): NameIndex {
  const byName = new Map<string, SchemaElement[]>();
  for (const element of schema.elements) {
    const name = normalizedName(element.name);
    if (name === '') continue;
    const list = byName.get(name);
    if (list) list.push(element);
    else byName.set(name, [element]);
  }
  return { byName };
}

/** Все элементы с тем же нормализованным именем (пустое имя ни с чем не совпадает). */
export function sameNamed(index: NameIndex, name: string): readonly SchemaElement[] {
  return name === '' ? NONE : index.byName.get(name) ?? NONE;
}
