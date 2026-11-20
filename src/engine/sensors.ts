/**
 * Датчики с собственным реле (фотоэлектрический барьер).
 *
 * Внутреннее реле датчика ведёт себя как катушка с именем датчика: включено, когда на выводах
 * питания 1-2 есть напряжение и датчик срабатывает. Поэтому его контакты и одноимённые
 * вспомогательные контакты переключаются тем же релейным циклом, что и контакты катушек.
 */

import { getCadType } from '../model/cad-types';
import { PHOTO_BARRIER_TYPE } from '../model/cad-types-sensors';
import { DETECTOR_CODES, EMITTER_TYPE, detectorSpec } from '../model/detector-types';
import type { SchemaElement } from '../model/types';
import type { BehaviorLink, TypeBehavior } from './behaviors';
import type { UserInputs } from './types';

/** Барьер: 0-1 питание электроники (L, N), 2 общий, 2-3 НЗ, 2-4 НО. */
export const PHOTO_BARRIER_LINKS: BehaviorLink[] = [
  { terminals: [0, 1], kind: 'load', control: 'always' },
  { terminals: [2, 3], kind: 'switch', control: 'coil-name', normallyClosed: true },
  { terminals: [2, 4], kind: 'switch', control: 'coil-name' },
];

/**
 * Детекторы: контакт срабатывает, пока датчик зажат в симуляции (`pressed`, как кнопка); NA замыкается, NC размыкается.
 * 2 провода: контакт 1-2. 3 провода: питание + − (нагрузка) и выход + → S. Излучатель — нагрузка 1-2 без контакта.
 */
function detectorBehavior(typeCode: number): TypeBehavior {
  const spec = detectorSpec(typeCode);
  const threeWire = spec?.wiring === '3' || spec?.wiring === '3-side';
  const contact: BehaviorLink = {
    terminals: [0, threeWire ? 2 : 1],
    kind: 'switch',
    control: 'pressed',
    normallyClosed: spec?.nc ?? false,
  };
  const supply: BehaviorLink[] = threeWire ? [{ terminals: [0, 1], kind: 'load', control: 'always' }] : [];
  return { typeCode, links: [...supply, contact] };
}

const detectorBehaviors = (): TypeBehavior[] => [
  ...DETECTOR_CODES.map(detectorBehavior),
  { typeCode: EMITTER_TYPE, links: [{ terminals: [0, 1], kind: 'load', control: 'always' }] },
];

/** Строки таблицы поведения для всей панели датчиков. */
export const SENSOR_BEHAVIORS: readonly TypeBehavior[] = [
  { typeCode: PHOTO_BARRIER_TYPE, links: PHOTO_BARRIER_LINKS },
  ...detectorBehaviors(),
];

/** Элемент управляет реле по своему имени: катушка или датчик со своим реле. */
export function drivesNamedRelay(element: SchemaElement): boolean {
  const family = getCadType(element.typeCode).family;
  return family === 'coil' || family === 'sensor';
}

/**
 * Условие срабатывания, кроме питания. У катушки его нет. Датчик срабатывает, пока пользователь
 * держит луч перекрытым — зажимает датчик мышью в симуляции (`pressed`, как кнопку); режим dark-on.
 */
export function relayTriggerActive(element: SchemaElement, inputs: UserInputs): boolean {
  if (getCadType(element.typeCode).family !== 'sensor') return true;
  return inputs.pressed[element.id] ?? false;
}
