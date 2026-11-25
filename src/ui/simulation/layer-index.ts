/**
 * Узлы слоя SVG по id. Раньше каждый провод и элемент искали querySelector по всему слою в
 * каждом кадре, то есть квадратично от размера схемы. Теперь найденный узел запоминается и
 * берётся из памяти, пока он на месте; после перерисовки схемы ищется заново.
 */

const caches = new WeakMap<ParentNode, Map<number, Element>>();

function stillValid(layer: ParentNode, node: Element, attribute: string, id: number): boolean {
  return node.isConnected === true && (layer as Node).contains(node) && node.getAttribute(attribute) === String(id);
}

/** То же, что layer.querySelector(`[attribute="id"]`), но без поиска по слою при каждом вызове. */
export function layerNode<T extends Element>(layer: ParentNode, attribute: string, id: number): T | null {
  let cache = caches.get(layer);
  if (!cache) caches.set(layer, (cache = new Map()));
  const cached = cache.get(id);
  if (cached && stillValid(layer, cached, attribute, id)) return cached as T;
  const node = layer.querySelector<T>(`[${attribute}="${id}"]`);
  if (node) cache.set(id, node);
  else cache.delete(id);
  return node;
}
