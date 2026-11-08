/** Распространение потенциалов по сетям и замкнутым контактам (этап 5.4a). */

import type { NetState, PotentialLabel, TerminalKey } from './types';
import { terminalKey } from './types';
import type { ClosedEdge, PotentialTransfer } from './switching';
import type { PotentialSource } from './sources';

const ORDER: readonly PotentialLabel[] = ['L1', 'L2', 'L3', 'N', 'PE', '+', '-'];

/** Возвращает копии сетей с потенциалами, разнесёнными поиском в ширину. */
export function propagatePotentials(
  nets: readonly NetState[],
  terminalNet: Record<TerminalKey, number>,
  sources: readonly PotentialSource[],
  edges: readonly ClosedEdge[],
  transfers: readonly PotentialTransfer[] = [],
): NetState[] {
  const result = nets.map((net) => ({ ...net, terminals: [...net.terminals], potentials: [] as PotentialLabel[] }));
  const byId = new Map(result.map((net) => [net.id, net] as const));
  const adjacency = new Map<number, Set<number>>();
  const transferAdjacency = new Map<number, Set<number>>();
  const connect = (a: number, b: number): void => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    if (!adjacency.has(b)) adjacency.set(b, new Set());
    (adjacency.get(a) as Set<number>).add(b);
    (adjacency.get(b) as Set<number>).add(a);
  };
  for (const edge of edges) {
    const a = terminalNet[terminalKey(edge.a.element, edge.a.index)];
    const b = terminalNet[terminalKey(edge.b.element, edge.b.index)];
    if (a !== undefined && b !== undefined) connect(a, b);
  }
  for (const transfer of transfers) {
    const from = terminalNet[terminalKey(transfer.from.element, transfer.from.index)];
    const to = terminalNet[terminalKey(transfer.to.element, transfer.to.index)];
    if (from === undefined || to === undefined || from === to) continue;
    if (!transferAdjacency.has(from)) transferAdjacency.set(from, new Set());
    transferAdjacency.get(from)?.add(to);
  }

  const queue: { net: number; potential: PotentialLabel }[] = [];
  const seen = new Set<string>();
  const enqueue = (net: number, potential: PotentialLabel): void => {
    const key = `${net}:${potential}`;
    if (seen.has(key) || !byId.has(net)) return;
    seen.add(key);
    queue.push({ net, potential });
  };
  for (const source of sources) enqueue(source.net, source.potential);

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const item = queue[cursor] as { net: number; potential: PotentialLabel };
    const net = byId.get(item.net);
    if (net && !net.potentials.includes(item.potential)) net.potentials.push(item.potential);
    for (const next of adjacency.get(item.net) ?? []) enqueue(next, item.potential);
    for (const next of transferAdjacency.get(item.net) ?? []) enqueue(next, item.potential);
  }

  for (const net of result) net.potentials.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
  return result;
}
