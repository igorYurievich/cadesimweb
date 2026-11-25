/**
 * Кэш графа цепей. Сети зависят только от геометрии: проводов и положения клемм. Строить их
 * заново на каждой итерации релейного цикла дорого (сравнение проводов попарно), поэтому граф
 * строится один раз на версию схемы и берётся из кэша, пока геометрия та же.
 */

import type { Schema } from '../model/types';
import { buildNets } from './graph';
import type { NetsResult } from './graph';

/** Несколько последних схем: вкладки, проверка КЗ по копиям входов, тесты. */
const CACHE_SIZE = 8;

interface CacheEntry {
  key: Float64Array;
  nets: NetsResult;
}

const cache: CacheEntry[] = [];

const WIRE_KIND_CODE: Readonly<Record<string, number>> = { phase: 1, neutral: 2, protection: 3, junction: 4 };

/**
 * Снимок всего, что читает buildNets: порядок и коды элементов, координаты клемм, провода.
 * Сравнивается поэлементно, поэтому ложных совпадений нет (в отличие от хеша).
 */
export function topologyKey(schema: Schema): Float64Array {
  let size = 2 + schema.wires.length * 8;
  for (const element of schema.elements) size += 3 + element.terminals.length * 2;
  const key = new Float64Array(size);
  let at = 0;
  key[at++] = schema.elements.length;
  for (const element of schema.elements) {
    key[at++] = element.id;
    key[at++] = element.typeCode;
    key[at++] = element.terminals.length;
    for (const terminal of element.terminals) {
      key[at++] = element.position.x + terminal.offset.x;
      key[at++] = element.position.y + terminal.offset.y;
    }
  }
  key[at++] = schema.wires.length;
  for (const wire of schema.wires) {
    key[at++] = wire.id;
    key[at++] = wire.typeCode;
    key[at++] = WIRE_KIND_CODE[wire.kind] ?? 0;
    key[at++] = wire.from.x;
    key[at++] = wire.from.y;
    key[at++] = wire.to.x;
    key[at++] = wire.to.y;
    key[at++] = -1;
  }
  return key;
}

function sameKey(a: Float64Array, b: Float64Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Сети схемы из кэша или построенные заново. Результат общий для всех вызовов с той же
 * геометрией: его нельзя менять (движок и так только читает его, propagate копирует сети).
 */
export function cachedNets(schema: Schema): NetsResult {
  const key = topologyKey(schema);
  const index = cache.findIndex((entry) => sameKey(entry.key, key));
  if (index >= 0) {
    const [entry] = cache.splice(index, 1) as [CacheEntry];
    cache.unshift(entry);
    return entry.nets;
  }
  const nets = buildNets(schema);
  cache.unshift({ key, nets });
  if (cache.length > CACHE_SIZE) cache.length = CACHE_SIZE;
  return nets;
}
