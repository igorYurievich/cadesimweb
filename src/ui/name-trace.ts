/**
 * Лупа над элементом: подсвечивает все элементы с тем же именем (катушка -KM1, его главные
 * и вспомогательные контакты). Имена сравниваются без ведущего «-» и без учёта регистра,
 * поэтому «-KM1», «KM1» и «km1» — одно и то же. Элементы без имени не подсвечиваются.
 */

import type { Schema } from '@model/types';
import { SVG_NS } from './constants';

/** Ключ сравнения имени: без пробелов по краям, ведущих «-» и регистра. */
export function nameKey(name: string): string {
  return name.trim().replace(/^-+/, '').trim().toUpperCase();
}

/** Элементы с тем же именем, что у elementId (включая его самого); пусто, если имени нет. */
export function sameNameElements(schema: Schema, elementId: number): number[] {
  const start = schema.elements.find((element) => element.id === elementId);
  const key = start ? nameKey(start.name) : '';
  if (!key) return [];
  return schema.elements.filter((element) => nameKey(element.name) === key).map((element) => element.id);
}

/** Рамка вокруг каждого символа из ids (в системе координат символа, с его же transform). */
export function drawNameTrace(layer: SVGGElement, elementLayer: SVGGElement, ids: readonly number[]): void {
  for (const id of ids) {
    const symbol = elementLayer.querySelector<SVGGElement>(`[data-element-id="${id}"]`);
    if (!symbol) continue;
    let box: DOMRect;
    try { box = symbol.getBBox(); } catch { continue; }
    if (box.width <= 0 && box.height <= 0) continue;
    const pad = 1.5;
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', String(box.x - pad)); rect.setAttribute('y', String(box.y - pad));
    rect.setAttribute('width', String(box.width + pad * 2)); rect.setAttribute('height', String(box.height + pad * 2));
    rect.setAttribute('rx', '1.5');
    rect.setAttribute('class', 'name-trace-box');
    rect.setAttribute('vector-effect', 'non-scaling-stroke');
    const transform = symbol.getAttribute('transform');
    if (transform) rect.setAttribute('transform', transform);
    layer.append(rect);
  }
}
