/** Построение сетей клемм и определение типа линии (этапы 5.2b–5.2c). */

import { terminalPosition } from '../model/geometry';
import type { Schema } from '../model/types';
import { buildWireLinks, pointOnSegment } from './wire-links';
import { UnionFind } from './union-find';
import type { NetState, TerminalKey, TerminalRef } from './types';
import { terminalKey } from './types';

export interface NetsResult {
  nets: NetState[];
  terminalNet: Record<TerminalKey, number>;
  /** Предупреждения о геометрии проводов и смешанных типах линии. */
  warnings: GraphWarning[];
}

export type GraphWarning =
  | ReturnType<typeof buildWireLinks>['warnings'][number]
  | { code: 'mixed-line-kinds'; net: number; kinds: string[]; message: string };

/**
 * Присоединяет клеммы к отрезкам, связывает совпадающие клеммы и создаёт
 * отдельную сеть для каждой клеммы без провода. NetId присваиваются по первому
 * появлению клемм в порядке schema.elements / terminals, независимо от UF-root.
 */
export function buildNets(schema: Schema): NetsResult {
  const links = buildWireLinks(schema.wires);
  const terminals: TerminalRef[] = [];
  const positions: { x: number; y: number }[] = [];
  for (const element of schema.elements) {
    if (element.typeCode === 20000) continue;
    element.terminals.forEach((_, index) => {
      const position = terminalPosition(element, index);
      if (!position) return;
      terminals.push({ element: element.id, index });
      positions.push(position);
    });
  }

  const groupIds = [...new Set(links.groupOf.values())].sort((a, b) => a - b);
  const groupNode = new Map(groupIds.map((id, i) => [id, terminals.length + i] as const));
  const uf = new UnionFind(terminals.length + groupIds.length);

  // Каждая клемма соединяет все группы отрезков, на которых она расположена.
  for (let ti = 0; ti < terminals.length; ti += 1) {
    const p = positions[ti] as { x: number; y: number };
    for (const wire of schema.wires) {
      if (!pointOnSegment(p, wire.from, wire.to)) continue;
      const group = links.groupOf.get(wire.id);
      const node = group === undefined ? undefined : groupNode.get(group);
      if (node !== undefined) uf.union(ti, node);
    }
  }

  // Совпавшие клеммы автосоединяются и могут объединить отдельные группы проводов.
  const firstAtPoint = new Map<string, number>();
  for (let ti = 0; ti < positions.length; ti += 1) {
    const p = positions[ti] as { x: number; y: number };
    const key = `${p.x},${p.y}`;
    const first = firstAtPoint.get(key);
    if (first === undefined) firstAtPoint.set(key, ti);
    else uf.union(first, ti);
  }

  const netByRoot = new Map<number, number>();
  const nets: NetState[] = [];
  const terminalNet: Record<TerminalKey, number> = {};
  for (let ti = 0; ti < terminals.length; ti += 1) {
    const root = uf.find(ti);
    let id = netByRoot.get(root);
    if (id === undefined) {
      id = nets.length;
      netByRoot.set(root, id);
      nets.push({ id, terminals: [], line: null, potentials: [] });
    }
    const ref = terminals[ti] as TerminalRef;
    (nets[id] as NetState).terminals.push(ref);
    terminalNet[terminalKey(ref.element, ref.index)] = id;
  }

  const lineKinds = new Map<number, Set<'phase' | 'neutral' | 'protection'>>();
  const kindForCode = (code: number): 'phase' | 'neutral' | 'protection' | undefined => {
    if (code === 4000) return 'phase';
    if (code === 4009) return 'neutral';
    if (code === 4010) return 'protection';
    return undefined; // 4001 — соединительная точка, не тип линии.
  };
  for (const wire of schema.wires) {
    const kind = kindForCode(wire.typeCode);
    if (!kind) continue;
    const group = links.groupOf.get(wire.id);
    const node = group === undefined ? undefined : groupNode.get(group);
    if (node === undefined) continue;
    const netId = netByRoot.get(uf.find(node));
    if (netId === undefined) continue; // У провода нет ни одной клеммы.
    let kinds = lineKinds.get(netId);
    if (!kinds) lineKinds.set(netId, (kinds = new Set()));
    kinds.add(kind);
  }

  const warnings: GraphWarning[] = [...links.warnings];
  for (const net of nets) {
    const kinds = [...(lineKinds.get(net.id) ?? [])].sort();
    if (kinds.length === 1) net.line = kinds[0] as 'phase' | 'neutral' | 'protection';
    else if (kinds.length > 1) {
      net.line = null;
      warnings.push({
        code: 'mixed-line-kinds',
        net: net.id,
        kinds,
        message: `mixed-line-kinds: сеть ${net.id} содержит разные типы проводов (${kinds.join(', ')})`,
      });
    }
  }

  return { nets, terminalNet, warnings };
}
