import { terminalKey } from '@engine/types';
import type { TerminalKey } from '@engine/types';
import { buildWireLinks, pointOnSegment } from '@engine/wire-links';
import { terminalPosition } from '@model/geometry';
import type { AppContext } from '../context';
import type { SimulationState } from './types';

export function rebuildWireTerminalMap(ctx: AppContext, state: SimulationState): void {
  const links = buildWireLinks(ctx.schema.wires);
  state.wireGroupOf = links.groupOf;
  state.wireTerminalKeys = new Map();
  for (const group of links.groupOf.values()) {
    if (!state.wireTerminalKeys.has(group)) state.wireTerminalKeys.set(group, new Set<TerminalKey>());
  }
  for (const element of ctx.schema.elements) {
    element.terminals.forEach((_, index) => {
      const point = terminalPosition(element, index);
      if (!point) return;
      const key = terminalKey(element.id, index);
      for (const wire of ctx.schema.wires) {
        if (!pointOnSegment(point, wire.from, wire.to)) continue;
        const group = links.groupOf.get(wire.id);
        if (group !== undefined) state.wireTerminalKeys.get(group)?.add(key);
      }
    });
  }
}
