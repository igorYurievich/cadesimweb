/** Расчёт внутренних контактов и замкнутых рёбер (этап 5.3b). */

import type { Schema, SchemaElement } from '../model/types';
import { POSITION_SPECS, currentPosition, getBehavior, nextPosition } from './behaviors';
import type { BehaviorLink } from './behaviors';
import type { TerminalRef, TimerState, UserInputs } from './types';
import { resolveThermalState } from './thermal';
import { delayBlockActive } from './delay-blocks';
import { stairTimerActive } from './stair-timer';
import { STAIR_TIMER_2D } from '../model/stair-timer';
import { isDelayBlock2d } from '../model/realistic-2d-types';
import type { ThermalState } from './thermal';
import { logoOutputActive, plcEdgeActive } from './plc';
import { S7_1200 } from '../model/s7-1200';
import { s7OutputActive } from './s7-1200';
import { vfdRelayActive } from './vfd';
import { isVfdControl } from '../model/vfd';
import { isPhotoReceiver, receiverBeamBlocked } from './photo-beam';
import { buildNameIndex, normalizedName, sameNamed } from './name-index';
import type { NameIndex } from './name-index';

export interface ClosedEdge {
  a: TerminalRef;
  b: TerminalRef;
  element: number;
}

/** Направленная передача потенциала между клеммами (например, через обмотку). */
export interface PotentialTransfer {
  from: TerminalRef;
  to: TerminalRef;
  element: number;
}

export interface SwitchingResult {
  /** По id элемента: true, если у него замкнут хотя бы один внутренний контакт. */
  contacts: Record<number, boolean>;
  /** Каждая фактически замкнутая пара клемм, по одному ребру на полюс. */
  edges: ClosedEdge[];
  /** Передачи потенциала в указанном направлении, не соединяющие сети напрямую. */
  transfers: PotentialTransfer[];
  warnings: string[];
}

/** Контакты, которые срабатывают после выдержки таймера 9004 с тем же именем. */
export const ON_DELAY_CONTACT_TYPES: ReadonlySet<number> = new Set([7004, 7005, 7006, 7007]);
/** Контакты срабатывают после импульсного отсчёта таймера отключения 9005. */
export const OFF_DELAY_CONTACT_TYPES: ReadonlySet<number> = new Set([7008, 7009, 7010, 7011]);
/** Контакты 7012–7015 переключаются по таймеру 9006 с выдержкой при включении и отпускании. */
export const ON_OFF_DELAY_CONTACT_TYPES: ReadonlySet<number> = new Set([7012, 7013, 7014, 7015]);

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
  // Блоки с выдержкой 2D: отсчёт от своей катушки ведёт delay-blocks.ts.
  if (isDelayBlock2d(element.typeCode)) return delayBlockActive(element, timers);
  // Минутник: P–3 по отсчёту от кнопки на клемме 4 (stair-timer.ts).
  if (element.typeCode === STAIR_TIMER_2D) return stairTimerActive(element, timers);
  // Реле RA–RC преобразователя частоты (vfd.ts).
  if (isVfdControl(element.typeCode)) return vfdRelayActive(element, schema, timers);
  if (ON_DELAY_CONTACT_TYPES.has(element.typeCode) && element.name !== '') {
    const timer = schema.elements.find((candidate) => candidate.typeCode === 9004 && candidate.name === element.name);
    if (timer) {
      const phase = timers[timer.id]?.phase;
      return phase === 'done' || phase === 'releasing';
    }
  }
  if (OFF_DELAY_CONTACT_TYPES.has(element.typeCode) && element.name !== '') {
    const timer = schema.elements.find((candidate) => candidate.typeCode === 9005 && candidate.name === element.name);
    if (timer) return timers[timer.id]?.phase === 'done';
  }
  if (ON_OFF_DELAY_CONTACT_TYPES.has(element.typeCode) && element.name !== '') {
    const timer = schema.elements.find((candidate) => candidate.typeCode === 9006 && candidate.name === element.name);
    if (timer) {
      const phase = timers[timer.id]?.phase;
      return phase === 'done' || phase === 'releasing';
    }
  }
  return element.name !== '' && (coils[element.name] ?? false);
}

/**
 * Ручные кнопки без фиксации: Pulsador / грибки / концевики (8000…8007, 8012…8015) и «Botón pulsador» 8023 —
 * круглая кнопка без клемм, которая нажимает одноимённые кнопки схемы (как пульт).
 */
export const isMomentaryManual = (type: number): boolean =>
  (type >= 8000 && type <= 8007) || (type >= 8012 && type <= 8015) || type === 8023;

/** Сработало ли мгновенное вспомогательное реле от одноимённой кнопки/привода, а не от катушки. */
export function auxContactActuatorActive(
  element: SchemaElement,
  schema: Schema,
  inputs: UserInputs,
  names?: NameIndex,
): boolean {
  if (element.typeCode < 7000 || element.typeCode > 7003) return false;
  const name = normalizedName(element.name);
  if (!name) return false;
  // Без готового индекса (вызов из интерфейса для одного контакта) хватает одного прохода по схеме.
  const twins = names ? sameNamed(names, name) : schema.elements.filter((other) => normalizedName(other.name) === name);
  return twins.some((candidate) => {
    if (candidate.id === element.id) return false;
    const type = candidate.typeCode;
    const momentary = isMomentaryManual(type);
    const maintained = type >= 8008 && type <= 8011;
    return (momentary && Boolean(inputs.pressed[candidate.id]))
      || (maintained && Boolean(inputs.toggled[candidate.id]));
  });
}

