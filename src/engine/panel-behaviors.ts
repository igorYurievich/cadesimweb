/** Строки таблицы поведения, вынесенные из behaviors.ts по панелям: датчики, символы 2D, LOGO и Ladder,
 * автомат лестничного освещения, S7-1200, механизмы. */

import type { TypeBehavior } from './behaviors';
import { REALISTIC_2D_BEHAVIORS } from './realistic-2d';
import { SENSOR_BEHAVIORS } from './sensors';
import { PLC_BEHAVIORS } from './plc';
import { STAIR_TIMER_BEHAVIORS } from './stair-timer';
import { S7_BEHAVIORS } from './s7-1200';
import { MECHANISM_BEHAVIORS } from './mechanisms';

export const PANEL_BEHAVIORS: readonly TypeBehavior[] = [
  ...SENSOR_BEHAVIORS, ...REALISTIC_2D_BEHAVIORS, ...PLC_BEHAVIORS, ...STAIR_TIMER_BEHAVIORS, ...S7_BEHAVIORS,
  ...MECHANISM_BEHAVIORS,
];
