/** Строки таблицы поведения, вынесенные из behaviors.ts по панелям: датчики, символы 2D, LOGO и Ladder,
 * автомат лестничного освещения, S7-1200, механизмы, электронные реле. */

import type { TypeBehavior } from './behaviors';
import { REALISTIC_2D_BEHAVIORS } from './realistic-2d';
import { SENSOR_BEHAVIORS } from './sensors';
import { PLC_BEHAVIORS } from './plc';
import { STAIR_TIMER_BEHAVIORS } from './stair-timer';
import { S7_BEHAVIORS } from './s7-1200';
import { MECHANISM_BEHAVIORS } from './mechanisms';
import { GRAFCET_BEHAVIORS } from './grafcet';
import { ELECTRONIC_RELAY_BEHAVIORS } from './electronic-relays';
import { LIFT_TYPE } from '../model/lift';

export const PANEL_BEHAVIORS: readonly TypeBehavior[] = [
  ...SENSOR_BEHAVIORS, ...REALISTIC_2D_BEHAVIORS, ...PLC_BEHAVIORS, ...STAIR_TIMER_BEHAVIORS, ...S7_BEHAVIORS,
  ...MECHANISM_BEHAVIORS, ...GRAFCET_BEHAVIORS, ...ELECTRONIC_RELAY_BEHAVIORS,
  // Лифт (только веб): клемм нет, со схемой связан по именам встроенных элементов (lift.ts).
  { typeCode: LIFT_TYPE, links: [{ terminals: [], kind: 'none', control: 'always' }] },
];