function controlActive(
  element: SchemaElement,
  link: BehaviorLink,
  inputs: UserInputs,
  coils: Readonly<Record<string, boolean>>,
  thermal: ThermalState,
  schema: Schema,
  timers: Readonly<Record<number, TimerState>>,
  names: NameIndex,
): boolean {
  // Кандидаты только с тем же обозначением (name-index.ts), а не вся схема.
  const twins = sameNamed(names, normalizedName(element.name));
  const sameNameManualControl = (candidate: SchemaElement): boolean => {
    const type = candidate.typeCode;
    return candidate.id !== element.id
      && ((type >= 8000 && type <= 8015) || (type >= 8020 && type <= 8023));
  };
  const sameNameMomentaryPressed = (): boolean => twins.some((candidate) => sameNameManualControl(candidate)
    && isMomentaryManual(candidate.typeCode) && Boolean(inputs.pressed[candidate.id]));
  const sameNameMaintainedOn = (): boolean => twins.some((candidate) => sameNameManualControl(candidate)
    && candidate.typeCode >= 8008 && candidate.typeCode <= 8011
    && Boolean(inputs.toggled[candidate.id]));
  const sameNamePositionOn = (): boolean => twins.some((candidate) => {
    if (!sameNameManualControl(candidate)) return false;
    const spec = POSITION_SPECS[candidate.typeCode];
    return Boolean(spec && currentPosition(candidate.typeCode, inputs.positions?.[candidate.id]) !== spec.rest);
  });
  const sameNameLatchedOn = (): boolean => sameNameMaintainedOn() || sameNamePositionOn();
  switch (link.control) {
    case 'pressed': {
      // Приёмник фотобарьера: луч перекрыт кликом или привязанный излучатель не светит (photo-beam.ts).
      if (isPhotoReceiver(element.typeCode)) return receiverBeamBlocked(schema, element, inputs, coils);
      if (inputs.pressed[element.id]) return true;
      // Позиции с одинаковым обозначением работают как одно ручное устройство:
      // импульсная кнопка действует пока удерживается, фиксируемый выключатель — пока включён.
      return sameNameMomentaryPressed() || sameNameLatchedOn();
    }
    case 'toggled': {
      const maintainedManual = element.typeCode >= 8008 && element.typeCode <= 8011;
      return Boolean(inputs.toggled[element.id] ?? link.defaultClosed ?? false)
        || (maintainedManual && (sameNameMomentaryPressed() || sameNameLatchedOn()));
    }
    case 'coil-name': return auxContactActive(element, schema, coils, timers)
      || auxContactActuatorActive(element, schema, inputs, names);
    // thermal.tripped — ручной вход и тепловые реле, сработавшие кликом (resolveThermalState).
    case 'thermal': return (thermal.tripped[element.id] ?? false) || (element.name.trim() !== '' && thermal.trippedNames.has(element.name.trim().toLocaleUpperCase()));
    case 'position': {
      const spec = POSITION_SPECS[element.typeCode];
      let position = currentPosition(element.typeCode, inputs.positions?.[element.id]);
      if (spec && position === spec.rest && (sameNameMomentaryPressed() || sameNameLatchedOn())) {
        position = nextPosition(element.typeCode, spec.rest);
      }
      return position === link.position;
    }
    // Выход LOGO: операнд Qk и питание модуля (plc.ts).
    case 'plc-output': return element.typeCode === S7_1200
      ? s7OutputActive(element, link, coils) : logoOutputActive(element, link, coils, schema);
    case 'plc-edge': return plcEdgeActive(element, coils);
    case 'always': return true;
  }
}

function isClosed(
  element: SchemaElement,
  link: BehaviorLink,
  inputs: UserInputs,
  coils: Readonly<Record<string, boolean>>,
  thermal: ThermalState,
  schema: Schema,
  timers: Readonly<Record<number, TimerState>>,
  names: NameIndex,
): boolean {
  if (link.opensWhenTripped && (inputs.tripped[element.id] ?? false)) return false;
  const active = controlActive(element, link, inputs, coils, thermal, schema, timers, names);
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
  const transfers: PotentialTransfer[] = [];
  const warnings: string[] = [];
  const names = buildNameIndex(schema);

  for (const element of schema.elements) {
    const behavior = getBehavior(element.typeCode);
    if (behavior.warning) {
      warnings.push(`unknown-type: элемент ${element.id}, код ${element.typeCode}`);
      continue;
    }
    let hasSwitch = false;
    let anyClosed = false;
    for (const link of behavior.links) {
      if (link.kind === 'transfer') {
        const [from, to] = link.terminals;
        if (from === undefined || to === undefined || !element.terminals[from] || !element.terminals[to]) {
          warnings.push(`invalid-terminal-index: элемент ${element.id}, тип ${element.typeCode}, индексы ${link.terminals.join('-')}`);
          continue;
        }
        if (controlActive(element, link, inputs, coils, thermal, schema, timers, names)) {
          transfers.push({ from: { element: element.id, index: from }, to: { element: element.id, index: to }, element: element.id });
        }
        continue;
      }
      if (link.kind !== 'switch') continue;
      hasSwitch = true;
      const [a, b] = link.terminals;
      const ta = a === undefined ? undefined : element.terminals[a];
      const tb = b === undefined ? undefined : element.terminals[b];
      if (!ta || !tb) {
        warnings.push(`invalid-terminal-index: элемент ${element.id}, тип ${element.typeCode}, индексы ${link.terminals.join('-')}`);
        continue;
      }
      if (!isClosed(element, link, inputs, coils, thermal, schema, timers, names)) continue;
      anyClosed = true;
      edges.push({
        a: { element: element.id, index: a as number },
        b: { element: element.id, index: b as number },
        element: element.id,
      });
    }
    if (hasSwitch) contacts[element.id] = anyClosed;
  }

  return { contacts, edges, transfers, warnings };
}
