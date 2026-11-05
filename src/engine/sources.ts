/** Поиск источников питания в клеммных колодках (этап 5.4a). */

import type { Schema } from '../model/types';
import { getBehavior } from './behaviors';
import type { NetId, PotentialLabel, TerminalKey, TerminalRef } from './types';
import { terminalKey } from './types';

export interface PotentialSource {
  terminal: TerminalRef;
  net: NetId;
  potential: PotentialLabel;
}

export interface SourcesResult {
  sources: PotentialSource[];
  warnings: string[];
}

const DEFAULT_STRIP: readonly PotentialLabel[] = ['L1', 'L2', 'L3', 'N', 'PE'];
const ALLOWED = new Set<PotentialLabel>([...DEFAULT_STRIP, '+', '-']);

/** Ищет клеммы источника 3007; пустые метки получают значения по порядку. */
export function findSources(schema: Schema, terminalNet: Record<TerminalKey, NetId>): SourcesResult {
  const sources: PotentialSource[] = [];
  const warnings: string[] = [];
  for (const element of schema.elements) {
    const behavior = getBehavior(element.typeCode);
    for (const link of behavior.links) {
      if (link.kind !== 'source-strip') continue;
      for (const index of link.terminals) {
        if (index >= element.terminals.length) continue;
        const key = terminalKey(element.id, index);
        const net = terminalNet[key];
        if (net === undefined) {
          warnings.push(`source-terminal-unmapped: элемент ${element.id}, клемма ${index}`);
          continue;
        }
        // «L» у однофазной колодки (подпись CADe_SIMU) = фаза L1; «−» (U+2212) = минус.
        const raw = element.terminals[index]?.label.trim().toUpperCase() ?? '';
        const label = raw === 'L' ? 'L1' : raw === '\u2212' ? '-' : raw;
        const potential = (label === '' ? (link.potentials?.[index] ?? DEFAULT_STRIP[index]) : label) as PotentialLabel | undefined;
        if (!potential || !ALLOWED.has(potential)) {
          warnings.push(`unknown-source-label: элемент ${element.id}, клемма ${index}, метка "${label}"`);
          continue;
        }
        sources.push({ terminal: { element: element.id, index }, net, potential });
      }
    }
  }
  return { sources, warnings };
}
