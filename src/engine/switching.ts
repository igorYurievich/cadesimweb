/** Расчёт внутренних контактов и замкнутых рёбер (этап 5.3b). */

import type { Schema, SchemaElement } from '../model/types';
import { getBehavior } from './behaviors';
import type { BehaviorLink } from './behaviors';
import type { TerminalRef, TimerState, UserInputs } from './types';
import { resolveThermalState } from './thermal';
import type { ThermalState } from './thermal';

export interface ClosedEdge {
  a: TerminalRef;
  b: TerminalRef;
  element: number;
}

export interface SwitchingResult {
  /** По id элемента: true, если у него замкнут хотя бы один внутренний контакт. */
  contacts: Record<number, boolean>;
  /** Каждая фактически замкнутая пара клемм, по одному ребру на полюс. */
  edges: ClosedEdge[];
  warnings: string[];
}

/** Контакты, которые срабатывают после выдержки таймера 9004 с тем же именем. */
export const ON_DELAY_CONTACT_TYPES: ReadonlySet<number> = new Set([7004, 7005, 7006, 7007]);

/**
 * Включено ли управление вспомогательного контакта: катушка с тем же именем, а для контактов с выдержкой
 * на включение — таймер 9004 с этим именем, закончивший отсчёт (если таймера нет, как у обычной катушки).
 */
export function auxContactActive(
  element: SchemaElement,
  schema: Schema,
  coils: Readonly<Record<string, boolean>>,
  timers: Readonly<Record<number, TimerState>>,
): boolean {
  if (ON_DELAY_CONTACT_TYPES.has(element.typeCode) && element.name !== '') {
    const timer = schema.elements.find((candidate) => candidate.typeCode === 9004 && candidate.name === element.name);
    if (timer) return timers[timer.id]?.phase === 'done';
  }
  return element.name !== '' && (coils[element.name] ?? false);
}

function controlActive(element: SchemaElement, link: BehaviorLink, inputs: UserInputs, coils: Readonly<Record<string, boolean>>, thermal: ThermalState, schema: Schema, timers: Readonly<Record<number, TimerState>>): boolean {
  switch (link.control) {
    case 'pressed': {
      if (inputs.pressed[element.id]) return true;
      // In a CAD drawing one physical pushbutton can be represented by several
      // contact symbols (for example S3 has a NO and an NC contact). They have
      // separate element IDs but share the device designation, so pressing any
      // one of them must actuate every pushbutton contact with that designation.
      const name = element.name.trim().toLocaleUpperCase();
      if (!name) return false;
      return schema.elements.some((candidate) => candidate.id !== element.id
        && candidate.name.trim().toLocaleUpperCase() === name
        && getBehavior(candidate.typeCode).links.some((candidateLink) => candidateLink.control === 'pressed')
        && Boolean(inputs.pressed[candidate.id]));
    }
    case 'toggled': return inputs.toggled[element.id] ?? link.defaultClosed ?? false;
    case 'coil-name': return auxContactActive(element, schema, coils, timers);
    case 'thermal': return (inputs.tripped[element.id] ?? false) || (element.name !== '' && thermal.trippedNames.has(element.name));
    case 'always': return true;
  }
}

function isClosed(element: SchemaElement, link: BehaviorLink, inputs: UserInputs, coils: Readonly<Record<string, boolean>>, thermal: ThermalState, schema: Schema, timers: Readonly<Record<number, TimerState>>): boolean {
  if (link.opensWhenTripped && (inputs.tripped[element.id] ?? false)) return false;
  const active = controlActive(element, link, inputs, coils, thermal, schema, timers);
  return link.normallyClosed ? !active : active;
}

/** Вычисляет замкнутые контакты; входные схема и состояния не изменяются. */
export function computeSwitching(
  schema: Schema,
  inputs: UserInputs,
  coils: Readonly<Record<string, boolean>> = {},
  thermal: ThermalState = resolveThermalState(schema, inputs),
  timers: Readonly<Record<number, TimerState>> = {},
): SwitchingResult {
  const contacts: Record<number, boolean> = {};
  const edges: ClosedEdge[] = [];
  const warnings: string[] = [];

  for (const element of schema.elements) {
    const behavior = getBehavior(element.typeCode);
    if (behavior.warning) {
      warnings.push(`unknown-type: элемент ${element.id}, код ${element.typeCode}`);
      continue;
    }
    let hasSwitch = false;
    let anyClosed = false;
    for (const link of behavior.links) {
      if (link.kind !== 'switch') continue;
      hasSwitch = true;
      const [a, b] = link.terminals;
      const ta = a === undefined ? undefined : element.terminals[a];
      const tb = b === undefined ? undefined : element.terminals[b];
      if (!ta || !tb) {
        warnings.push(`invalid-terminal-index: элемент ${element.id}, тип ${element.typeCode}, индексы ${link.terminals.join('-')}`);
        continue;
      }
      if (!isClosed(element, link, inputs, coils, thermal, schema, timers)) continue;
      anyClosed = true;
      edges.push({
        a: { element: element.id, index: a as number },
        b: { element: element.id, index: b as number },
        element: element.id,
      });
    }
    if (hasSwitch) contacts[element.id] = anyClosed;
  }

  return { contacts, edges, warnings };
}
